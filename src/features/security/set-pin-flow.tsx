import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, Text } from '@/components/ui';
import { checkPin, clearPin, hasPin, setPin } from '@/lib/security/app-lock-service';
import { useAppLockStore } from '@/store/app-lock-store';
import { useSettingsStore } from '@/store/settings-store';
import { useAppTheme } from '@/theme';

import { PinPad } from './pin-pad';

type Step = 'loading' | 'verify' | 'create' | 'confirm';

/**
 * Creates, changes or removes the App Lock PIN. When a PIN already exists it
 * must be entered first (with the unlock screen's lockout), so neither a
 * borrowed, unlocked phone nor an outside `clayhabit://security/set-pin`
 * link can change or remove it. `?mode=disable` turns App Lock off after
 * that check.
 */
export function SetPinFlow() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const disabling = mode === 'disable';
  const setAppLockEnabled = useSettingsStore((state) => state.setAppLockEnabled);
  const setBiometricEnabled = useSettingsStore((state) => state.setBiometricEnabled);
  const setSessionUnlocked = useAppLockStore((state) => state.setSessionUnlocked);

  const [step, setStep] = useState<Step>('loading');
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    hasPin().then((exists) => {
      if (cancelled) return;
      if (!exists && disabling) {
        router.back();
        return;
      }
      // Only decides the first step; a re-run (the router object can change) must not reset progress.
      setStep((current) => (current === 'loading' ? (exists ? 'verify' : 'create') : current));
    });
    return () => {
      cancelled = true;
    };
  }, [disabling, router]);

  const fail = (message: string) => {
    setError(message);
    setAttempt((prev) => prev + 1);
  };

  const handleComplete = async (pin: string) => {
    setError(null);
    if (step === 'verify') {
      const result = await checkPin(pin);
      if (!result.ok) {
        fail(
          result.waitMs > 0
            ? `Too many tries. Wait ${Math.ceil(result.waitMs / 1000)} s and try again.`
            : 'That’s not your current PIN.',
        );
        return;
      }
      if (disabling) {
        await clearPin();
        setAppLockEnabled(false);
        setBiometricEnabled(false);
        setSessionUnlocked(true);
        router.back();
        return;
      }
      setAttempt((prev) => prev + 1);
      setStep('create');
      return;
    }

    if (step === 'create') {
      setFirstPin(pin);
      setStep('confirm');
      return;
    }

    if (pin !== firstPin) {
      setFirstPin(null);
      setStep('create');
      fail("PINs didn't match — try again");
      return;
    }

    await setPin(pin);
    setAppLockEnabled(true);
    setSessionUnlocked(true);
    router.back();
  };

  const title =
    step === 'verify'
      ? disabling
        ? 'Enter your PIN to turn off App Lock'
        : 'Enter your current PIN'
      : step === 'confirm'
        ? 'Confirm your PIN'
        : 'Create a PIN';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top + theme.spacing.xxl },
      ]}
    >
      <View style={styles.headerRow}>
        <IconButton name="arrow-left" variant="ghost" accessibilityLabel="Cancel" onPress={() => router.back()} />
      </View>

      {step === 'loading' ? null : (
        <>
          <Text variant="displayMedium" style={styles.title} accessibilityRole="header">
            {title}
          </Text>

          <View style={styles.padWrap}>
            <PinPad
              key={`${step}-${attempt}`}
              onComplete={handleComplete}
              error={error !== null}
              subtitle={error ?? undefined}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  headerRow: {
    alignSelf: 'flex-start',
  },
  title: {
    textAlign: 'center',
  },
  padWrap: {
    marginTop: 24,
  },
});
