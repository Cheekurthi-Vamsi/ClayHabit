import { useEffect, useState } from 'react';
import { useSignIn, useSignUp } from '@clerk/expo';
import { useSSO } from '@clerk/expo/experimental';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Button, DecorativeOrbs, Icon, Text } from '@/components/ui';
import { authErrorMessage, isValidEmail } from '@/lib/auth/auth-errors';
import { fontFamily, useAppTheme } from '@/theme';

// Completes a pending browser sign-in when the app is reopened from the redirect (needed on web).
WebBrowser.maybeCompleteAuthSession();

type Mode = 'sign-in' | 'sign-up' | 'verify-sign-up' | 'verify-sign-in' | 'reset-request' | 'reset-verify';

const MIN_PASSWORD = 8;

function Field({
  label,
  secure,
  ...input
}: TextInputProps & { label: string; secure?: boolean }) {
  const theme = useAppTheme();
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.field}>
      <Text variant="labelMedium" color="textSecondary">
        {label}
      </Text>
      <View style={[styles.inputWrap, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md }]}>
        <TextInput
          {...input}
          secureTextEntry={secure ? hidden : false}
          placeholderTextColor={theme.colors.textTertiary}
          accessibilityLabel={label}
          style={[styles.input, theme.typography.bodyLarge, { color: theme.colors.textPrimary }]}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden((value) => !value)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Icon name={hidden ? 'eye' : 'eye-off'} size={18} color={theme.colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function CodeField({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const theme = useAppTheme();
  return (
    <TextInput
      value={value}
      onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, 6))}
      keyboardType="number-pad"
      textContentType="oneTimeCode"
      autoComplete="one-time-code"
      maxLength={6}
      autoFocus
      placeholder="••••••"
      placeholderTextColor={theme.colors.textTertiary}
      accessibilityLabel="Verification code"
      style={[
        styles.code,
        { color: theme.colors.textPrimary, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md },
      ]}
    />
  );
}

/** Google's "G" mark, drawn locally (brand asset, used as Google's sign-in guidelines allow). */
function GoogleMark() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48" accessible={false}>
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </Svg>
  );
}

const TITLES: Record<Mode, { title: string; subtitle: string }> = {
  'sign-in': { title: 'Welcome back', subtitle: 'Sign in to your tasks, habits and money.' },
  'sign-up': { title: 'Create your account', subtitle: 'One account for your whole ClayHabit.' },
  'verify-sign-up': { title: 'Check your email', subtitle: 'Enter the 6-digit code we just sent.' },
  'verify-sign-in': { title: 'Confirm it’s you', subtitle: 'Enter the 6-digit code to finish signing in.' },
  'reset-request': { title: 'Reset your password', subtitle: 'We’ll email you a code to set a new one.' },
  'reset-verify': { title: 'Choose a new password', subtitle: 'Enter the code from your email and a new password.' },
};

export function AuthScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { startSSOFlow } = useSSO();

  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [secondFactor, setSecondFactor] = useState<'email_code' | 'totp'>('email_code');
  const [busy, setBusy] = useState<'form' | 'google' | 'resend' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Android opens the Google sign-in sheet noticeably faster with a warmed-up browser.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    WebBrowser.warmUpAsync().catch(() => {});
    return () => {
      WebBrowser.coolDownAsync().catch(() => {});
    };
  }, []);

  const go = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setCode('');
  };

  /** Runs one auth step; a returned string is shown as the error. */
  const run = async (kind: 'form' | 'google' | 'resend', step: () => Promise<string | null | void>) => {
    if (busy) return;
    setBusy(kind);
    setError(null);
    try {
      const message = await step();
      if (message) {
        setError(message);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (cause) {
      setError(authErrorMessage(cause));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(null);
    }
  };

  const finishSignIn = async (): Promise<string | null> => {
    const { error: finalizeError } = await signIn.finalize();
    return finalizeError ? authErrorMessage(finalizeError) : null;
  };

  /** After a password or reset step, move on to whatever the sign-in still needs. */
  const continueSignIn = async (): Promise<string | null> => {
    if (signIn.status === 'complete') return finishSignIn();

    if (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor') {
      const strategies = signIn.supportedSecondFactors.map((factor) => factor.strategy);
      if (signIn.status === 'needs_client_trust' || strategies.includes('email_code')) {
        const { error: sendError } = await signIn.mfa.sendEmailCode();
        if (sendError) return authErrorMessage(sendError);
        setSecondFactor('email_code');
        go('verify-sign-in');
        return null;
      }
      if (strategies.includes('totp')) {
        setSecondFactor('totp');
        go('verify-sign-in');
        return null;
      }
    }
    return 'This account needs a sign-in step ClayHabit doesn’t support yet. Try Continue with Google.';
  };

  const submit = () => {
    switch (mode) {
      case 'sign-in':
        return run('form', async () => {
          if (!isValidEmail(email)) return 'Enter a valid email address.';
          if (!password) return 'Enter your password.';
          const { error: passwordError } = await signIn.password({ emailAddress: email.trim(), password });
          if (passwordError) return authErrorMessage(passwordError);
          return continueSignIn();
        });

      case 'sign-up':
        return run('form', async () => {
          if (!isValidEmail(email)) return 'Enter a valid email address.';
          if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters for your password.`;
          const { error: createError } = await signUp.password({ emailAddress: email.trim(), password });
          if (createError) return authErrorMessage(createError);
          const { error: sendError } = await signUp.verifications.sendEmailCode();
          if (sendError) return authErrorMessage(sendError);
          go('verify-sign-up');
          return null;
        });

      case 'verify-sign-up':
        return run('form', async () => {
          if (code.length !== 6) return 'Enter the 6-digit code.';
          const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code });
          if (verifyError) return authErrorMessage(verifyError);
          if (signUp.status !== 'complete') {
            return `Your Clerk app asks for more details (${signUp.missingFields.join(', ')}). Turn those off in the Clerk dashboard, or use Google.`;
          }
          const { error: finalizeError } = await signUp.finalize();
          return finalizeError ? authErrorMessage(finalizeError) : null;
        });

      case 'verify-sign-in':
        return run('form', async () => {
          if (code.length !== 6) return 'Enter the 6-digit code.';
          const { error: verifyError } =
            secondFactor === 'totp' ? await signIn.mfa.verifyTOTP({ code }) : await signIn.mfa.verifyEmailCode({ code });
          if (verifyError) return authErrorMessage(verifyError);
          return signIn.status === 'complete' ? finishSignIn() : continueSignIn();
        });

      case 'reset-request':
        return run('form', async () => {
          if (!isValidEmail(email)) return 'Enter the email you signed up with.';
          const { error: createError } = await signIn.create({ identifier: email.trim() });
          if (createError) return authErrorMessage(createError);
          const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
          if (sendError) return authErrorMessage(sendError);
          go('reset-verify');
          return null;
        });

      case 'reset-verify':
        return run('form', async () => {
          if (code.length !== 6) return 'Enter the 6-digit code.';
          if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters for your new password.`;
          const { error: verifyError } = await signIn.resetPasswordEmailCode.verifyCode({ code });
          if (verifyError) return authErrorMessage(verifyError);
          const { error: submitError } = await signIn.resetPasswordEmailCode.submitPassword({ password });
          if (submitError) return authErrorMessage(submitError);
          return continueSignIn();
        });
    }
  };

  const resend = () =>
    run('resend', async () => {
      const { error: sendError } =
        mode === 'verify-sign-up'
          ? await signUp.verifications.sendEmailCode()
          : mode === 'reset-verify'
            ? await signIn.resetPasswordEmailCode.sendCode()
            : await signIn.mfa.sendEmailCode();
      if (sendError) return authErrorMessage(sendError);
      setNotice('A new code is on its way.');
      return null;
    });

  const google = () =>
    run('google', async () => {
      // Completed sessions are activated by the hook; a cancelled sheet simply returns.
      await startSSOFlow({ strategy: 'oauth_google' });
      return null;
    });

  const { title, subtitle } = TITLES[mode];
  const entry = mode === 'sign-in' || mode === 'sign-up';
  const verifying = mode === 'verify-sign-up' || mode === 'verify-sign-in' || mode === 'reset-verify';
  const canResend = verifying && !(mode === 'verify-sign-in' && secondFactor === 'totp');

  const primaryLabel: Record<Mode, string> = {
    'sign-in': 'Sign in',
    'sign-up': 'Create account',
    'verify-sign-up': 'Verify email',
    'verify-sign-in': 'Continue',
    'reset-request': 'Send code',
    'reset-verify': 'Set new password',
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={theme.gradients.aurora}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 36 }]}
        >
          <DecorativeOrbs pattern="glow" />
          <View style={styles.mark}>
            <Icon name="check" size={26} color="#FFFFFF" />
          </View>
          <Text style={styles.brand} accessibilityRole="header">
            ClayHabit
          </Text>
          <Text variant="bodyMedium" style={styles.tagline}>
            Your day and your money, in one calm place.
          </Text>
        </LinearGradient>

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.backgroundElevated,
              borderTopLeftRadius: theme.radii.xl,
              borderTopRightRadius: theme.radii.xl,
            },
          ]}
        >
          {!entry ? (
            <Pressable
              onPress={() => go(mode === 'verify-sign-up' ? 'sign-up' : 'sign-in')}
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={10}
              style={styles.back}
            >
              <Icon name="arrow-left" size={18} color={theme.colors.textSecondary} />
              <Text variant="labelLarge" color="textSecondary">
                Back
              </Text>
            </Pressable>
          ) : null}

          <View style={styles.titles}>
            <Text variant="headlineLarge">{title}</Text>
            <Text variant="bodyMedium" color="textSecondary">
              {verifying && mode !== 'verify-sign-in' ? `${subtitle} ${email.trim()}` : subtitle}
            </Text>
          </View>

          {entry ? (
            <>
              <Pressable
                onPress={google}
                disabled={busy !== null}
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
                style={({ pressed }) => [
                  styles.google,
                  {
                    borderColor: theme.colors.borderStrong,
                    borderRadius: theme.radii.xl,
                    backgroundColor: pressed ? theme.colors.surfacePressed : theme.colors.surface,
                    opacity: busy && busy !== 'google' ? 0.6 : 1,
                  },
                ]}
              >
                <GoogleMark />
                <Text variant="labelLarge">{busy === 'google' ? 'Opening Google…' : 'Continue with Google'}</Text>
              </Pressable>
              <View style={styles.divider}>
                <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />
                <Text variant="caption" color="textTertiary">
                  or with email
                </Text>
                <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />
              </View>
            </>
          ) : null}

          {mode === 'sign-in' || mode === 'sign-up' || mode === 'reset-request' ? (
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType={mode === 'reset-request' ? 'send' : 'next'}
              onSubmitEditing={mode === 'reset-request' ? submit : undefined}
            />
          ) : null}

          {verifying ? <CodeField value={code} onChange={setCode} /> : null}

          {mode === 'sign-in' || mode === 'sign-up' || mode === 'reset-verify' ? (
            <Field
              label={mode === 'reset-verify' ? 'New password' : 'Password'}
              secure
              value={password}
              onChangeText={setPassword}
              placeholder={mode === 'sign-in' ? 'Your password' : `At least ${MIN_PASSWORD} characters`}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              textContentType={mode === 'sign-in' ? 'password' : 'newPassword'}
              returnKeyType="go"
              onSubmitEditing={submit}
            />
          ) : null}

          {mode === 'sign-in' ? (
            <Pressable onPress={() => go('reset-request')} accessibilityRole="button" hitSlop={8} style={styles.forgot}>
              <Text variant="labelLarge" color="primary">
                Forgot password?
              </Text>
            </Pressable>
          ) : null}

          {error ? (
            <View
              style={[styles.message, { backgroundColor: theme.colors.errorMuted, borderRadius: theme.radii.md }]}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              <Icon name="alert-circle" size={16} color={theme.colors.error} />
              <Text variant="bodySmall" style={styles.flex}>
                {error}
              </Text>
            </View>
          ) : notice ? (
            <View
              style={[styles.message, { backgroundColor: theme.colors.successMuted, borderRadius: theme.radii.md }]}
              accessibilityLiveRegion="polite"
            >
              <Icon name="check-circle" size={16} color={theme.colors.success} />
              <Text variant="bodySmall" style={styles.flex}>
                {notice}
              </Text>
            </View>
          ) : null}

          <Button
            label={primaryLabel[mode]}
            fullWidth
            gradient={theme.gradients.aurora}
            loading={busy === 'form'}
            disabled={busy !== null && busy !== 'form'}
            onPress={submit}
          />

          {canResend ? (
            <Pressable onPress={resend} disabled={busy !== null} accessibilityRole="button" style={styles.center}>
              <Text variant="labelLarge" color="primary">
                {busy === 'resend' ? 'Sending…' : 'Send a new code'}
              </Text>
            </Pressable>
          ) : null}

          {entry ? (
            <Pressable
              onPress={() => go(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
              accessibilityRole="button"
              style={styles.center}
            >
              <Text variant="bodyMedium" color="textSecondary">
                {mode === 'sign-in' ? 'New to ClayHabit? ' : 'Already have an account? '}
                <Text variant="labelLarge" color="primary">
                  {mode === 'sign-in' ? 'Create an account' : 'Sign in'}
                </Text>
              </Text>
            </Pressable>
          ) : null}

          <Text variant="caption" color="textTertiary" style={styles.fineprint}>
            Your tasks, notes and finances stay on this device. Your account keeps them separate from anyone
            else who signs in here.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  flex: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: 24,
    paddingBottom: 56,
    gap: 8,
    overflow: 'hidden',
  },
  mark: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  brand: {
    color: '#FFFFFF',
    fontFamily: fontFamily.extraBold,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -0.8,
  },
  tagline: {
    color: 'rgba(255,255,255,0.92)',
  },
  sheet: {
    flexGrow: 1,
    marginTop: -28,
    paddingHorizontal: 24,
    paddingTop: 26,
    gap: 16,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  titles: {
    gap: 4,
  },
  google: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderWidth: StyleSheet.hairlineWidth,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  field: {
    gap: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
  },
  code: {
    fontFamily: fontFamily.bold,
    fontSize: 30,
    letterSpacing: 12,
    textAlign: 'center',
    paddingVertical: 14,
  },
  forgot: {
    alignSelf: 'flex-end',
    marginTop: -6,
  },
  message: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
  },
  center: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  fineprint: {
    textAlign: 'center',
    marginTop: 'auto',
    paddingTop: 12,
  },
});
