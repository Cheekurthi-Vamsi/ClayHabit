import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, Text } from '@/components/ui';
import {
  authenticateWithBiometrics,
  isBiometricAvailable,
  checkPin,
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
  const [waitUntil, setWaitUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  // Counts down a lockout after too many wrong PINs.
  useEffect(() => {
    if (waitUntil <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [waitUntil]);
  const secondsLeft = Math.max(0, Math.ceil((waitUntil - now) / 1000));

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
    const result = await checkPin(pin);
    if (result.ok) {
      setSessionUnlocked(true);
    } else {
      if (result.waitMs > 0) {
        setWaitUntil(Date.now() + result.waitMs);
        setNow(Date.now());
      }
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
        {secondsLeft > 0
          ? `Too many wrong PINs. Try again in ${secondsLeft}s.`
          : 'Enter your PIN to unlock ClayHabbit'}
      </Text>

      <View style={styles.padWrap} pointerEvents={secondsLeft > 0 ? 'none' : 'auto'}>
        <View style={{ opacity: secondsLeft > 0 ? 0.4 : 1 }}>
          <PinPad key={attempt} onComplete={handlePinComplete} error={error} />
        </View>
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
