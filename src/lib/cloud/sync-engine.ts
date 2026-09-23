import { CloudError } from './cloud-error';
import type { CloudFileStore, RemoteFile } from './drive-client';
import {
  newSnapshotId,
  openSnapshot,
  parseEnvelope,
  sealSnapshot,
  type CipherSuite,
} from './envelope';

/**
 * Keeps this phone's database and its encrypted copy in the Cloud in step.
 *
 * The whole database travels as one sealed snapshot. That keeps the model
 * simple and exact (every table, every future table, the schema version),
 * at the cost of record-level merging: when this phone and the Cloud have
 * *both* changed since they last agreed, the engine doesn't guess — it
 * reports a conflict and the person picks which copy wins.
 *
 * "Changed" is decided by SHA-256: this phone has changed when the hash of
 * its database differs from the hash recorded at the last sync; the Cloud
 * has changed when its snapshot id differs from the one this phone last saw.
 */

export interface SnapshotStore {
  exportSnapshot(): Promise<{ bytes: Uint8Array; schemaVersion: number }>;
  /** Replaces the local database with `bytes` (validating and migrating it). */
  importSnapshot(bytes: Uint8Array): Promise<void>;
  /** Whether the local database holds anything the person created. */
  hasUserData(): Promise<boolean>;
}

export interface SyncState {
  fileId: string | null;
  /** Snapshot id of the Cloud copy this phone last uploaded or restored. */
  remoteSnapshotId: string | null;
  /** SHA-256 of the local database right after that sync. */
  localHash: string | null;
  lastSyncedAt: string | null;
}

export const EMPTY_SYNC_STATE: SyncState = {
  fileId: null,
  remoteSnapshotId: null,
  localHash: null,
  lastSyncedAt: null,
};

export interface SyncStateStore {
  load(): Promise<SyncState>;
  save(state: SyncState): Promise<void>;
}

/** Preferences that travel with the data (theme, name, …), kept out of the database. */
export interface PrefsBridge {
  read(): Record<string, unknown>;
  apply(prefs: Record<string, unknown>): void;
}

export interface RemoteSummary {
  savedAt: string | null;
  device: string | null;
}

export type SyncOutcome =
  | { kind: 'up-to-date' }
  | { kind: 'uploaded' }
  | { kind: 'restored' }
  | { kind: 'conflict'; remote: RemoteSummary; localHasData: boolean };

export interface SyncEngine {
  readonly fileName: string;
  /**
   * `prefer` settles a conflict: `local` overwrites the Cloud copy with this
   * phone's, `remote` replaces this phone's data with the Cloud copy.
   */
  sync(options?: { prefer?: 'local' | 'remote' }): Promise<SyncOutcome>;
  /** Whether a Cloud copy exists and which key sealed it — without downloading it. */
  inspectRemote(): Promise<{ exists: boolean; keyId: string | null; summary: RemoteSummary | null }>;
  /** Deletes the Cloud copy (used when starting over with a new key). */
  deleteRemote(): Promise<void>;
  loadState(): Promise<SyncState>;
}

export interface SyncEngineDeps {
  store: CloudFileStore;
  snapshots: SnapshotStore;
  state: SyncStateStore;
  suite: CipherSuite;
  key: Uint8Array;
  keyId: string;
  scope: string;
  device: string | null;
  prefs?: PrefsBridge;
  now?: () => Date;
}

export function cloudFileName(scope: string): string {
  return `clayhabit-${scope.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64)}.cloud.json`;
}

function summarize(remote: RemoteFile): RemoteSummary {
  return {
    savedAt: remote.appProperties.savedAt ?? remote.modifiedTime,
    device: remote.appProperties.device ?? null,
  };
}

export function createSyncEngine(deps: SyncEngineDeps): SyncEngine {
  const fileName = cloudFileName(deps.scope);
  const now = deps.now ?? (() => new Date());
  // One operation at a time: a background sync and "Sync now" must never interleave.
  let queue: Promise<unknown> = Promise.resolve();
  const exclusive = <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);
    return run;
  };

  async function upload(bytes: Uint8Array, hash: string, schemaVersion: number, remote: RemoteFile | null) {
    const state = await deps.state.load();
    const snapshotId = newSnapshotId(deps.suite);
    const savedAt = now();
    const envelope = await sealSnapshot(deps.suite, {
      bytes,
      prefs: deps.prefs?.read() ?? null,
      key: deps.key,
      keyId: deps.keyId,
      scope: deps.scope,
      snapshotId,
      device: deps.device,
      schemaVersion,
      sha256: hash,
      now: savedAt,
    });
    const saved = await deps.store.save({
      id: remote?.id ?? state.fileId,
      name: fileName,
      content: JSON.stringify(envelope),
      appProperties: {
        snapshotId,
        keyId: deps.keyId,
        sha256: hash,
        schema: String(schemaVersion),
        savedAt: savedAt.toISOString(),
        ...(deps.device ? { device: deps.device.slice(0, 60) } : {}),
      },
    });
    await deps.state.save({
      fileId: saved.id,
      remoteSnapshotId: snapshotId,
      localHash: hash,
      lastSyncedAt: savedAt.toISOString(),
    });
  }

  async function restore(remote: RemoteFile) {
    const envelope = parseEnvelope(await deps.store.download(remote.id));
    const contents = await openSnapshot(deps.suite, envelope, {
      key: deps.key,
      keyId: deps.keyId,
      scope: deps.scope,
    });
    await deps.snapshots.importSnapshot(contents.bytes);
    if (contents.prefs) deps.prefs?.apply(contents.prefs);

    // The baseline is what's on disk now (it may have been migrated), not the uploaded bytes.
    const after = await deps.snapshots.exportSnapshot();
    await deps.state.save({
      fileId: remote.id,
      remoteSnapshotId: remote.appProperties.snapshotId ?? envelope.snapshotId,
      localHash: await deps.suite.sha256Hex(after.bytes),
      lastSyncedAt: now().toISOString(),
    });
  }

  function assertOurKey(remote: RemoteFile) {
    const remoteKeyId = remote.appProperties.keyId;
    if (remoteKeyId && remoteKeyId !== deps.keyId) throw new CloudError('wrong-key');
  }

  async function sync({ prefer }: { prefer?: 'local' | 'remote' } = {}): Promise<SyncOutcome> {
    const state = await deps.state.load();
    const remote = await deps.store.find(fileName);
    const local = await deps.snapshots.exportSnapshot();
    const localHash = await deps.suite.sha256Hex(local.bytes);

    if (prefer === 'remote') {
      if (!remote) throw new CloudError('corrupt', 'no Cloud copy to restore');
      assertOurKey(remote);
      await restore(remote);
      return { kind: 'restored' };
    }
    if (prefer === 'local') {
      // An explicit choice may replace a copy sealed with an old key.
      await upload(local.bytes, localHash, local.schemaVersion, remote);
      return { kind: 'uploaded' };
    }

    if (!remote) {
      // First sync ever, or the Cloud copy was deleted (e.g. from Drive's settings): save this phone's.
      await upload(local.bytes, localHash, local.schemaVersion, null);
      return { kind: 'uploaded' };
    }

    assertOurKey(remote);
    const remoteChanged = (remote.appProperties.snapshotId ?? null) !== state.remoteSnapshotId;
    const localChanged = localHash !== state.localHash;

    if (!remoteChanged) {
      if (!localChanged) return { kind: 'up-to-date' };
      await upload(local.bytes, localHash, local.schemaVersion, remote);
      return { kind: 'uploaded' };
    }

    // The Cloud moved on. Take it, unless this phone has changes of its own to lose.
    const neverSynced = state.remoteSnapshotId === null;
    const localHasData = await deps.snapshots.hasUserData();
    if (neverSynced ? !localHasData : !localChanged) {
      await restore(remote);
      return { kind: 'restored' };
    }
    return { kind: 'conflict', remote: summarize(remote), localHasData };
  }

  return {
    fileName,
    sync: (options) => exclusive(() => sync(options)),
    inspectRemote: () =>
      exclusive(async () => {
        const remote = await deps.store.find(fileName);
        return remote
          ? { exists: true, keyId: remote.appProperties.keyId ?? null, summary: summarize(remote) }
          : { exists: false, keyId: null, summary: null };
      }),
    deleteRemote: () =>
      exclusive(async () => {
        const remote = await deps.store.find(fileName);
        if (remote) await deps.store.remove(remote.id);
        await deps.state.save(EMPTY_SYNC_STATE);
      }),
    loadState: () => deps.state.load(),
  };
}
