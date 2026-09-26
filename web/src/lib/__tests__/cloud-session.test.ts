// @vitest-environment happy-dom
import { act, createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as habitRepository from '@/data/repositories/habit-repository';
import * as taskRepository from '@/data/repositories/task-repository';
import type { CloudFileStore } from '@/lib/cloud/drive-client';
import { createSyncEngine, EMPTY_SYNC_STATE, type SyncState } from '@/lib/cloud/sync-engine';
import { nodeCipherSuite } from '@/lib/cloud/testing/node-cipher-suite';
import { fetchRemoteKeyring } from '@/lib/vault/cloud-keyring';
import { openKeyring } from '@/lib/vault/keyring';
import { todayIso } from '@/utils/date';

import { createWebSnapshots } from '../snapshots';
import { WebDatabase } from '../web-database';

/*
 * The web app's whole save path, end to end: the real CloudSession (passcode,
 * restore, change listener, debounce, sync engine) against an in-memory Drive,
 * with a "phone" engine on the other side. Only Google's sign-in is faked.
 */

const drive = vi.hoisted(() => {
  const files = new Map<string, { id: string; name: string; content: string; appProperties: Record<string, string>; modifiedTime: string; size: number }>();
  let next = 1;
  let saves = 0;
  const store = {
    async find(name: string) {
      return [...files.values()].find((file) => file.name === name) ?? null;
    },
    async download(id: string) {
      return files.get(id)!.content;
    },
    async save({ id, name, content, appProperties }: { id: string | null; name: string; content: string; appProperties: Record<string, string> }) {
      saves++;
      const fileId = id ?? `file-${next++}`;
      const file = { id: fileId, name, content, appProperties, modifiedTime: new Date().toISOString(), size: content.length };
      files.set(fileId, file);
      return file;
    },
    async remove(id: string) {
      files.delete(id);
    },
  };
  return { files, store, saves: () => saves };
});

vi.mock('@/lib/cloud/drive-client', () => ({ createDriveStore: () => drive.store }));
vi.mock('../google-drive', () => ({
  connectDrive: async () => {},
  getDriveToken: async () => 'token',
  forgetDriveToken: () => {},
}));

import { useAccountSession } from '../../pages/app/session-context';
import { CloudSession } from '../cloud-session';

const SCOPE = 'user_test';
const PASSCODE = 'clay habit 2026';

function memoryState() {
  let state: SyncState = EMPTY_SYNC_STATE;
  return { load: async () => state, save: async (next: SyncState) => void (state = next) };
}

/** Waits until `check` passes, like a person watching the screen. */
async function eventually(check: () => Promise<boolean> | boolean, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('timed out');
}

async function readyWebSession() {
  const session = new CloudSession(SCOPE);
  await session.connect();
  expect(session.getSnapshot().phase.name).toBe('create');
  await session.create(PASSCODE);
  expect(session.getSnapshot().phase.name).toBe('ready');
  return session;
}

/** A phone reading the same Drive with the key the web created. */
async function phone() {
  const remote = await fetchRemoteKeyring(drive.store as unknown as CloudFileStore, SCOPE);
  const key = await openKeyring(nodeCipherSuite, remote!.keyring, PASSCODE);
  const db = await WebDatabase.create();
  const engine = createSyncEngine({
    store: drive.store as unknown as CloudFileStore,
    snapshots: createWebSnapshots(db),
    state: memoryState(),
    suite: nodeCipherSuite,
    key: key.key,
    keyId: key.keyId,
    scope: SCOPE,
    device: 'Pixel',
  });
  return { db, engine };
}

// React's act() warns unless the environment says it's a test.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('web autosave', () => {
  beforeEach(() => {
    drive.files.clear();
  });
  let session: CloudSession | null = null;
  afterEach(() => {
    session?.dispose();
    session = null;
  });

  it('saves a new task to the Cloud by itself, and the phone gets it', async () => {
    session = await readyWebSession();
    const db = session.getSnapshot().db!;
    const savesBefore = drive.saves();

    await taskRepository.create(db, { title: 'Made on the web', dueDate: todayIso() });
    await eventually(() => drive.saves() > savesBefore);

    const { db: phoneDb, engine } = await phone();
    expect((await engine.sync()).kind).toBe('restored');
    expect((await taskRepository.listAll(phoneDb)).map((task) => task.title)).toContain('Made on the web');
  }, 30_000);

  it('saves every edit in a quick burst, including ones made while a save is running', async () => {
    session = await readyWebSession();
    const db = session.getSnapshot().db!;

    const titles: string[] = [];
    for (let i = 0; i < 5; i++) {
      titles.push(`Task ${i}`);
      await taskRepository.create(db, { title: `Task ${i}` });
      await new Promise((resolve) => setTimeout(resolve, 300 + i * 200));
    }
    await eventually(() => !session!.hasUnsavedChanges());

    const { db: phoneDb, engine } = await phone();
    await engine.sync();
    const onPhone = (await taskRepository.listAll(phoneDb)).map((task) => task.title);
    for (const title of titles) expect(onPhone).toContain(title);
  }, 30_000);

  it('keeps saving when React (dev mode) mounts the page twice', async () => {
    // StrictMode mounts, unmounts and mounts again. The session the page ends up with must be live:
    // a session disposed by that first unmount unlocks fine but never saves (the bug users saw).
    let latest: CloudSession | null = null;
    function Probe() {
      latest = useAccountSession(SCOPE);
      return null;
    }
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(StrictMode, null, createElement(Probe)));
    });
    expect(latest).not.toBeNull();
    session = latest!;
    await session.connect();
    await session.create(PASSCODE);
    const db = session.getSnapshot().db!;
    const savesBefore = drive.saves();
    await taskRepository.create(db, { title: 'After a double mount' });
    await eventually(() => drive.saves() > savesBefore);
    await act(async () => root.unmount());
    session = null;
  }, 30_000);

  it('saves habit check-ins and completing a task', async () => {
    session = await readyWebSession();
    const db = session.getSnapshot().db!;
    const habit = await habitRepository.create(db, { name: 'Read', emoji: '📚', icon: 'line:book', color: 'blue' });
    const task = await taskRepository.create(db, { title: 'Finish it' });
    await eventually(() => !session!.hasUnsavedChanges());

    await habitRepository.setCount(db, habit.id, todayIso(), 1);
    await taskRepository.setCompleted(db, task.id, true);
    await eventually(() => !session!.hasUnsavedChanges());

    const { db: phoneDb, engine } = await phone();
    await engine.sync();
    const phoneHabit = (await habitRepository.listActiveWithLogs(phoneDb)).find((item) => item.id === habit.id);
    expect(phoneHabit?.logs[todayIso()]).toBe(1);
    expect((await taskRepository.listAll(phoneDb)).find((item) => item.id === task.id)?.isCompleted).toBe(true);
  }, 30_000);
});
