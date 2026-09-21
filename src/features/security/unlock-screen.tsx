import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, Text } from '@/components/ui';
import {
  authenticateWithBiometrics,
  isBiometricAvailable,
  verifyPin,
} from '@/lib/security/app-lock-service';
import { useAppLockStore } from '@/store/app-lock-store';
import { useSettingsStore } from '@/store/settings-store';
import { useAppTheme } from '@/theme';

import { PinPad } from './pin-pad';

export function UnlockScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const biometricEnabled = useSettingsStore((state) => state.biometricEnabled);
  const setSessionUnlocked = useAppLockStore((state) => state.setSessionUnlocked);

  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    isBiometricAvailable().then((available) => {
      if (cancelled) return;
      setBiometricAvailable(available);
      if (available && biometricEnabled) {
        authenticateWithBiometrics().then((success) => {
          if (success && !cancelled) setSessionUnlocked(true);
        });
      }
    });

    return () => {
      cancelled = true;
    };
    // Only run once per mount of the lock screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePinComplete = async (pin: string) => {
    const valid = await verifyPin(pin);
    if (valid) {
      setSessionUnlocked(true);
    } else {
      setError(true);
      setAttempt((prev) => prev + 1);
      setTimeout(() => setError(false), 400);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top + theme.spacing.huge },
      ]}
    >
      <Text variant="displayMedium">Welcome back</Text>
      <Text variant="bodyMedium" color="textSecondary" style={styles.subtitle}>
        Enter your PIN to unlock ClayHabit
      </Text>

      <View style={styles.padWrap}>
        <PinPad key={attempt} onComplete={handlePinComplete} error={error} />
      </View>

      {biometricAvailable && biometricEnabled && (
        <IconButton
          name="smartphone"
          variant="muted"
          size={52}
          accessibilityLabel="Use biometrics"
          onPress={async () => {
            const success = await authenticateWithBiometrics();
            if (success) setSessionUnlocked(true);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 20,
  },
  subtitle: {
    textAlign: 'center',
  },
  padWrap: {
    marginTop: 16,
  },
});
