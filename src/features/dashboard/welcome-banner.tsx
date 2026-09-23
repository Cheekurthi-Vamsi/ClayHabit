import { useEffect } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

import { Icon, Text } from '@/components/ui';
import { useAccount } from '@/features/auth/account-context';
import { useCloud } from '@/features/cloud/cloud-context';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useSessionStore, type WelcomeReason } from '@/store/session-store';
import { useSettingsStore } from '@/store/settings-store';
import { useAppTheme } from '@/theme';

const LOGO = require('../../../assets/images/logo-mark.png');

/** How long the greeting stays before tucking itself away. */
const VISIBLE_MS = 7000;

function subtitleFor(reason: WelcomeReason, cloudEmail: string | null): string {
  switch (reason) {
    case 'cloud-ready':
      return cloudEmail
        ? `Backups are on. Your data syncs, encrypted, to ${cloudEmail}'s Google Drive.`
        : 'Backups are on. Your data syncs, encrypted, to your Google Drive.';
    case 'device-ready':
      return 'Everything stays on this phone. You can turn on Google Drive backup in Settings.';
    case 'signed-in':
      return "You're signed in. Pick up right where you left off.";
  }
}

/**
 * A one-time greeting right after sign-in or storage setup. Raised through
 * the session store, so it shows once and never on later launches.
 */
export function WelcomeBanner() {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  const welcome = useSessionStore((state) => state.welcome);
  const clearWelcome = useSessionStore((state) => state.clearWelcome);
  const account = useAccount();
  const cloud = useCloud();
  const localName = useSettingsStore((state) => state.displayName);

  useEffect(() => {
    if (!welcome) return;
    const timer = setTimeout(clearWelcome, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [clearWelcome, welcome]);

  if (!welcome) return null;

  const name = (localName || account?.firstName || account?.fullName || '').split(/\s+/)[0];

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.springify().damping(16)}
      exiting={reduceMotion ? undefined : FadeOutUp.duration(220)}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.primaryMuted,
          borderColor: theme.colors.primary,
          borderRadius: theme.radii.lg,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Image source={LOGO} style={styles.logo} contentFit="contain" accessible={false} />
      <View style={styles.text}>
        <Text variant="titleLarge">{name ? `Welcome, ${name}!` : 'Welcome to ClayHabbit!'}</Text>
        <Text variant="bodySmall" color="textSecondary">
          {subtitleFor(welcome, cloud.account?.email ?? null)}
        </Text>
      </View>
      <Pressable onPress={clearWelcome} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss">
        <Icon name="x" size={18} color={theme.colors.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1.5,
  },
  logo: {
    width: 44,
    height: 44,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
