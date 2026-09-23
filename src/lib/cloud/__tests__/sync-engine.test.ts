import type { CloudFileStore, RemoteFile } from '../drive-client';
import { utf8Decode, utf8Encode } from '../encoding';
import { keyIdFor } from '../envelope';
import {
  createSyncEngine,
  EMPTY_SYNC_STATE,
  type PrefsBridge,
  type SnapshotStore,
  type SyncState,
  type SyncStateStore,
} from '../sync-engine';
import { nodeCipherSuite as suite } from '../testing/node-cipher-suite';

/** Drive's app folder, in memory. */
function fakeDrive() {
  const files = new Map<string, RemoteFile & { name: string; content: string }>();
  let next = 1;
  const store: CloudFileStore = {
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
  return { store, files };
}

/** A phone: its "database" is a string, plus its sync bookkeeping. */
function fakePhone(initial = '') {
  let data = initial;
  let state: SyncState = EMPTY_SYNC_STATE;
  const prefsSeen: Record<string, unknown>[] = [];
  const snapshots: SnapshotStore = {
    async exportSnapshot() {
      return { bytes: utf8Encode(data), schemaVersion: 11 };
    },
    async importSnapshot(bytes) {
      data = utf8Decode(bytes);
    },
    async hasUserData() {
      return data.length > 0;
    },
  };
  const stateStore: SyncStateStore = {
    load: async () => state,
    save: async (next) => {
      state = next;
    },
  };
  const prefs: PrefsBridge = {
    read: () => ({ theme: 'dark' }),
    apply: (value) => prefsSeen.push(value),
  };
  return {
    snapshots,
    stateStore,
    prefs,
    prefsSeen,
    get data() {
      return data;
    },
    set data(value: string) {
      data = value;
    },
    get state() {
      return state;
    },
  };
}

async function engineFor(phone: ReturnType<typeof fakePhone>, store: CloudFileStore, key: Uint8Array, device = 'Phone') {
  return createSyncEngine({
    store,
    snapshots: phone.snapshots,
    state: phone.stateStore,
    suite,
    key,
    keyId: await keyIdFor(suite, key),
    scope: 'user_1',
    device,
    prefs: phone.prefs,
  });
}

describe('sync engine', () => {
  const key = suite.randomBytes(32);

  it('uploads on first connect when the Cloud is empty, then stays up to date', async () => {
    const drive = fakeDrive();
    const phone = fakePhone('tasks: buy milk');
    const engine = await engineFor(phone, drive.store, key);

    expect(await engine.sync()).toEqual({ kind: 'uploaded' });
    expect(drive.files.size).toBe(1);
    const [file] = [...drive.files.values()];
    expect(file.name).toBe('clayhabit-user_1.cloud.json');
    expect(file.content).not.toContain('buy milk');

    expect(await engine.sync()).toEqual({ kind: 'up-to-date' });
  });

  it('uploads again only after something changed locally', async () => {
    const drive = fakeDrive();
    const phone = fakePhone('v1');
    const engine = await engineFor(phone, drive.store, key);
    await engine.sync();
    const firstSnapshot = phone.state.remoteSnapshotId;

    phone.data = 'v2';
    expect(await engine.sync()).toEqual({ kind: 'uploaded' });
    expect(phone.state.remoteSnapshotId).not.toBe(firstSnapshot);
    expect(drive.files.size).toBe(1);
  });

  it('restores everything on a new phone with nothing on it, preferences included', async () => {
    const drive = fakeDrive();
    const first = fakePhone('notes and money');
    await (await engineFor(first, drive.store, key)).sync();

    const second = fakePhone('');
    const outcome = await (await engineFor(second, drive.store, key, 'Tablet')).sync();

    expect(outcome).toEqual({ kind: 'restored' });
    expect(second.data).toBe('notes and money');
    expect(second.prefsSeen).toEqual([{ theme: 'dark' }]);
  });

  it("picks up another phone's changes when this one hasn't changed", async () => {
    const drive = fakeDrive();
    const a = fakePhone('shared');
    const b = fakePhone('');
    const engineA = await engineFor(a, drive.store, key, 'A');
    const engineB = await engineFor(b, drive.store, key, 'B');
    await engineA.sync();
    await engineB.sync();

    a.data = 'shared + edit on A';
    await engineA.sync();

    expect(await engineB.sync()).toEqual({ kind: 'restored' });
    expect(b.data).toBe('shared + edit on A');
    expect(await engineB.sync()).toEqual({ kind: 'up-to-date' });
  });

  it('asks instead of guessing when both sides changed', async () => {
    const drive = fakeDrive();
    const a = fakePhone('base');
    const b = fakePhone('');
    const engineA = await engineFor(a, drive.store, key, 'A');
    const engineB = await engineFor(b, drive.store, key, 'B');
    await engineA.sync();
    await engineB.sync();

    a.data = 'edited on A';
    await engineA.sync();
    b.data = 'edited on B';

    const outcome = await engineB.sync();
    expect(outcome).toMatchObject({ kind: 'conflict', localHasData: true, remote: { device: 'A' } });
    // Nothing was overwritten while asking.
    expect(b.data).toBe('edited on B');

    expect(await engineB.sync({ prefer: 'remote' })).toEqual({ kind: 'restored' });
    expect(b.data).toBe('edited on A');
  });

  it('lets the person keep this phone’s copy in a conflict', async () => {
    const drive = fakeDrive();
    const a = fakePhone('cloud copy');
    await (await engineFor(a, drive.store, key)).sync();

    const b = fakePhone('this phone had data before Cloud');
    const engineB = await engineFor(b, drive.store, key);
    expect((await engineB.sync()).kind).toBe('conflict');

    expect(await engineB.sync({ prefer: 'local' })).toEqual({ kind: 'uploaded' });
    const c = fakePhone('');
    await (await engineFor(c, drive.store, key)).sync();
    expect(c.data).toBe('this phone had data before Cloud');
  });

  it('refuses to overwrite or open a Cloud copy sealed with a different key', async () => {
    const drive = fakeDrive();
    await (await engineFor(fakePhone('x'), drive.store, key)).sync();

    const stranger = fakePhone('');
    const engine = await engineFor(stranger, drive.store, suite.randomBytes(32));
    await expect(engine.sync()).rejects.toMatchObject({ code: 'wrong-key' });
    expect(stranger.data).toBe('');
    expect((await engine.inspectRemote()).exists).toBe(true);
  });

  it('re-uploads if the Cloud copy disappears, and can delete it on request', async () => {
    const drive = fakeDrive();
    const phone = fakePhone('keep me');
    const engine = await engineFor(phone, drive.store, key);
    await engine.sync();

    drive.files.clear();
    expect(await engine.sync()).toEqual({ kind: 'uploaded' });

    await engine.deleteRemote();
    expect(drive.files.size).toBe(0);
    expect(phone.state).toEqual(EMPTY_SYNC_STATE);
  });

  it('runs one operation at a time', async () => {
    const drive = fakeDrive();
    const phone = fakePhone('data');
    const engine = await engineFor(phone, drive.store, key);
    const results = await Promise.all([engine.sync(), engine.sync(), engine.sync()]);
    expect(results.map((result) => result.kind)).toEqual(['uploaded', 'up-to-date', 'up-to-date']);
    expect(drive.files.size).toBe(1);
  });
});
