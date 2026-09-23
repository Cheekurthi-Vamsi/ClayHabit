import { useEffect, useState } from 'react';
import * as Haptics from '@/lib/haptics';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text } from '@/components/ui';
import { authErrorMessage } from '@/lib/auth/auth-errors';
import { useSessionStore } from '@/store/session-store';
import { useAppTheme } from '@/theme';

import { FloatingLogo, GoogleButton, Rise, SoftBackdrop, TrustChip, WelcomeIllustration, Wordmark } from './auth-visuals';
import { GoogleAuthError, useGoogleAuth } from './use-google-auth';

// Completes a pending browser sign-in when the app is reopened from the redirect (browser fallback, and web).
WebBrowser.maybeCompleteAuthSession();

/**
 * The welcome screen, and the only way in: Continue with Google. There are
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

  const compact = height < 720;

  return (
    <View style={styles.screen}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <SoftBackdrop />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + (compact ? 16 : 36), paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <FloatingLogo size={compact ? 72 : 92} />
          <Rise order={1}>
            <Wordmark size={compact ? 34 : 40} />
          </Rise>
          <Rise order={2}>
            <Text variant="bodyLarge" color="textSecondary" style={styles.center}>
              Plan · Focus · Achieve
            </Text>
          </Rise>
        </View>

        <Rise order={3} style={styles.copy}>
          <Text variant="displayMedium" style={styles.center}>
            A better you,{'\n'}one habit at a time.
          </Text>
          <Text variant="bodyLarge" color="textSecondary" style={styles.center}>
            Organise your tasks, track your progress, and build the life you want.
          </Text>
        </Rise>

        <Rise order={4} style={styles.art}>
          <WelcomeIllustration maxHeight={compact ? 150 : 210} />
        </Rise>

        <Rise order={5} style={styles.actions}>
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

          <Text variant="caption" color="textTertiary" style={styles.center}>
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
    paddingHorizontal: 24,
    gap: 18,
  },
  flex: {
    flex: 1,
  },
  center: {
    textAlign: 'center',
  },
  brand: {
    alignItems: 'center',
    gap: 4,
  },
  copy: {
    gap: 8,
  },
  art: {
    alignItems: 'center',
  },
  actions: {
    gap: 14,
    marginTop: 'auto',
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
