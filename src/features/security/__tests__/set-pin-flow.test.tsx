import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { SetPinFlow } from '../set-pin-flow';
import { useSettingsStore } from '@/store/settings-store';
import { AppThemeProvider } from '@/theme';

/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factories must require */
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
/* eslint-enable @typescript-eslint/no-require-imports */

const mockParams: { mode?: string } = {};
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));

const mockCheckPin = jest.fn();
const mockClearPin = jest.fn(async () => {});
const mockSetPin = jest.fn(async (_pin: string) => {});
jest.mock('@/lib/security/app-lock-service', () => ({
  hasPin: jest.fn(async () => true),
  checkPin: (...args: unknown[]) => mockCheckPin(...args),
  clearPin: () => mockClearPin(),
  setPin: (pin: string) => mockSetPin(pin),
}));

async function typePin(pin: string) {
  for (const digit of pin) {
    await fireEvent.press(screen.getByRole('button', { name: digit }));
  }
}

async function renderFlow() {
  await render(
    <AppThemeProvider>
      <SetPinFlow />
    </AppThemeProvider>,
  );
  await waitFor(() => expect(screen.getByRole('header')).toBeTruthy());
}

describe('SetPinFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete mockParams.mode;
    useSettingsStore.setState({ appLockEnabled: true });
  });

  it('will not turn App Lock off with a wrong PIN', async () => {
    mockParams.mode = 'disable';
    mockCheckPin.mockResolvedValue({ ok: false, waitMs: 0 });
    await renderFlow();

    expect(screen.getByText('Enter your PIN to turn off App Lock')).toBeTruthy();
    await typePin('0000');
    await waitFor(() => expect(mockCheckPin).toHaveBeenCalledWith('0000'));
    expect(mockClearPin).not.toHaveBeenCalled();
    expect(useSettingsStore.getState().appLockEnabled).toBe(true);
  });

  it('turns App Lock off only after the current PIN', async () => {
    mockParams.mode = 'disable';
    mockCheckPin.mockResolvedValue({ ok: true });
    await renderFlow();

    await typePin('1234');
    await waitFor(() => expect(mockClearPin).toHaveBeenCalled());
    expect(useSettingsStore.getState().appLockEnabled).toBe(false);
  });

  it('asks for the current PIN before a new one can be set', async () => {
    mockCheckPin.mockResolvedValue({ ok: true });
    await renderFlow();

    expect(screen.getByText('Enter your current PIN')).toBeTruthy();
    await typePin('1234');
    await waitFor(() => expect(screen.getByText('Create a PIN')).toBeTruthy());
    expect(mockSetPin).not.toHaveBeenCalled();
  });
});
