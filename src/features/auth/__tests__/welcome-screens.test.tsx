import { fireEvent, render, screen } from '@testing-library/react-native';

import { AuthScreen } from '../auth-screen';
import { GetStartedScreen } from '../get-started-screen';
import { StorageChoiceScreen } from '@/features/cloud/storage-choice-screen';
import { useSettingsStore } from '@/store/settings-store';
import { AppThemeProvider } from '@/theme';

/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factories must require */
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  warmUpAsync: jest.fn(async () => {}),
  coolDownAsync: jest.fn(async () => {}),
}));

/* eslint-enable @typescript-eslint/no-require-imports */

const mockSignIn = jest.fn(async () => {});
jest.mock('../use-google-auth', () => ({
  GoogleAuthError: class GoogleAuthError extends Error {
    cancelled = false;
  },
  useGoogleAuth: () => ({ signInWithGoogleAccount: mockSignIn }),
}));

describe('welcome screens', () => {
  it('signs in with Google only — no email or password fields', async () => {
    await render(
      <AppThemeProvider>
        <AuthScreen />
      </AppThemeProvider>,
    );

    expect(screen.getByText('ClayHabbit')).toBeTruthy();
    expect(screen.queryByLabelText('Email')).toBeNull();
    expect(screen.queryByLabelText('Password')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(mockSignIn).toHaveBeenCalledTimes(1);
  });

  it('offers Cloud or phone storage and reports the choice', async () => {
    const onChoose = jest.fn(async () => {});
    await render(
      <AppThemeProvider>
        <StorageChoiceScreen onChoose={onChoose} />
      </AppThemeProvider>,
    );

    await fireEvent.press(screen.getByRole('radio', { name: /Keep it on this phone/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Keep on this phone' }));
    expect(onChoose).toHaveBeenCalledWith('device');

    await fireEvent.press(screen.getByRole('radio', { name: /Save to my Google Drive/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Connect Google Drive' }));
    expect(onChoose).toHaveBeenLastCalledWith('cloud');
  });

  it('Get Started uses our button and continues on', async () => {
    const onContinue = jest.fn();
    await render(
      <AppThemeProvider>
        <GetStartedScreen onContinue={onContinue} />
      </AppThemeProvider>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Get Started' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('switches between light and dark from the sign-in screen', async () => {
    useSettingsStore.setState({ themePreference: 'light' });
    await render(
      <AppThemeProvider>
        <AuthScreen />
      </AppThemeProvider>,
    );

    expect(screen.getByRole('radio', { name: 'Light mode' }).props.accessibilityState.selected).toBe(true);
    await fireEvent.press(screen.getByRole('radio', { name: 'Dark mode' }));
    expect(useSettingsStore.getState().themePreference).toBe('dark');
    expect(screen.getByRole('radio', { name: 'Dark mode' }).props.accessibilityState.selected).toBe(true);
  });
});
