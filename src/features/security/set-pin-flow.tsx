import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, Text } from '@/components/ui';
import { setPin } from '@/lib/security/app-lock-service';
import { useAppLockStore } from '@/store/app-lock-store';
import { useSettingsStore } from '@/store/settings-store';
import { useAppTheme } from '@/theme';

import { PinPad } from './pin-pad';

export function SetPinFlow() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const setAppLockEnabled = useSettingsStore((state) => state.setAppLockEnabled);
  const setSessionUnlocked = useAppLockStore((state) => state.setSessionUnlocked);

  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const handleComplete = async (pin: string) => {
    if (!firstPin) {
      setFirstPin(pin);
      return;
    }

    if (pin !== firstPin) {
      setError(true);
      setFirstPin(null);
      setAttempt((prev) => prev + 1);
      setTimeout(() => setError(false), 400);
      return;
    }

    await setPin(pin);
    setAppLockEnabled(true);
    setSessionUnlocked(true);
    router.back();
  };

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

      <Text variant="displayMedium" style={styles.title}>
        {firstPin ? 'Confirm your PIN' : 'Create a PIN'}
      </Text>

      <View style={styles.padWrap}>
        <PinPad
          key={`${firstPin ? 'confirm' : 'first'}-${attempt}`}
          onComplete={handleComplete}
          error={error}
          subtitle={error ? "PINs didn't match — try again" : undefined}
        />
      </View>
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
