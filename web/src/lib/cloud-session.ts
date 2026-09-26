import { CloudError, cloudErrorMessage, toCloudError } from '@/lib/cloud/cloud-error';
import { createDriveStore, type CloudFileStore } from '@/lib/cloud/drive-client';
import { createSyncEngine, EMPTY_SYNC_STATE, type RemoteSummary, type SyncEngine, type SyncState } from '@/lib/cloud/sync-engine';
import { createWebCipherSuite } from '@/lib/cloud/web-cipher-suite';
import { fetchRemoteKeyring, saveRemoteKeyring, type RemoteKeyring } from '@/lib/vault/cloud-keyring';
import { createKeyring, openKeyring, rewrapKeyring, WrongPasscodeError, type DataKey } from '@/lib/vault/keyring';

import { connectDrive, forgetDriveToken, getDriveToken } from './google-drive';
import { createWebSnapshots } from './snapshots';
import { WebDatabase } from './web-database';

/**
 * Everything between "signed in" and "using the app", in the browser:
 *
 *   connect Drive → find the keyring → passcode (unlock or create) →
 *   restore the Cloud copy into an in-memory database → app, syncing.
 *
 * The data key, the database and the Drive token live in this object only:
 * a reload or a closed tab forgets all three, and the passcode is asked again.
 * The shared engine (src/lib/cloud/sync-engine.ts) does the syncing, exactly
 * as on the phone.
 */

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error' | 'conflict' | 'reconnect';

export type SessionPhase =
  | { name: 'connect'; error: string | null; busy: boolean }
  | { name: 'working'; message: string }
  | { name: 'unlock'; remote: RemoteKeyring; error: string | null; busy: boolean; waitUntil: number }
  | { name: 'create'; error: string | null; busy: boolean }
  | { name: 'choose'; remote: RemoteSummary; busy: boolean }
  | { name: 'ready' };

export interface SessionSnapshot {
  phase: SessionPhase;
  status: SyncStatus;
  error: string | null;
  lastSyncedAt: string | null;
  conflict: RemoteSummary | null;
  db: WebDatabase | null;
  /** Preferences from the phone (display name, currency…), kept as they are. */
  prefs: Record<string, unknown>;
  /** Goes up whenever a Cloud copy replaced the data, so every screen refetches. */
  revision: number;
}

/**
 * Quiet period after the last change, and the longest a change waits: an edit
 * reaches the Cloud within about a second, a burst of typing still goes up as one save.
 */
const DEBOUNCE_MS = 800;
const MAX_WAIT_MS = 3_000;
/** How often the open tab checks the Cloud for the phone's changes (one small metadata request). */
const PULL_INTERVAL_MS = 15_000;

/** Same schedule as the phone's PIN/passcode throttle: 5 free tries, then 30 s doubling to 15 min. */
const FREE_ATTEMPTS = 5;
function lockoutFor(failures: number): number {
  if (failures < FREE_ATTEMPTS) return 0;
  return Math.min(15 * 60_000, 30_000 * 2 ** (failures - FREE_ATTEMPTS));
}

const suite = createWebCipherSuite();

export class CloudSession {
  private snapshot: SessionSnapshot = {
    phase: { name: 'connect', error: null, busy: false },
    status: 'syncing',
    error: null,
    lastSyncedAt: null,
    conflict: null,
    db: null,
    prefs: {},
    revision: 0,
  };
  private readonly listeners = new Set<() => void>();
  private readonly store: CloudFileStore = createDriveStore(getDriveToken);
  private engine: SyncEngine | null = null;
  private dataKey: DataKey | null = null;
  private syncState: SyncState = EMPTY_SYNC_STATE;
  private debounce: ReturnType<typeof setTimeout> | null = null;
  private firstChangeAt: number | null = null;
  private syncing = false;
  private again = false;
  private unsaved = false;
  private disposed = false;
  private stopWatching: (() => void) | null = null;

  constructor(
    /** The account id (Clerk user id): names the Drive files, as on the phone. */
    readonly scope: string,
  ) {}

  // ---- store plumbing ----------------------------------------------------------------------------

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  private set(patch: Partial<SessionSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  private setPhase(phase: SessionPhase) {
    this.set({ phase });
  }

  /** Edits not in the Cloud yet: the browser holds them only in memory. */
  hasUnsavedChanges(): boolean {
    return this.unsaved || this.syncing;
  }

  // ---- 1. Drive ----------------------------------------------------------------------------------

  /** From the Connect button's click (Google's popup needs it). */
  async connect(): Promise<void> {
    this.setPhase({ name: 'connect', error: null, busy: true });
    try {
      await connectDrive();
      await this.afterConnected();
    } catch (caught) {
      const error = toCloudError(caught);
      this.setPhase({ name: 'connect', busy: false, error: error.code === 'cancelled' ? null : cloudErrorMessage(error) });
    }
  }

  private async afterConnected(): Promise<void> {
    if (this.snapshot.phase.name === 'ready' || this.dataKey) {
      // A reconnect after the token expired: carry on syncing.
      this.setPhase({ name: 'ready' });
      await this.runSync();
      return;
    }
    this.setPhase({ name: 'working', message: 'Looking for your Cloud…' });
    const remote = await fetchRemoteKeyring(this.store, this.scope);
    if (remote) this.setPhase({ name: 'unlock', remote, error: null, busy: false, waitUntil: this.lockedUntil() });
    else this.setPhase({ name: 'create', error: null, busy: false });
  }

  // ---- 2. Passcode --------------------------------------------------------------------------------

  private attemptsKey() {
    return `clayhabit.web.attempts.${this.scope}`;
  }

  private readAttempts(): { failures: number; lockedUntil: number } {
    try {
      const parsed = JSON.parse(localStorage.getItem(this.attemptsKey()) ?? 'null') as { failures: number; lockedUntil: number } | null;
      return parsed && typeof parsed.failures === 'number' ? parsed : { failures: 0, lockedUntil: 0 };
    } catch {
      return { failures: 0, lockedUntil: 0 };
    }
  }

  private lockedUntil(): number {
    return this.readAttempts().lockedUntil;
  }

  async unlock(passcode: string): Promise<void> {
    const phase = this.snapshot.phase;
    if (phase.name !== 'unlock') return;
    if (phase.waitUntil > Date.now()) return;
    this.setPhase({ ...phase, busy: true, error: null });
    try {
      const dataKey = await openKeyring(suite, phase.remote.keyring, passcode);
      try {
        localStorage.removeItem(this.attemptsKey());
      } catch {
        // Nothing stored.
      }
      await this.open(dataKey);
    } catch (caught) {
      if (caught instanceof WrongPasscodeError) {
        const failures = this.readAttempts().failures + 1;
        const waitUntil = Date.now() + lockoutFor(failures);
        try {
          localStorage.setItem(this.attemptsKey(), JSON.stringify({ failures, lockedUntil: waitUntil }));
        } catch {
          // Private mode: the wait still applies for this visit.
        }
        const waitMs = waitUntil - Date.now();
        this.setPhase({
          ...phase,
          busy: false,
          waitUntil,
          error: waitMs > 0 ? `Too many tries. Wait ${Math.ceil(waitMs / 1000)} seconds and try again.` : 'That passcode isn’t right.',
        });
      } else {
        this.setPhase({ ...phase, busy: false, error: cloudErrorMessage(caught) });
      }
    }
  }

  /** First time anywhere: a new key, locked with this passcode, and its keyring in Drive. */
  async create(passcode: string): Promise<void> {
    this.setPhase({ name: 'create', busy: true, error: null });
    try {
      const { keyring, dataKey } = await createKeyring(suite, passcode);
      await saveRemoteKeyring(this.store, this.scope, keyring);
      await this.open(dataKey);
    } catch (caught) {
      this.setPhase({ name: 'create', busy: false, error: caught instanceof Error && !(caught instanceof CloudError) ? caught.message : cloudErrorMessage(caught) });
    }
  }

  /** Checks the passcode against the keyring in Drive, then re-locks the same key with a new one. */
  async changePasscode(current: string, next: string): Promise<void> {
    if (!this.dataKey) throw new Error('Locked');
    const remote = await fetchRemoteKeyring(this.store, this.scope);
    if (!remote) throw new CloudError('corrupt', 'no keyring in Drive');
    await openKeyring(suite, remote.keyring, current);
    const keyring = await rewrapKeyring(suite, this.dataKey, next);
    await saveRemoteKeyring(this.store, this.scope, keyring, remote.fileId);
  }

  // ---- 3. Restore and open ------------------------------------------------------------------------

  private async open(dataKey: DataKey): Promise<void> {
    this.dataKey = dataKey;
    this.setPhase({ name: 'working', message: 'Bringing your data from the Cloud…' });
    const db = await WebDatabase.create();
    this.engine = createSyncEngine({
      store: this.store,
      snapshots: createWebSnapshots(db),
      state: {
        load: async () => this.syncState,
        save: async (state) => {
          this.syncState = state;
        },
      },
      suite,
      key: dataKey.key,
      keyId: dataKey.keyId,
      scope: this.scope,
      device: 'Web browser',
      // The web passes the phone's preferences through untouched, so a save from here never erases them.
      prefs: {
        read: () => this.snapshot.prefs,
        apply: (prefs) => this.set({ prefs }),
      },
    });

    try {
      const outcome = await this.engine.sync();
      if (outcome.kind === 'conflict') {
        // An empty web database never conflicts; kept for safety.
        this.set({ db });
        this.setPhase({ name: 'choose', remote: outcome.remote, busy: false });
        return;
      }
      this.set({ db, status: 'synced', error: null, lastSyncedAt: this.syncState.lastSyncedAt });
      this.watch(db);
      this.setPhase({ name: 'ready' });
    } catch (caught) {
      db.close();
      this.engine = null;
      this.dataKey = null;
      this.setPhase({ name: 'connect', busy: false, error: cloudErrorMessage(caught) });
    }
  }

  async choose(prefer: 'local' | 'remote'): Promise<void> {
    const phase = this.snapshot.phase;
    if (phase.name !== 'choose' || !this.engine || !this.snapshot.db) return;
    this.setPhase({ ...phase, busy: true });
    await this.engine.sync({ prefer });
    this.set({ status: 'synced', lastSyncedAt: this.syncState.lastSyncedAt });
    this.watch(this.snapshot.db);
    this.setPhase({ name: 'ready' });
  }

  // ---- 4. Syncing -------------------------------------------------------------------------------

  private watch(db: WebDatabase) {
    this.stopWatching?.();
    this.stopWatching = db.onChange(() => this.schedule());
    const onHidden = () => {
      if (document.visibilityState === 'hidden' && this.unsaved) void this.syncNow();
    };
    const onFocus = () => {
      // Back to the tab: pick up what the phone saved meanwhile.
      if (document.visibilityState === 'visible') void this.runSync();
    };
    document.addEventListener('visibilitychange', onHidden);
    document.addEventListener('visibilitychange', onFocus);
    // While the tab is in front, keep pulling: the phone's edits show up here within seconds.
    const pull = setInterval(() => {
      if (document.visibilityState === 'visible' && !this.debounce && !this.syncing) void this.runSync();
    }, PULL_INTERVAL_MS);
    const stop = this.stopWatching;
    this.stopWatching = () => {
      stop();
      clearInterval(pull);
      document.removeEventListener('visibilitychange', onHidden);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }

  /**
   * Every edit lands here, including ones made while a save is already on its way:
   * those are sent right after it (`again`), never dropped.
   */
  private schedule() {
    this.unsaved = true;
    const now = Date.now();
    this.firstChangeAt ??= now;
    if (this.debounce) clearTimeout(this.debounce);
    const wait = Math.max(0, Math.min(DEBOUNCE_MS, this.firstChangeAt + MAX_WAIT_MS - now));
    this.debounce = setTimeout(() => void this.runSync(), wait);
  }

  syncNow(): Promise<void> {
    return this.runSync({ manual: true });
  }

  private async runSync(options: { manual?: boolean } = {}): Promise<void> {
    const engine = this.engine;
    if (!engine || this.disposed) return;
    if (this.snapshot.conflict && !options.manual) return;
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = null;
    this.firstChangeAt = null;
    if (this.syncing) {
      this.again = true;
      return;
    }
    this.syncing = true;
    const hadEdits = this.unsaved;
    this.unsaved = false;
    // A background check for the phone's changes doesn't flash "Saving…"; a save does.
    if (hadEdits || options.manual) this.set({ status: 'syncing' });
    let succeeded = false;
    try {
      const outcome = await engine.sync();
      if (outcome.kind === 'conflict') {
        this.unsaved ||= hadEdits;
        this.set({ status: 'conflict', conflict: outcome.remote });
        return;
      }
      this.set({
        status: 'synced',
        error: null,
        conflict: null,
        lastSyncedAt: this.syncState.lastSyncedAt,
        revision: this.snapshot.revision + (outcome.kind === 'restored' ? 1 : 0),
      });
      succeeded = true;
    } catch (caught) {
      this.unsaved ||= hadEdits;
      const error = toCloudError(caught);
      if (error.code === 'auth') {
        forgetDriveToken();
        this.set({ status: 'reconnect', error: 'Your Google Drive session ended. Reconnect to keep saving.' });
      } else {
        this.set({ status: error.code === 'offline' ? 'offline' : 'error', error: cloudErrorMessage(error) });
      }
    } finally {
      this.syncing = false;
      // Edits made during that save go up straight away. After a failed save they wait for the
      // next edit, the next check or "Sync now", so an outage never becomes a retry loop.
      const pending = this.again || this.unsaved;
      this.again = false;
      if (pending && succeeded) setTimeout(() => void this.runSync(), 0);
    }
  }

  /** From the Reconnect button's click, when Google's hour is up. */
  async reconnect(): Promise<void> {
    try {
      await connectDrive({ quiet: true });
      this.set({ status: 'syncing', error: null });
      await this.runSync({ manual: true });
    } catch (caught) {
      const error = toCloudError(caught);
      if (error.code !== 'cancelled') this.set({ error: cloudErrorMessage(error) });
    }
  }

  async resolveConflict(prefer: 'local' | 'remote'): Promise<void> {
    if (!this.engine) return;
    this.set({ status: 'syncing' });
    try {
      const outcome = await this.engine.sync({ prefer });
      this.unsaved = false;
      this.set({
        status: 'synced',
        conflict: null,
        error: null,
        lastSyncedAt: this.syncState.lastSyncedAt,
        revision: this.snapshot.revision + (outcome.kind === 'restored' ? 1 : 0),
      });
    } catch (caught) {
      this.set({ status: 'error', error: cloudErrorMessage(caught) });
    }
  }

  /** Saves what's left, then forgets the key, the data and the token. */
  async lock(): Promise<void> {
    if (this.unsaved && this.engine && !this.snapshot.conflict) {
      await Promise.race([this.runSync({ manual: true }), new Promise((resolve) => setTimeout(resolve, 6000))]);
    }
    this.dispose();
  }

  dispose() {
    this.disposed = true;
    if (this.debounce) clearTimeout(this.debounce);
    this.stopWatching?.();
    this.snapshot.db?.close();
    this.engine = null;
    this.dataKey = null;
    forgetDriveToken();
  }
}
