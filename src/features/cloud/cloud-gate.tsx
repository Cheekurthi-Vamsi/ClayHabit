import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Device from 'expo-device';
import { addDatabaseChangeListener, useSQLiteContext } from 'expo-sqlite';
import { Alert, AppState } from 'react-native';

import { rescheduleNoteReminders } from '@/features/notes/services/note-reminders';
import { rescheduleAllReminders } from '@/features/tasks/hooks';
import { UnlockPasscodeScreen } from '@/features/vault/passcode-screens';
import { useVault } from '@/features/vault/vault-context';
import { useLegacyClerkData, type LegacyClerkData } from '@/lib/auth/legacy-clerk-data';
import { cloudErrorMessage, CloudError, toCloudError } from '@/lib/cloud/cloud-error';
import { forgetCachedKey, keyBytesOf, loadCachedKey } from '@/lib/cloud/cloud-key';
import { createDriveStore } from '@/lib/cloud/drive-client';
import { expoCipherSuite } from '@/lib/cloud/expo-cipher-suite';
import {
  connectInteractively,
  connectSilently,
  disconnectGoogle,
  getAccessToken,
  revokeDriveAccess,
  type GoogleAccount,
} from '@/lib/cloud/google-account';
import { createSqliteSnapshots } from '@/lib/cloud/sqlite-snapshots';
import { cloudFileName, createSyncEngine, type RemoteSummary, type SyncEngine } from '@/lib/cloud/sync-engine';
import { createSyncStateStore } from '@/lib/cloud/sync-state-store';
import type { StorageMode } from '@/lib/storage/storage-mode';
import { fetchRemoteKeyring, saveRemoteKeyring, type RemoteKeyring } from '@/lib/vault/cloud-keyring';
import { openKeyring, WrongPasscodeError, type DataKey } from '@/lib/vault/keyring';
import { rekeyDatabase } from '@/lib/vault/secure-database';
import { loadLocalKeyring } from '@/lib/vault/vault-store';
import { applySyncedSettings, pickSyncedSettings, useSettingsStore } from '@/store/settings-store';

import { CloudContext, localOnlyCloud, type CloudApi, type CloudStatus } from './cloud-context';
import { ChooseCopyScreen, CloudWorkingScreen, ConnectCloudScreen } from './cloud-screens';

/**
 * Quiet period after the last change before syncing, and the longest a change waits:
 * short, so an edit reaches the Cloud (and the web app) within a couple of seconds,
 * while a burst of taps still goes up as one save.
 */
const DEBOUNCE_MS = 1_500;
const MAX_WAIT_MS = 5_000;
/** How often an open app checks the Cloud for changes made elsewhere (the web app, another phone). */
const PULL_INTERVAL_MS = 20_000;
const SIGN_OUT_SYNC_TIMEOUT_MS = 6_000;

type Phase =
  | { name: 'connecting' }
  | { name: 'connect'; error: string | null; busy: boolean }
  | { name: 'working'; message: string }
  | { name: 'other-key'; google: GoogleAccount; remote: RemoteKeyring; error: string | null; busy: boolean }
  | { name: 'choose'; google: GoogleAccount; remote: RemoteSummary; busy: boolean }
  | { name: 'ready'; google: GoogleAccount | null };

/**
 * Sits between the (encrypted) database and the app. The vault has already
 * decided where the data lives and unlocked its key:
 *
 *   phone → app, nothing leaves the device
 *   Cloud → Google Drive connected → keyring in step → (first time) restore → app
 *
 * The app always works on the local database; Cloud adds an encrypted copy
 * in the person's Drive, sealed with the passcode-protected data key, and
 * keeps it in sync in the background.
 */
export function CloudGate({ children }: { children: React.ReactNode }) {
  const vault = useVault();
  const deviceApi = useMemo(
    () =>
      localOnlyCloud(vault.cloudAvailable ? 'device-only' : 'not-configured', {
        setStorageMode: vault.setStorageMode,
        prepareSignOut: async () => {
          await disconnectGoogle().catch(() => {});
          await vault.lock();
        },
      }),
    [vault],
  );

  if (vault.storageMode === 'device' || !vault.cloudAvailable) {
    return <CloudContext.Provider value={deviceApi}>{children}</CloudContext.Provider>;
  }
  return <CloudSession onChooseStorage={vault.setStorageMode}>{children}</CloudSession>;
}

function deviceLabel(): string | null {
  return Device.modelName ?? Device.deviceName ?? null;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([promise, new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms))]);
}

/** Keys from before passcodes, still able to open an old Cloud copy until it's re-sealed. */
async function loadLegacyKeys(scope: string, legacy: LegacyClerkData | null): Promise<DataKey[]> {
  const records = [await loadCachedKey(scope).catch(() => null), await legacy?.readCloudKey().catch(() => null)];
  const keys: DataKey[] = [];
  for (const record of records) {
    if (record && !keys.some((key) => key.keyId === record.keyId)) {
      keys.push({ key: keyBytesOf(record), keyId: record.keyId });
    }
  }
  return keys;
}

function CloudSession({
  children,
  onChooseStorage,
}: {
  children: React.ReactNode;
  onChooseStorage: (mode: StorageMode) => Promise<void>;
}) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const vault = useVault();
  const legacy = useLegacyClerkData();
  const scope = vault.scope;
  const autoSync = useSettingsStore((state) => state.cloudAutoSync);

  const [phase, setPhase] = useState<Phase>({ name: 'connecting' });
  const [status, setStatus] = useState<CloudStatus>('syncing');
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<RemoteSummary | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const engineRef = useRef<SyncEngine | null>(null);
  const googleRef = useRef<GoogleAccount | null>(null);
  const conflictRef = useRef(false);
  const legacyKeysRef = useRef<DataKey[]>([]);
  // The vault and Clerk objects change identity on updates; read the latest through refs.
  const vaultRef = useRef(vault);
  const legacyRef = useRef(legacy);
  useEffect(() => {
    vaultRef.current = vault;
    legacyRef.current = legacy;
  }, [vault, legacy]);

  const store = useMemo(() => createDriveStore(getAccessToken), []);
  const stateStore = useMemo(() => createSyncStateStore(scope), [scope]);

  const buildEngine = useCallback(
    (dataKey: DataKey) => {
      const engine = createSyncEngine({
        store,
        snapshots: createSqliteSnapshots(db),
        state: stateStore,
        suite: expoCipherSuite,
        key: dataKey.key,
        keyId: dataKey.keyId,
        legacyKeys: legacyKeysRef.current,
        scope,
        device: deviceLabel(),
        prefs: { read: () => pickSyncedSettings(), apply: applySyncedSettings },
      });
      engineRef.current = engine;
      return engine;
    },
    [db, scope, stateStore, store],
  );

  /** Once the Cloud copy is sealed with the passcode key, the retired keys and Clerk fields go for good. */
  const retireLegacy = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    if (legacyKeysRef.current.length > 0) {
      const remote = await engine.inspectRemote();
      if (remote.exists && remote.keyId !== vaultRef.current.dataKey.keyId) return;
      await forgetCachedKey(scope).catch(() => {});
      legacyKeysRef.current = [];
    }
    await legacyRef.current?.purge().catch(() => {});
  }, [scope]);

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
        await retireLegacy();
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
    [afterRestore, retireLegacy],
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
        await retireLegacy();
      } catch (caught) {
        const cloudError = toCloudError(caught);
        setStatus(cloudError.code === 'offline' ? 'offline' : 'error');
        setError(cloudErrorMessage(cloudError));
      }
    },
    [afterRestore, retireLegacy],
  );

  const resolveRef = useRef(resolveConflict);
  useEffect(() => {
    resolveRef.current = resolveConflict;
  }, [resolveConflict]);

  // ---- Opening: connect → keyring in step → first sync → app -----------------------------------

  const startSyncing = useCallback(
    async (google: GoogleAccount, dataKey: DataKey) => {
      const engine = buildEngine(dataKey);
      const state = await engine.loadState();

      if (state.lastSyncedAt === null) {
        // First time on this phone: the data has to be in place before the app opens.
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
          await retireLegacy();
        } catch (caught) {
          setPhase({ name: 'connect', error: cloudErrorMessage(caught), busy: false });
        }
        return;
      }

      // This phone has synced before: open straight away and catch up in the background.
      setLastSyncedAt(state.lastSyncedAt);
      setPhase({ name: 'ready', google });
      setTimeout(() => void runSyncRef.current(), 0);
    },
    [afterRestore, buildEngine, retireLegacy],
  );

  const open = useCallback(
    async (google: GoogleAccount) => {
      googleRef.current = google;
      setPhase({ name: 'working', message: 'Checking your Cloud…' });
      legacyKeysRef.current = await loadLegacyKeys(scope, legacyRef.current);
      const dataKey = vaultRef.current.dataKey;
      try {
        const remote = await fetchRemoteKeyring(store, scope);
        if (!remote) {
          // This phone's key joins the Cloud (e.g. it switched from phone-only).
          const local = await loadLocalKeyring(scope);
          if (!local) throw new CloudError('corrupt', 'no keyring on this phone');
          await saveRemoteKeyring(store, scope, local);
        } else if (remote.keyring.keyId !== dataKey.keyId) {
          setPhase({ name: 'other-key', google, remote, error: null, busy: false });
          return;
        }
      } catch (caught) {
        setPhase({ name: 'connect', error: cloudErrorMessage(caught), busy: false });
        return;
      }
      await startSyncing(google, dataKey);
    },
    [scope, startSyncing, store],
  );

  // Changes → sync shortly after; leaving the app → sync now; coming back, and every few seconds
  // while open → pick up changes from the web app and other phones.
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

    // Only real edits count; the scratch schemas used to build and restore snapshots don't.
    const changes = autoSync
      ? addDatabaseChangeListener((event) => event.databaseName === 'main' && schedule())
      : null;
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'active') {
        if (debounce) clearTimeout(debounce);
        debounce = null;
        firstChangeAt = null;
        void runSyncRef.current();
      }
    });
    // Checking costs one small metadata request; the copy is only downloaded when it changed.
    const pull = autoSync
      ? setInterval(() => {
          if (!debounce && AppState.currentState === 'active') void runSyncRef.current();
        }, PULL_INTERVAL_MS)
      : null;
    return () => {
      if (debounce) clearTimeout(debounce);
      if (pull) clearInterval(pull);
      changes?.remove();
      appState.remove();
    };
  }, [ready, autoSync]);

  const connect = useCallback(async () => {
    setPhase({ name: 'connect', error: null, busy: true });
    try {
      await open(await connectInteractively());
    } catch (caught) {
      const cloudError = toCloudError(caught);
      setPhase({
        name: 'connect',
        error: cloudError.code === 'cancelled' ? null : cloudErrorMessage(cloudError),
        busy: false,
      });
    }
  }, [open]);

  // Launch: reconnect silently (the vault connected already on a first run).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const google = await connectSilently();
        if (cancelled) return;
        if (google) await open(google);
        else setPhase({ name: 'connect', error: null, busy: false });
      } catch (caught) {
        if (cancelled) return;
        const cloudError = toCloudError(caught);
        if (cloudError.code === 'offline') {
          // Offline start is fine for a phone that has synced before.
          const state = await stateStore.load();
          if (state.lastSyncedAt) {
            legacyKeysRef.current = await loadLegacyKeys(scope, legacyRef.current);
            buildEngine(vaultRef.current.dataKey);
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
      switchGoogleAccount,
      prepareSignOut: async () => {
        const engine = engineRef.current;
        if (engine && !conflictRef.current) await withTimeout(engine.sync().catch(() => undefined), SIGN_OUT_SYNC_TIMEOUT_MS);
        await disconnectGoogle();
        // Signed out, this phone forgets the key; the passcode brings it back.
        await vaultRef.current.lock();
      },
    }),
    [conflict, error, lastSyncedAt, phase, resolveConflict, runSync, setStorageMode, status, switchGoogleAccount],
  );

  const unlockCloudKey = async (current: Extract<Phase, { name: 'other-key' }>, passcode: string) => {
    setPhase({ ...current, busy: true, error: null });
    try {
      const cloudKey = await openKeyring(expoCipherSuite, current.remote.keyring, passcode);
      // This phone joins the Cloud's key: re-encrypt its database, then sync as usual.
      await rekeyDatabase(db, cloudKey);
      await vaultRef.current.adoptDataKey(cloudKey, current.remote.keyring);
      await startSyncing(current.google, cloudKey);
    } catch (caught) {
      setPhase({
        ...current,
        busy: false,
        error: caught instanceof WrongPasscodeError ? 'That isn’t your Cloud passcode.' : cloudErrorMessage(caught),
      });
    }
  };

  const replaceCloudCopy = async (current: Extract<Phase, { name: 'other-key' }>) => {
    setPhase({ ...current, busy: true, error: null });
    try {
      const local = await loadLocalKeyring(scope);
      if (!local) throw new CloudError('corrupt', 'no keyring on this phone');
      const snapshot = await store.find(cloudFileName(scope));
      if (snapshot) await store.remove(snapshot.id);
      await saveRemoteKeyring(store, scope, local, current.remote.fileId);
      await stateStore.save({ fileId: null, remoteSnapshotId: null, localHash: null, lastSyncedAt: null });
      await startSyncing(current.google, vaultRef.current.dataKey);
    } catch (caught) {
      setPhase({ ...current, busy: false, error: cloudErrorMessage(caught) });
    }
  };

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
    case 'other-key':
      // The Cloud holds data under a different passcode than this phone's (it was set up on its own first).
      return (
        <UnlockPasscodeScreen
          cloud
          busy={phase.busy}
          error={phase.error}
          onUnlock={(passcode) => void unlockCloudKey(phase, passcode)}
          onForgot={() =>
            Alert.alert(
              'Replace your Cloud copy?',
              'Without its passcode, the Cloud copy can’t be opened. Replacing it deletes it and uploads this phone’s data under this phone’s passcode.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Keep data on this phone', onPress: () => void onChooseStorage('device') },
                { text: 'Replace Cloud copy', style: 'destructive', onPress: () => void replaceCloudCopy(phase) },
              ],
            )
          }
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
              await retireLegacy();
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
