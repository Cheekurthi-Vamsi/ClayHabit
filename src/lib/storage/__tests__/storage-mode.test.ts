import { loadLocalStorageMode, saveLocalStorageMode } from '../storage-mode';

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

beforeEach(() => secureStore.__store.clear());

describe('storage mode (kept on this phone only)', () => {
  it('asks when this phone has no choice yet', async () => {
    await expect(loadLocalStorageMode('user_a')).resolves.toBeNull();
  });

  it('remembers the choice per account', async () => {
    await saveLocalStorageMode('user_a', 'cloud');
    await saveLocalStorageMode('user_b', 'device');
    await expect(loadLocalStorageMode('user_a')).resolves.toBe('cloud');
    await expect(loadLocalStorageMode('user_b')).resolves.toBe('device');
  });

  it('ignores anything that is not a known mode', async () => {
    secureStore.__store.set('clayhabit.storage.mode.user_a', 'everywhere');
    await expect(loadLocalStorageMode('user_a')).resolves.toBeNull();
  });
});
