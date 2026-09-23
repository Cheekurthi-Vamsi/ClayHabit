import { resolveStorageMode, saveLocalStorageMode, type StorageMode, type StorageModeRemote } from '../storage-mode';

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => void store.set(key, value)),
    deleteItemAsync: jest.fn(async (key: string) => void store.delete(key)),
    __store: store,
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const secureStore = require('expo-secure-store') as { __store: Map<string, string> };

function remote(value: StorageMode | null | Error): StorageModeRemote & { read: jest.Mock } {
  return {
    read: jest.fn(async () => {
      if (value instanceof Error) throw value;
      return value;
    }),
    write: jest.fn(async () => {}),
  };
}

beforeEach(() => secureStore.__store.clear());

describe('resolveStorageMode', () => {
  it("asks when neither this phone nor the account has a choice", async () => {
    await expect(resolveStorageMode('user_a', remote(null))).resolves.toBeNull();
  });

  it("prefers this phone's answer and doesn't wait on the network for it", async () => {
    await saveLocalStorageMode('user_a', 'device');
    const account = remote('cloud');
    await expect(resolveStorageMode('user_a', account)).resolves.toBe('device');
    expect(account.read).not.toHaveBeenCalled();
  });

  it('restores a Cloud user on a new phone without asking, and remembers it', async () => {
    await expect(resolveStorageMode('user_a', remote('cloud'))).resolves.toBe('cloud');
    await expect(resolveStorageMode('user_a', remote(null))).resolves.toBe('cloud');
  });

  it("asks again on a new phone when the account chose phone-only elsewhere", async () => {
    await expect(resolveStorageMode('user_a', remote('device'))).resolves.toBeNull();
  });

  it('keeps accounts apart and survives an unreachable account', async () => {
    await saveLocalStorageMode('user_a', 'cloud');
    await expect(resolveStorageMode('user_b', remote(new Error('offline')))).resolves.toBeNull();
    await expect(resolveStorageMode('user_b', null)).resolves.toBeNull();
  });
});
