import { useCallback, useEffect, useMemo, useState } from 'react';
import { deleteDatabaseAsync } from 'expo-sqlite';
import { Alert } from 'react-native';

import { useAccount } from '@/features/auth/account-context';
import { CloudFrame, CloudWorkingScreen, ConnectCloudScreen, ErrorNote, SignOutLink } from '@/features/cloud/cloud-screens';
import { StorageChoiceScreen } from '@/features/cloud/storage-choice-screen';
import { Button } from '@/components/ui';
import { cloudErrorMessage, toCloudError } from '@/lib/cloud/cloud-error';
import { cloudConfigured } from '@/lib/cloud/config';
import { createDriveStore } from '@/lib/cloud/drive-client';
import { expoCipherSuite } from '@/lib/cloud/expo-cipher-suite';
import { connectInteractively, connectSilently, getAccessToken, googleSignInAvailable } from '@/lib/cloud/google-account';
import { cloudFileName } from '@/lib/cloud/sync-engine';
import { loadLocalStorageMode, saveLocalStorageMode, type StorageMode } from '@/lib/storage/storage-mode';
import { fetchRemoteKeyring, keyringFileName, saveRemoteKeyring } from '@/lib/vault/cloud-keyring';
import {
  createKeyring,
  openKeyring,
  rewrapKeyring,
  WrongPasscodeError,
  type DataKey,
  type Keyring,
} from '@/lib/vault/keyring';
import { DatabaseKeyError, prepareSecureDatabase, secureDatabaseName } from '@/lib/vault/secure-database';
import {
  clearPasscodeFailures,
  forgetDataKey,
  loadDataKey,
  loadLocalKeyring,
  passcodeWait,
  recordPasscodeFailure,
  resetVault,
  saveDataKey,
  saveLocalKeyring,
} from '@/lib/vault/vault-store';
import { useSessionStore } from '@/store/session-store';

import { CreatePasscodeScreen, UnlockPasscodeScreen } from './passcode-screens';
import { VaultContext, type PasscodeCheck, type VaultApi } from './vault-context';

type Phase =
  | { name: 'loading'; message: string }
  | { name: 'choose' }
  | { name: 'connect'; error: string | null; busy: boolean }
  | { name: 'create'; mode: StorageMode; error: string | null; busy: boolean }
  | { name: 'unlock'; mode: StorageMode; keyring: Keyring; remote: boolean; error: string | null; busy: boolean }
  | { name: 'key-mismatch'; mode: StorageMode; dataKey: DataKey }
  | { name: 'ready'; dataKey: DataKey; mode: StorageMode; databaseName: string };

export interface VaultReady {
  databaseName: string;
  dataKey: DataKey;
}

function waitMessage(waitMs: number): string {
  return `Too many tries. Wait ${Math.ceil(waitMs / 1000)} seconds and try again.`;
}

/**
 * Before any data is opened: where it lives (phone or Cloud), and the
 * passcode that unlocks its key. The database opens only once the key is
 * known, encrypted with it (SQLCipher), and the same key seals the Cloud
 * copy. Clerk is only the sign-in; nothing here touches it.
 */
export function VaultGate({
  databaseName,
  children,
}: {
  databaseName: string;
  children: (ready: VaultReady) => React.ReactNode;
}) {
  const account = useAccount();
  const scope = account?.userId ?? 'local';
  const cloudAvailable = cloudConfigured && googleSignInAvailable();
  const store = useMemo(() => createDriveStore(getAccessToken), []);

  const [phase, setPhase] = useState<Phase>({ name: 'loading', message: 'Getting your space ready…' });
  // Existing installs from before passcodes get an explanation instead of a cold ask.
  const [upgrading, setUpgrading] = useState(false);

  const finish = useCallback(
    async (dataKey: DataKey, mode: StorageMode) => {
      setPhase({ name: 'loading', message: 'Opening your encrypted data…' });
      try {
        const name = await prepareSecureDatabase(databaseName, dataKey);
        setPhase({ name: 'ready', dataKey, mode, databaseName: name });
      } catch (error) {
        if (error instanceof DatabaseKeyError) setPhase({ name: 'key-mismatch', mode, dataKey });
        else setPhase({ name: 'create', mode, busy: false, error: cloudErrorMessage(error) });
      }
    },
    [databaseName],
  );

  const afterCloudConnected = useCallback(async () => {
    setPhase({ name: 'loading', message: 'Looking for your Cloud…' });
    try {
      const remote = await fetchRemoteKeyring(store, scope);
      if (remote) {
        setPhase({ name: 'unlock', mode: 'cloud', keyring: remote.keyring, remote: true, busy: false, error: null });
        return;
      }
      const local = await loadLocalKeyring(scope);
      if (local) setPhase({ name: 'unlock', mode: 'cloud', keyring: local, remote: false, busy: false, error: null });
      else setPhase({ name: 'create', mode: 'cloud', busy: false, error: null });
    } catch (error) {
      setPhase({ name: 'connect', busy: false, error: cloudErrorMessage(error) });
    }
  }, [scope, store]);

  const proceed = useCallback(
    async (mode: StorageMode) => {
      if (mode === 'device') {
        const local = await loadLocalKeyring(scope);
        setPhase(
          local
            ? { name: 'unlock', mode, keyring: local, remote: false, busy: false, error: null }
            : { name: 'create', mode, busy: false, error: null },
        );
        return;
      }
      setPhase({ name: 'loading', message: 'Connecting to your Cloud…' });
      const google = await connectSilently().catch(() => null);
      if (google) await afterCloudConnected();
      else setPhase({ name: 'connect', busy: false, error: null });
    },
    [afterCloudConnected, scope],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [cached, chosen] = await Promise.all([
        loadDataKey(scope).catch(() => null),
        loadLocalStorageMode(scope).catch(() => null),
      ]);
      if (cancelled) return;
      const mode: StorageMode | null = cloudAvailable ? chosen : 'device';
      setUpgrading(chosen !== null);
      if (cached && mode) {
        await finish(cached, mode);
        return;
      }
      if (!mode) setPhase({ name: 'choose' });
      else await proceed(mode);
    })();
    return () => {
      cancelled = true;
    };
    // Runs once per account and database.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, databaseName]);

  const choose = async (mode: StorageMode) => {
    await saveLocalStorageMode(scope, mode).catch(() => {});
    useSessionStore.getState().showWelcome(mode === 'cloud' ? 'cloud-ready' : 'device-ready');
    await proceed(mode);
  };

  const connect = async () => {
    setPhase({ name: 'connect', busy: true, error: null });
    try {
      await connectInteractively();
      await afterCloudConnected();
    } catch (caught) {
      const error = toCloudError(caught);
      setPhase({ name: 'connect', busy: false, error: error.code === 'cancelled' ? null : cloudErrorMessage(error) });
    }
  };

  const create = async (mode: StorageMode, passcode: string) => {
    setPhase({ name: 'create', mode, busy: true, error: null });
    try {
      const { keyring, dataKey } = await createKeyring(expoCipherSuite, passcode);
      if (mode === 'cloud') await saveRemoteKeyring(store, scope, keyring);
      await saveLocalKeyring(scope, keyring);
      await saveDataKey(scope, dataKey);
      await finish(dataKey, mode);
    } catch (error) {
      setPhase({ name: 'create', mode, busy: false, error: error instanceof Error ? error.message : cloudErrorMessage(error) });
    }
  };

  const unlock = async (current: Extract<Phase, { name: 'unlock' }>, passcode: string) => {
    setPhase({ ...current, busy: true, error: null });
    const wait = await passcodeWait(scope);
    if (wait > 0) {
      setPhase({ ...current, busy: false, error: waitMessage(wait) });
      return;
    }
    try {
      const dataKey = await openKeyring(expoCipherSuite, current.keyring, passcode);
      await clearPasscodeFailures(scope);
      await saveLocalKeyring(scope, current.keyring);
      // A phone-made key joining the Cloud: its keyring goes up with it.
      if (current.mode === 'cloud' && !current.remote) await saveRemoteKeyring(store, scope, current.keyring);
      await saveDataKey(scope, dataKey);
      await finish(dataKey, current.mode);
    } catch (error) {
      if (error instanceof WrongPasscodeError) {
        const waitMs = await recordPasscodeFailure(scope);
        setPhase({ ...current, busy: false, error: waitMs > 0 ? waitMessage(waitMs) : 'That passcode isn’t right.' });
      } else {
        setPhase({ ...current, busy: false, error: cloudErrorMessage(error) });
      }
    }
  };

  /** No passcode, no data: the only way forward is to start this account over. */
  const startOver = (mode: StorageMode) => {
    Alert.alert(
      'Start over?',
      mode === 'cloud'
        ? 'Without the passcode, your Cloud copy can’t be opened by anyone. Starting over deletes it and this phone’s copy, and you choose a new passcode.'
        : 'Without the passcode, the data on this phone can’t be opened. Starting over deletes it and you choose a new passcode.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete and start over',
          style: 'destructive',
          onPress: async () => {
            setPhase({ name: 'loading', message: 'Starting over…' });
            try {
              if (mode === 'cloud') {
                for (const name of [keyringFileName(scope), cloudFileName(scope)]) {
                  const file = await store.find(name);
                  if (file) await store.remove(file.id);
                }
              }
              await deleteDatabaseAsync(secureDatabaseName(databaseName)).catch(() => {});
              await resetVault(scope);
              setPhase({ name: 'create', mode, busy: false, error: null });
            } catch (error) {
              setPhase({ name: 'connect', busy: false, error: cloudErrorMessage(error) });
            }
          },
        },
      ],
    );
  };

  const readyPhase = phase.name === 'ready' ? phase : null;

  const api = useMemo<VaultApi | null>(() => {
    if (!readyPhase) return null;
    const { dataKey, mode } = readyPhase;

    const verifyPasscode = async (passcode: string): Promise<PasscodeCheck> => {
      const wait = await passcodeWait(scope);
      if (wait > 0) return { ok: false, waitMs: wait };
      const keyring = await loadLocalKeyring(scope);
      if (!keyring) return { ok: false, waitMs: 0 };
      try {
        await openKeyring(expoCipherSuite, keyring, passcode);
        await clearPasscodeFailures(scope);
        return { ok: true };
      } catch (error) {
        if (!(error instanceof WrongPasscodeError)) throw error;
        return { ok: false, waitMs: await recordPasscodeFailure(scope) };
      }
    };

    return {
      scope,
      dataKey,
      storageMode: mode,
      cloudAvailable,
      async setStorageMode(next) {
        await saveLocalStorageMode(scope, next);
        setPhase({ ...readyPhase, mode: next });
      },
      verifyPasscode,
      async changePasscode(current, next) {
        const check = await verifyPasscode(current);
        if (!check.ok) return check;
        const keyring = await rewrapKeyring(expoCipherSuite, dataKey, next);
        if (mode === 'cloud') {
          const remote = await fetchRemoteKeyring(store, scope);
          await saveRemoteKeyring(store, scope, keyring, remote?.fileId ?? null);
        }
        await saveLocalKeyring(scope, keyring);
        return { ok: true };
      },
      async adoptDataKey(nextKey, keyring) {
        await saveLocalKeyring(scope, keyring);
        await saveDataKey(scope, nextKey);
        setPhase({ ...readyPhase, dataKey: nextKey });
      },
      async lock() {
        await forgetDataKey(scope);
      },
    };
  }, [cloudAvailable, readyPhase, scope, store]);

  switch (phase.name) {
    case 'loading':
      return <CloudWorkingScreen message={phase.message} />;
    case 'choose':
      return <StorageChoiceScreen onChoose={choose} />;
    case 'connect':
      return (
        <ConnectCloudScreen
          error={phase.error}
          busy={phase.busy}
          onConnect={connect}
          onUseDevice={() => void choose('device')}
        />
      );
    case 'create':
      return (
        <CreatePasscodeScreen
          cloud={phase.mode === 'cloud'}
          upgrading={upgrading}
          busy={phase.busy}
          error={phase.error}
          onCreate={(passcode) => void create(phase.mode, passcode)}
        />
      );
    case 'unlock':
      return (
        <UnlockPasscodeScreen
          cloud={phase.remote}
          busy={phase.busy}
          error={phase.error}
          onUnlock={(passcode) => void unlock(phase, passcode)}
          onForgot={() => startOver(phase.mode)}
        />
      );
    case 'key-mismatch':
      return (
        <CloudFrame
          icon="alert-triangle"
          title="This phone’s data uses another key"
          subtitle="The encrypted data on this phone was locked with a different passcode than the one you just used."
        >
          <ErrorNote
            message={
              phase.mode === 'cloud'
                ? 'Replacing it deletes only this phone’s copy; your data then comes back from the Cloud.'
                : 'Replacing it deletes this phone’s copy for good. Sign out and use the passcode it was made with if you still have it.'
            }
          />
          <Button
            label="Replace this phone’s copy"
            icon="refresh-cw"
            variant="danger"
            fullWidth
            onPress={() =>
              Alert.alert('Replace this phone’s copy?', 'The encrypted data on this phone is deleted.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Replace',
                  style: 'destructive',
                  onPress: async () => {
                    await deleteDatabaseAsync(secureDatabaseName(databaseName)).catch(() => {});
                    await finish(phase.dataKey, phase.mode);
                  },
                },
              ])
            }
          />
          <SignOutLink />
        </CloudFrame>
      );
    case 'ready':
      return api ? (
        <VaultContext.Provider value={api}>
          {children({ databaseName: phase.databaseName, dataKey: phase.dataKey })}
        </VaultContext.Provider>
      ) : null;
  }
}
