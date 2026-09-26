import { useEffect, useState } from 'react';
import * as Haptics from '@/lib/haptics';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { Image } from 'expo-image';
import { Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text, ThemeToggle } from '@/components/ui';
import { authErrorMessage } from '@/lib/auth/auth-errors';
import { useSessionStore } from '@/store/session-store';
import { useAppTheme } from '@/theme';

import { GoogleButton, Rise, TrustChip, Wordmark } from './auth-visuals';
import { GoogleAuthError, useGoogleAuth } from './use-google-auth';

/** images/auth light.jpg and auth dark.jpg: the "best algorithm ever written is book" art. */
const ART_LIGHT = require('../../../assets/images/onboarding/auth-light.jpg');
const ART_DARK = require('../../../assets/images/onboarding/auth-dark.jpg');

// Completes a pending browser sign-in when the app is reopened from the redirect (browser fallback, and web).
WebBrowser.maybeCompleteAuthSession();

/**
 * The sign-in screen, and the only way in: Continue with Google. The quote art
 * fills the page (light or dark with the theme, switchable with the sun/moon toggle). There are
 * no ClayHabbit passwords — Google proves who you are, Clerk keeps the
 * session, and the next screen asks where your data should live.
 */
export function AuthScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { signInWithGoogleAccount } = useGoogleAuth();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The browser fallback opens noticeably faster on Android with a warmed-up browser.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    WebBrowser.warmUpAsync().catch(() => {});
    return () => {
      WebBrowser.coolDownAsync().catch(() => {});
    };
  }, []);

  const continueWithGoogle = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogleAccount();
      useSessionStore.getState().showWelcome('signed-in');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (cause) {
      if (cause instanceof GoogleAuthError && cause.cancelled) return;
      setError(cause instanceof GoogleAuthError ? cause.message : authErrorMessage(cause));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  };

  const dark = theme.scheme === 'dark';

  return (
    <View style={[styles.screen, { backgroundColor: dark ? '#000000' : '#FBFCFE' }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Image
        source={dark ? ART_DARK : ART_LIGHT}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="top"
        transition={250}
        accessibilityLabel="The best algorithm ever written is a book."
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { minHeight: height, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Wordmark size={24} />
          <ThemeToggle />
        </View>

        <Rise
          order={2}
          style={[
            styles.panel,
            {
              backgroundColor: dark ? 'rgba(14, 16, 18, 0.74)' : 'rgba(255, 255, 255, 0.8)',
              borderColor: dark ? 'rgba(123, 189, 232, 0.22)' : 'rgba(189, 216, 233, 0.9)',
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          <View style={styles.copy}>
            <Text variant="headlineLarge" style={styles.center}>
              Welcome to ClayHabbit
            </Text>
            <Text variant="bodyMedium" color="textSecondary" style={styles.center}>
              Your habits, tasks, notes and money in one calm place.
            </Text>
          </View>

          <GoogleButton busy={busy} onPress={continueWithGoogle} />

          {error ? (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              style={[styles.message, { backgroundColor: theme.colors.errorMuted, borderRadius: theme.radii.md }]}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              <Icon name="alert-circle" size={16} color={theme.colors.error} />
              <Text variant="bodySmall" style={styles.flex}>
                {error}
              </Text>
            </Animated.View>
          ) : null}

          <View style={styles.chips}>
            <TrustChip icon="shield" label="No passwords" delay={650} />
            <TrustChip icon="wifi-off" label="Works offline" delay={720} />
            <TrustChip icon="lock" label="Encrypted backup" delay={790} />
          </View>

          <Text variant="caption" color="textSecondary" style={styles.center}>
            ClayHabbit only receives your name, email and photo from Google. Next, you choose whether your data stays
            on this phone or is backed up, encrypted, to your Google Drive.
          </Text>
        </Rise>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flex: {
    flex: 1,
  },
  center: {
    textAlign: 'center',
  },
  panel: {
    marginTop: 'auto',
    gap: 14,
    padding: 20,
    borderWidth: 1,
  },
  copy: {
    gap: 4,
  },
  message: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
});
