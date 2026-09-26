import { useAuth } from '@clerk/expo';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Icon, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { FloatingLogo, GoogleButton, SoftBackdrop } from '@/features/auth/auth-visuals';
import { forgetLastUser } from '@/lib/auth/account-database';
import { authEnabled } from '@/lib/auth/config';
import type { RemoteSummary } from '@/lib/cloud/sync-engine';
import { useAppTheme } from '@/theme';

/** Hero + sheet, matching the sign-in screen, for every step before the app opens. */
export function CloudFrame({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <SoftBackdrop />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.hero, { paddingTop: insets.top + 28 }]}>
          <View style={styles.markRow}>
            <FloatingLogo size={52} />
            <View style={[styles.mark, { backgroundColor: theme.colors.primaryMuted }]}>
              <Icon name={icon} size={22} color={theme.colors.primary} />
            </View>
          </View>
          <Text variant="displayMedium" accessibilityRole="header">
            {title}
          </Text>
          <Text variant="bodyMedium" color="textSecondary">
            {subtitle}
          </Text>
        </View>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.backgroundElevated,
              borderRadius: theme.radii.xl,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Point({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.point}>
      <View style={[styles.pointIcon, { backgroundColor: theme.colors.primaryMuted, borderRadius: theme.radii.sm }]}>
        <Icon name={icon} size={16} color={theme.colors.primary} />
      </View>
      <View style={styles.flex}>
        <Text variant="labelLarge">{title}</Text>
        <Text variant="bodySmall" color="textSecondary">
          {body}
        </Text>
      </View>
    </View>
  );
}

export function ErrorNote({ message }: { message: string | null | undefined }) {
  const theme = useAppTheme();
  if (!message) return null;
  return (
    <View style={[styles.note, { backgroundColor: theme.colors.errorMuted, borderRadius: theme.radii.md }]}>
      <Icon name="alert-circle" size={16} color={theme.colors.error} />
      <Text variant="bodySmall" style={[styles.flex, { color: theme.colors.textPrimary }]}>
        {message}
      </Text>
    </View>
  );
}

/** Signs out of ClayHabbit from a gate screen, e.g. to use a different account. Clerk only. */
function ClerkSignOutLink() {
  const { signOut } = useAuth();
  return (
    <Button
      label="Use a different ClayHabbit account"
      variant="ghost"
      size="sm"
      onPress={async () => {
        await forgetLastUser().catch(() => {});
        await signOut().catch(() => {});
      }}
    />
  );
}

export function SignOutLink() {
  return authEnabled ? <ClerkSignOutLink /> : null;
}

export function ConnectCloudScreen({
  error,
  busy,
  onConnect,
  onUseDevice,
}: {
  error?: string | null;
  busy: boolean;
  onConnect: () => void;
  /** Gives up on the Cloud for now and keeps the data on this phone. */
  onUseDevice?: () => void;
}) {
  return (
    <CloudFrame
      icon="cloud"
      title="Connect your Cloud"
      subtitle="ClayHabbit keeps your tasks, notes, habits and money in your own Google Drive, encrypted."
    >
      <View style={styles.points}>
        <Point
          icon="lock"
          title="Encrypted before it leaves your phone"
          body="AES-256-GCM encryption, with a SHA-256 check that nothing was changed on the way."
        />
        <Point
          icon="hard-drive"
          title="Stored in your Google Drive"
          body="In a private app folder only ClayHabbit can open. It can't see anything else in your Drive."
        />
        <Point
          icon="refresh-cw"
          title="Back on every phone you sign in to"
          body="Sign in, connect, and everything is restored. It keeps working offline and syncs when you're back."
        />
      </View>

      <ErrorNote message={error} />

      <GoogleButton label="Connect Google Drive" busyLabel="Connecting…" busy={busy} onPress={onConnect} />
      <Text variant="caption" color="textTertiary" style={styles.centered}>
        Google will ask to let ClayHabbit &quot;see, create, and delete its own configuration data in your Google
        Drive&quot;. That is the app folder, nothing more.
      </Text>
      {onUseDevice ? (
        <Button
          label="Keep my data on this phone instead"
          icon="smartphone"
          variant="ghost"
          size="sm"
          fullWidth
          disabled={busy}
          onPress={onUseDevice}
        />
      ) : null}
      <SignOutLink />
    </CloudFrame>
  );
}

export function CloudWorkingScreen({ message }: { message: string }) {
  const theme = useAppTheme();
  return (
    <CloudFrame icon="cloud" title="Your Cloud" subtitle="Hang tight — this only takes a moment.">
      <View style={styles.working}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="bodyLarge" style={styles.centered}>
          {message}
        </Text>
      </View>
    </CloudFrame>
  );
}

function formatSavedAt(summary: RemoteSummary | null): string {
  if (!summary?.savedAt) return 'Saved earlier';
  const date = new Date(summary.savedAt);
  const when = `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  return summary.device ? `Saved ${when} from ${summary.device}` : `Saved ${when}`;
}

/** First connection on a phone that already has data, while the Cloud has data too. */
export function ChooseCopyScreen({
  remote,
  busy,
  onChoose,
}: {
  remote: RemoteSummary;
  busy: boolean;
  onChoose: (prefer: 'local' | 'remote') => void;
}) {
  const theme = useAppTheme();

  const keepPhone = () =>
    Alert.alert(
      'Replace your Cloud copy?',
      "Your Cloud copy will be replaced with what's on this phone. Anything only in the Cloud will be lost.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace Cloud copy', style: 'destructive', onPress: () => onChoose('local') },
      ],
    );

  return (
    <CloudFrame
      icon="git-merge"
      title="Two versions found"
      subtitle="This phone already has data, and so does your Cloud. Which one should ClayHabbit keep?"
    >
      <Card style={styles.choice}>
        <View style={styles.choiceHead}>
          <Icon name="download-cloud" size={18} color={theme.colors.primary} />
          <Text variant="titleMedium">Use my Cloud copy</Text>
        </View>
        <Text variant="bodySmall" color="textSecondary">
          {formatSavedAt(remote)}. It replaces what&apos;s on this phone. Recommended if you&apos;ve used ClayHabbit on
          another phone.
        </Text>
        <Button label="Use Cloud copy" icon="download-cloud" loading={busy} onPress={() => onChoose('remote')} />
      </Card>
      <Card style={styles.choice}>
        <View style={styles.choiceHead}>
          <Icon name="smartphone" size={18} color={theme.colors.textSecondary} />
          <Text variant="titleMedium">Keep this phone&apos;s data</Text>
        </View>
        <Text variant="bodySmall" color="textSecondary">
          Uploads this phone&apos;s data and replaces the Cloud copy.
        </Text>
        <Button label="Keep this phone's data" variant="outline" disabled={busy} onPress={keepPhone} />
      </Card>
    </CloudFrame>
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
    paddingBottom: 20,
    gap: 8,
  },
  markRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  mark: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    marginHorizontal: 16,
    padding: 20,
    gap: 16,
    borderWidth: 1,
  },
  points: {
    gap: 16,
  },
  point: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  pointIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  centered: {
    textAlign: 'center',
  },
  working: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 40,
  },
  choice: {
    gap: 10,
  },
  choiceHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  field: {
    gap: 6,
  },
  keyInput: {
    minHeight: 84,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
});
