import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Device from 'expo-device';
import { addDatabaseChangeListener, useSQLiteContext } from 'expo-sqlite';
import { Alert, AppState } from 'react-native';

import { useAccount } from '@/features/auth/account-context';
import { useStorageModeRemote } from '@/lib/auth/clerk-storage-mode';
import { rescheduleNoteReminders } from '@/features/notes/services/note-reminders';
import { rescheduleAllReminders } from '@/features/tasks/hooks';
import { authEnabled } from '@/lib/auth/config';
import { useKeyEscrow } from '@/lib/cloud/clerk-escrow';
import { cloudErrorMessage, CloudError, toCloudError } from '@/lib/cloud/cloud-error';
import {
  cacheKey,
  createKeyRecord,
  forgetCachedKey,
  formatBackupKey,
  keyBytesOf,
  loadCachedKey,
  recordFromBackupKey,
  type KeyRecord,
} from '@/lib/cloud/cloud-key';
import { cloudConfigured } from '@/lib/cloud/config';
import { createDriveStore } from '@/lib/cloud/drive-client';
import { expoCipherSuite } from '@/lib/cloud/expo-cipher-suite';
import {
  connectInteractively,
  connectSilently,
  disconnectGoogle,
  getAccessToken,
  googleSignInAvailable,
  revokeDriveAccess,
  type GoogleAccount,
} from '@/lib/cloud/google-account';
import { createSqliteSnapshots } from '@/lib/cloud/sqlite-snapshots';
import { cloudFileName, createSyncEngine, type RemoteSummary, type SyncEngine } from '@/lib/cloud/sync-engine';
import { createSyncStateStore } from '@/lib/cloud/sync-state-store';
import { resolveStorageMode, saveLocalStorageMode, type StorageMode } from '@/lib/storage/storage-mode';
import { useSessionStore } from '@/store/session-store';
import { applySyncedSettings, pickSyncedSettings, useSettingsStore } from '@/store/settings-store';

import { CloudContext, localOnlyCloud, type CloudApi, type CloudStatus } from './cloud-context';
import {
  ChooseCopyScreen,
  CloudWorkingScreen,
  ConnectCloudScreen,
  RecoveryKeyScreen,
  WrongGoogleAccountScreen,
} from './cloud-screens';
import { StorageChoiceScreen } from './storage-choice-screen';

/** Quiet period after the last change before syncing, and the longest a change waits. */
const DEBOUNCE_MS = 8_000;
const MAX_WAIT_MS = 45_000;
const SIGN_OUT_SYNC_TIMEOUT_MS = 6_000;

type Phase =
  | { name: 'connecting' }
  | { name: 'connect'; error: string | null; busy: boolean }
  | { name: 'working'; message: string }
  | { name: 'wrong-account'; google: GoogleAccount; expectedEmail: string }
  | { name: 'recovery'; google: GoogleAccount; error: string | null; busy: boolean; canRetry: boolean }
  | { name: 'choose'; google: GoogleAccount; remote: RemoteSummary; busy: boolean }
  | { name: 'ready'; google: GoogleAccount | null };

const staticLocalOnly = {
  notConfigured: localOnlyCloud('not-configured'),
  needsDevBuild: localOnlyCloud('needs-dev-build'),
};

/**
 * Sits between the database and the app, and decides where the data lives:
 *
 *   sign in → choose "Cloud" or "This phone" (once per account)
 *     phone → app (SQLite on this device only)
 *     Cloud → connect Google Drive → (first time on this phone) restore → app
 *
 * The app always works on the local SQLite database; Cloud adds an encrypted
 * copy in Google Drive, reconnects silently on each launch and keeps syncing
 * in the background. Without Cloud configured (or in Expo Go, which lacks the
 * native Google module) the app runs on this device only and doesn't ask.
 */
export function CloudGate({ children }: { children: React.ReactNode }) {
  if (!cloudConfigured) {
    return <CloudContext.Provider value={staticLocalOnly.notConfigured}>{children}</CloudContext.Provider>;
  }
  if (!googleSignInAvailable()) {
    return <CloudContext.Provider value={staticLocalOnly.needsDevBuild}>{children}</CloudContext.Provider>;
  }
  return <StorageGate>{children}</StorageGate>;
}

function StorageGate({ children }: { children: React.ReactNode }) {
  const account = useAccount();
  const scope = account?.userId ?? 'local';
  const remote = useStorageModeRemote();
  const remoteRef = useRef(remote);
  useEffect(() => {
    remoteRef.current = remote;
  }, [remote]);

  // undefined = still reading; null = not chosen yet.
  const [mode, setMode] = useState<StorageMode | null | undefined>(undefined);
  // Right after a choice the Drive consent opens by itself instead of waiting for a tap.
  const [justChose, setJustChose] = useState(false);

  useEffect(() => {
    let cancelled = false;
    resolveStorageMode(scope, remoteRef.current).then(
      (resolved) => !cancelled && setMode(resolved),
      () => !cancelled && setMode(null),
    );
    return () => {
      cancelled = true;
    };
  }, [scope]);

  const choose = useCallback(
    async (next: StorageMode) => {
      await saveLocalStorageMode(scope, next).catch(() => {});
      await remote?.write(next).catch(() => {});
      useSessionStore.getState().showWelcome(next === 'cloud' ? 'cloud-ready' : 'device-ready');
      setJustChose(true);
      setMode(next);
    },
    [remote, scope],
  );

  const deviceApi = useMemo(
    () =>
      localOnlyCloud('device-only', {
        setStorageMode: choose,
        // Google stays signed in natively after sign-in; let go of it with the account.
        prepareSignOut: disconnectGoogle,
      }),
    [choose],
  );

  if (mode === undefined) return <CloudWorkingScreen message="Getting your space ready…" />;
  if (mode === null) return <StorageChoiceScreen onChoose={choose} />;
  if (mode === 'device') return <CloudContext.Provider value={deviceApi}>{children}</CloudContext.Provider>;
  return (
    <CloudSession autoConnect={justChose} onChooseStorage={choose}>
      {children}
    </CloudSession>
  );
}

function deviceLabel(): string | null {
  return Device.modelName ?? Device.deviceName ?? null;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([promise, new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms))]);
}

function CloudSession({
  children,
  autoConnect,
  onChooseStorage,
}: {
  children: React.ReactNode;
  autoConnect: boolean;
  onChooseStorage: (mode: StorageMode) => Promise<void>;
}) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const account = useAccount();
  const scope = account?.userId ?? 'local';
  const autoSync = useSettingsStore((state) => state.cloudAutoSync);

  // Clerk hands out a new user object on every update; the latest escrow is read through a ref
  // so those updates don't restart the whole connection flow.
  const escrow = useKeyEscrow();
  const escrowRef = useRef(escrow);
  useEffect(() => {
    escrowRef.current = escrow;
  }, [escrow]);

  const [phase, setPhase] = useState<Phase>({ name: 'connecting' });
  const [status, setStatus] = useState<CloudStatus>('syncing');
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<RemoteSummary | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const engineRef = useRef<SyncEngine | null>(null);
  const keyRef = useRef<KeyRecord | null>(null);
  const googleRef = useRef<GoogleAccount | null>(null);
  const conflictRef = useRef(false);
  const acceptedAccountRef = useRef<string | null>(null);

  const store = useMemo(() => createDriveStore(getAccessToken), []);
  const stateStore = useMemo(() => createSyncStateStore(scope), [scope]);

  const buildEngine = useCallback(
    (record: KeyRecord) => {
      const engine = createSyncEngine({
        store,
        snapshots: createSqliteSnapshots(db),
        state: stateStore,
        suite: expoCipherSuite,
        key: keyBytesOf(record),
        keyId: record.keyId,
        scope,
        device: deviceLabel(),
        prefs: { read: () => pickSyncedSettings(), apply: applySyncedSettings },
      });
      engineRef.current = engine;
      keyRef.current = record;
      return engine;
    },
    [db, scope, stateStore, store],
  );

  /** Everything cached from the old data — queries and scheduled reminders — is stale once the Cloud copy replaces it. */
  const afterRestore = useCallback(async () => {
    await rescheduleAllReminders(db).catch(() => {});
    await rescheduleNoteReminders(db).catch(() => {});
    await queryClient.invalidateQueries();
  }, [db, queryClient]);

  // ---- Background sync, once the app is open ------------------------------------------------

  const syncingRef = useRef(false);
  const againRef = useRef(false);

  const runSync = useCallback(
    async (options: { manual?: boolean } = {}) => {
      const engine = engineRef.current;
      if (!engine) return;
      // A pending conflict waits for the person's choice instead of re-asking every few seconds.
      if (conflictRef.current && !options.manual) return;
      if (syncingRef.current) {
        againRef.current = true;
        return;
      }
      syncingRef.current = true;
      setStatus('syncing');
      try {
        if (!googleRef.current) {
          // Opened offline: reconnect to Google first.
          googleRef.current = await connectSilently();
          if (!googleRef.current) {
            setPhase({ name: 'connect', error: 'Your Google session ended. Connect your Cloud again.', busy: false });
            return;
          }
          setPhase({ name: 'ready', google: googleRef.current });
        }
        const outcome = await engine.sync();
        if (outcome.kind === 'restored') await afterRestore();
        if (outcome.kind === 'conflict') {
          conflictRef.current = true;
          setConflict(outcome.remote);
          setStatus('conflict');
          if (!options.manual) {
            Alert.alert(
              'Your Cloud has newer changes',
              `This phone and your Cloud were both changed. Keep this phone's version, or replace it with the Cloud copy (${outcome.remote.device ?? 'another phone'})?`,
              [
                { text: 'Decide later', style: 'cancel' },
                { text: 'Use Cloud copy', onPress: () => void resolveRef.current('remote') },
                { text: "Keep this phone's", onPress: () => void resolveRef.current('local') },
              ],
            );
          }
          return;
        }
        conflictRef.current = false;
        setConflict(null);
        setError(null);
        setStatus('synced');
        setLastSyncedAt((await engine.loadState()).lastSyncedAt);
      } catch (caught) {
        const cloudError = toCloudError(caught);
        if (cloudError.code === 'auth') {
          const again = await connectSilently().catch(() => null);
          if (!again) {
            setPhase({ name: 'connect', error: cloudError.message, busy: false });
            return;
          }
        }
        setStatus(cloudError.code === 'offline' ? 'offline' : 'error');
        setError(cloudErrorMessage(cloudError));
      } finally {
        syncingRef.current = false;
        if (againRef.current) {
          againRef.current = false;
          setTimeout(() => void runSyncRef.current(), 0);
        }
      }
    },
    [afterRestore],
  );

  const runSyncRef = useRef(runSync);
  useEffect(() => {
    runSyncRef.current = runSync;
  }, [runSync]);

  const resolveConflict = useCallback(
    async (prefer: 'local' | 'remote') => {
      const engine = engineRef.current;
      if (!engine) return;
      setStatus('syncing');
      try {
        const outcome = await engine.sync({ prefer });
        if (outcome.kind === 'restored') await afterRestore();
        conflictRef.current = false;
        setConflict(null);
        setError(null);
        setStatus('synced');
        setLastSyncedAt((await engine.loadState()).lastSyncedAt);
      } catch (caught) {
        const cloudError = toCloudError(caught);
        setStatus(cloudError.code === 'offline' ? 'offline' : 'error');
        setError(cloudErrorMessage(cloudError));
      }
    },
    [afterRestore],
  );

  const resolveRef = useRef(resolveConflict);
  useEffect(() => {
    resolveRef.current = resolveConflict;
  }, [resolveConflict]);

  // ---- Getting the key ----------------------------------------------------------------------

  /** The account key, or why there isn't one available on this phone yet. */
  const resolveKey = useCallback(
    async (google: GoogleAccount | null): Promise<KeyRecord | 'unreachable' | 'none'> => {
      const cached = await loadCachedKey(scope);
      const currentEscrow = escrowRef.current;
      let escrowed: KeyRecord | null = null;
      let escrowReachable = false;
      if (currentEscrow) {
        try {
          escrowed = await currentEscrow.read();
          escrowReachable = true;
        } catch {
          escrowReachable = false;
        }
      }

      if (escrowed) {
        if (!cached || cached.keyId !== escrowed.keyId) await cacheKey(scope, escrowed);
        if (google && !escrowed.googleEmail) {
          const updated = { ...escrowed, googleEmail: google.email };
          await currentEscrow?.write(updated).catch(() => {});
          return updated;
        }
        return escrowed;
      }
      if (cached) {
        // Made on this phone before the account could store it — hand it over now.
        if (currentEscrow && escrowReachable) await currentEscrow.write(cached).catch(() => {});
        return cached;
      }
      // With sign-in on, a key must be stored with the account; if the account can't be reached, wait.
      if (authEnabled && !(currentEscrow && escrowReachable)) return 'unreachable';
      return 'none';
    },
    [scope],
  );

  // ---- Opening: connect → key → first sync → app -----------------------------------------------

  const open = useCallback(
    async (google: GoogleAccount | null) => {
      googleRef.current = google;
      if (google) setPhase({ name: 'working', message: 'Unlocking your Cloud…' });

      let record: KeyRecord | 'unreachable' | 'none';
      try {
        record = await resolveKey(google);
      } catch (caught) {
        setPhase({ name: 'connect', error: cloudErrorMessage(caught), busy: false });
        return;
      }

      if (record === 'unreachable' || record === 'none') {
        if (!google) {
          setPhase({ name: 'connect', error: cloudErrorMessage(new CloudError('offline')), busy: false });
          return;
        }
        let remoteExists: boolean;
        try {
          remoteExists = (await store.find(cloudFileName(scope))) !== null;
        } catch (caught) {
          setPhase({ name: 'connect', error: cloudErrorMessage(caught), busy: false });
          return;
        }
        if (remoteExists || record === 'unreachable') {
          setPhase({ name: 'recovery', google, error: null, busy: false, canRetry: record === 'unreachable' });
          return;
        }
        // A brand-new Cloud: make the key and keep it with the account.
        const fresh = await createKeyRecord(expoCipherSuite, google.email);
        try {
          await escrowRef.current?.write(fresh);
        } catch {
          setPhase({
            name: 'connect',
            error: "Couldn't save your Cloud key to your ClayHabbit account. Check your connection and try again.",
            busy: false,
          });
          return;
        }
        await cacheKey(scope, fresh);
        record = fresh;
      }

      if (
        google &&
        record.googleEmail &&
        record.googleEmail.toLowerCase() !== google.email.toLowerCase() &&
        acceptedAccountRef.current !== google.email
      ) {
        setPhase({ name: 'wrong-account', google, expectedEmail: record.googleEmail });
        return;
      }

      const engine = buildEngine(record);
      const state = await engine.loadState();

      if (state.lastSyncedAt === null) {
        // First time on this phone: the data has to be in place before the app opens.
        if (!google) {
          setPhase({ name: 'connect', error: cloudErrorMessage(new CloudError('offline')), busy: false });
          return;
        }
        setPhase({ name: 'working', message: 'Bringing your data from the Cloud…' });
        try {
          const outcome = await engine.sync();
          if (outcome.kind === 'conflict') {
            setPhase({ name: 'choose', google, remote: outcome.remote, busy: false });
            return;
          }
          if (outcome.kind === 'restored') await afterRestore();
          setStatus('synced');
          setLastSyncedAt((await engine.loadState()).lastSyncedAt);
          setPhase({ name: 'ready', google });
        } catch (caught) {
          const cloudError = toCloudError(caught);
          if (cloudError.code === 'wrong-key') {
            setPhase({ name: 'recovery', google, error: cloudError.message, busy: false, canRetry: false });
          } else {
            setPhase({ name: 'connect', error: cloudErrorMessage(cloudError), busy: false });
          }
        }
        return;
      }

      // This phone has synced before: open straight away and catch up in the background.
      setLastSyncedAt(state.lastSyncedAt);
      setPhase({ name: 'ready', google });
      setTimeout(() => void runSyncRef.current(), 0);
    },
    [afterRestore, buildEngine, resolveKey, scope, store],
  );

  // Changes → sync shortly after; leaving the app → sync now; coming back → pick up other phones' changes.
  const ready = phase.name === 'ready';
  useEffect(() => {
    if (!ready) return;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    let firstChangeAt: number | null = null;

    const schedule = () => {
      const now = Date.now();
      firstChangeAt ??= now;
      if (debounce) clearTimeout(debounce);
      const wait = Math.max(0, Math.min(DEBOUNCE_MS, firstChangeAt + MAX_WAIT_MS - now));
      debounce = setTimeout(() => {
        debounce = null;
        firstChangeAt = null;
        void runSyncRef.current();
      }, wait);
    };

    const changes = autoSync ? addDatabaseChangeListener(schedule) : null;
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'active') {
        if (debounce) clearTimeout(debounce);
        debounce = null;
        firstChangeAt = null;
        void runSyncRef.current();
      }
    });
    return () => {
      if (debounce) clearTimeout(debounce);
      changes?.remove();
      appState.remove();
    };
  }, [ready, autoSync]);

  // ---- Gate screen actions --------------------------------------------------------------------

  const connect = useCallback(async () => {
    setPhase({ name: 'connect', error: null, busy: true });
    try {
      const google = await connectInteractively();
      await open(google);
    } catch (caught) {
      const cloudError = toCloudError(caught);
      setPhase({
        name: 'connect',
        error: cloudError.code === 'cancelled' ? null : cloudErrorMessage(cloudError),
        busy: false,
      });
    }
  }, [open]);

  // Launch: reconnect silently when this phone has connected before.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const google = await connectSilently();
        if (cancelled) return;
        if (google) await open(google);
        else if (autoConnect) await connect();
        else setPhase({ name: 'connect', error: null, busy: false });
      } catch (caught) {
        if (cancelled) return;
        const cloudError = toCloudError(caught);
        if (cloudError.code === 'offline') {
          // Offline start is fine for a phone that has synced before and still has its key.
          const [cached, state] = await Promise.all([loadCachedKey(scope), stateStore.load()]);
          if (cached && state.lastSyncedAt) {
            buildEngine(cached);
            setLastSyncedAt(state.lastSyncedAt);
            setStatus('offline');
            setError(cloudErrorMessage(cloudError));
            setPhase({ name: 'ready', google: null });
            return;
          }
        }
        setPhase({ name: 'connect', error: cloudErrorMessage(cloudError), busy: false });
      }
    })();
    return () => {
      cancelled = true;
    };
    // Runs once per account; `open` and friends are stable for a given scope.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const switchGoogleAccount = useCallback(async () => {
    await disconnectGoogle();
    googleRef.current = null;
    engineRef.current = null;
    setPhase({ name: 'connect', error: null, busy: false });
  }, []);

  /** Cloud → phone: one last save, then stop syncing and hand back the Drive permission. */
  const setStorageMode = useCallback(
    async (mode: StorageMode) => {
      if (mode === 'cloud') return;
      const engine = engineRef.current;
      if (engine && !conflictRef.current) await withTimeout(engine.sync().catch(() => undefined), SIGN_OUT_SYNC_TIMEOUT_MS);
      engineRef.current = null;
      googleRef.current = null;
      await revokeDriveAccess();
      await onChooseStorage('device');
    },
    [onChooseStorage],
  );

  const api = useMemo<CloudApi>(
    () => ({
      enabled: true,
      storageMode: 'cloud',
      setStorageMode,
      unavailableReason: null,
      status,
      account: phase.name === 'ready' ? phase.google : null,
      lastSyncedAt,
      error,
      conflict,
      syncNow: () => runSync({ manual: true }),
      resolveConflict,
      revealBackupKey: async () => (keyRef.current ? formatBackupKey(keyRef.current) : null),
      switchGoogleAccount,
      prepareSignOut: async () => {
        const engine = engineRef.current;
        if (engine && !conflictRef.current) await withTimeout(engine.sync().catch(() => undefined), SIGN_OUT_SYNC_TIMEOUT_MS);
        await disconnectGoogle();
        // The account keeps the key; this phone doesn't need its copy once signed out.
        if (escrowRef.current) await forgetCachedKey(scope).catch(() => {});
      },
    }),
    [conflict, error, lastSyncedAt, phase, resolveConflict, runSync, scope, setStorageMode, status, switchGoogleAccount],
  );

  switch (phase.name) {
    case 'connecting':
      return <CloudWorkingScreen message="Connecting to your Cloud…" />;
    case 'working':
      return <CloudWorkingScreen message={phase.message} />;
    case 'connect':
      return (
        <ConnectCloudScreen
          error={phase.error}
          busy={phase.busy}
          onConnect={connect}
          onUseDevice={() => void onChooseStorage('device')}
        />
      );
    case 'wrong-account':
      return (
        <WrongGoogleAccountScreen
          connected={phase.google}
          expectedEmail={phase.expectedEmail}
          onSwitch={async () => {
            await disconnectGoogle();
            await connect();
          }}
          onContinue={async () => {
            acceptedAccountRef.current = phase.google.email;
            const record = await loadCachedKey(scope);
            if (record) {
              const updated = { ...record, googleEmail: phase.google.email };
              await cacheKey(scope, updated);
              await escrowRef.current?.write(updated).catch(() => {});
            }
            await open(phase.google);
          }}
        />
      );
    case 'recovery':
      return (
        <RecoveryKeyScreen
          error={phase.error}
          busy={phase.busy}
          canRetry={phase.canRetry}
          onRetry={() => void open(phase.google)}
          onSubmit={async (input) => {
            setPhase({ ...phase, busy: true, error: null });
            const record = await recordFromBackupKey(expoCipherSuite, input, phase.google.email);
            if (!record) {
              setPhase({ ...phase, busy: false, error: "That doesn't look like a backup key. It has 64 letters and numbers." });
              return;
            }
            const remote = await store.find(cloudFileName(scope)).catch(() => null);
            const remoteKeyId = remote?.appProperties.keyId;
            if (remoteKeyId && remoteKeyId !== record.keyId) {
              setPhase({ ...phase, busy: false, error: "That key doesn't match your Cloud copy." });
              return;
            }
            await cacheKey(scope, record);
            await escrowRef.current?.write(record).catch(() => {});
            await open(phase.google);
          }}
          onStartOver={async () => {
            setPhase({ name: 'working', message: 'Starting a fresh Cloud…' });
            try {
              const fresh = await createKeyRecord(expoCipherSuite, phase.google.email);
              const remote = await store.find(cloudFileName(scope));
              if (remote) await store.remove(remote.id);
              await escrowRef.current?.write(fresh);
              await cacheKey(scope, fresh);
              await stateStore.save({ fileId: null, remoteSnapshotId: null, localHash: null, lastSyncedAt: null });
              await open(phase.google);
            } catch (caught) {
              setPhase({ name: 'recovery', google: phase.google, error: cloudErrorMessage(caught), busy: false, canRetry: false });
            }
          }}
        />
      );
    case 'choose':
      return (
        <ChooseCopyScreen
          remote={phase.remote}
          busy={phase.busy}
          onChoose={async (prefer) => {
            setPhase({ ...phase, busy: true });
            try {
              await engineRef.current?.sync({ prefer });
              if (prefer === 'remote') await afterRestore();
              setStatus('synced');
              setLastSyncedAt((await engineRef.current?.loadState())?.lastSyncedAt ?? null);
              setPhase({ name: 'ready', google: phase.google });
            } catch (caught) {
              setPhase({ name: 'connect', error: cloudErrorMessage(caught), busy: false });
            }
          }}
        />
      );
    case 'ready':
      return <CloudContext.Provider value={api}>{children}</CloudContext.Provider>;
  }
}
