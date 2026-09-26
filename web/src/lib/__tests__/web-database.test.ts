import { describe, expect, it } from 'vitest';

import * as taskRepository from '@/data/repositories/task-repository';
import type { CloudFileStore, RemoteFile } from '@/lib/cloud/drive-client';
import { keyIdFor } from '@/lib/cloud/envelope';
import { createSyncEngine, EMPTY_SYNC_STATE, type SyncState } from '@/lib/cloud/sync-engine';
import { nodeCipherSuite } from '@/lib/cloud/testing/node-cipher-suite';
import { createWebCipherSuite } from '@/lib/cloud/web-cipher-suite';

import { createWebSnapshots } from '../snapshots';
import { WebDatabase } from '../web-database';

/** Drive's app folder, in memory. */
function fakeDrive(): CloudFileStore {
  const files = new Map<string, RemoteFile & { name: string; content: string }>();
  let next = 1;
  return {
    async find(name) {
      return [...files.values()].find((file) => file.name === name) ?? null;
    },
    async download(id) {
      return files.get(id)!.content;
    },
    async save({ id, name, content, appProperties }) {
      const fileId = id ?? `file-${next++}`;
      const file = { id: fileId, name, content, appProperties, modifiedTime: new Date().toISOString(), size: content.length };
      files.set(fileId, file);
      return file;
    },
    async remove(id) {
      files.delete(id);
    },
  };
}

function memoryState() {
  let state: SyncState = EMPTY_SYNC_STATE;
  return { load: async () => state, save: async (next: SyncState) => void (state = next) };
}

describe('WebDatabase', () => {
  it('runs the phone app migrations and repositories unchanged', async () => {
    const db = await WebDatabase.create();
    await taskRepository.create(db, { title: 'Water the plants' });
    const tasks = await taskRepository.listAll(db);
    expect(tasks.map((task) => task.title)).toContain('Water the plants');
    db.close();
  });

  it('round-trips through snapshot bytes', async () => {
    const source = await WebDatabase.create();
    await taskRepository.create(source, { title: 'Pay rent' });
    const copy = await WebDatabase.fromBytes(source.exportBytes());
    expect((await taskRepository.listAll(copy)).map((task) => task.title)).toEqual(['Pay rent']);
    source.close();
    copy.close();
  });

  it('notifies on writes, not on reads', async () => {
    const db = await WebDatabase.create();
    let changes = 0;
    db.onChange(() => changes++);
    await taskRepository.listAll(db);
    expect(changes).toBe(0);
    await taskRepository.create(db, { title: 'Stretch' });
    expect(changes).toBeGreaterThan(0);
    db.close();
  });

  it('does not report a Cloud copy arriving as an edit to send back', async () => {
    const source = await WebDatabase.create();
    await taskRepository.create(source, { title: 'From the phone' });
    const db = await WebDatabase.create();
    let changes = 0;
    db.onChange(() => changes++);
    db.replaceWith(source.exportBytes());
    expect(changes).toBe(0);
    // ...while an edit right after still is.
    await taskRepository.create(db, { title: 'From the web' });
    expect(changes).toBeGreaterThan(0);
    source.close();
    db.close();
  });
});

describe('phone ↔ web through the Cloud', () => {
  it('restores what the phone sealed, and seals what the phone can open', async () => {
    const drive = fakeDrive();
    const key = new Uint8Array(32).fill(7);
    const keyId = await keyIdFor(nodeCipherSuite, key);
    const scope = 'user_2abc';

    // "Phone": the Node cipher suite (same byte layout as expo-crypto) uploads a database.
    const phoneDb = await WebDatabase.create();
    await taskRepository.create(phoneDb, { title: 'From the phone' });
    const phone = createSyncEngine({
      store: drive,
      snapshots: createWebSnapshots(phoneDb),
      state: memoryState(),
      suite: nodeCipherSuite,
      key,
      keyId,
      scope,
      device: 'Pixel',
    });
    expect((await phone.sync()).kind).toBe('uploaded');

    // Web: WebCrypto, an empty in-memory database, restores it.
    const webDb = await WebDatabase.create();
    const web = createSyncEngine({
      store: drive,
      snapshots: createWebSnapshots(webDb),
      state: memoryState(),
      suite: createWebCipherSuite(),
      key,
      keyId,
      scope,
      device: 'Web browser',
    });
    expect((await web.sync()).kind).toBe('restored');
    expect((await taskRepository.listAll(webDb)).map((task) => task.title)).toEqual(['From the phone']);

    // An edit on the web goes up, and the phone picks it up.
    await taskRepository.create(webDb, { title: 'From the web' });
    expect((await web.sync()).kind).toBe('uploaded');
    expect((await phone.sync()).kind).toBe('restored');
    const titles = (await taskRepository.listAll(phoneDb)).map((task) => task.title).sort();
    expect(titles).toEqual(['From the phone', 'From the web']);
  });
});
