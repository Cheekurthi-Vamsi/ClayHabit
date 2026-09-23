import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Icon, IconButton, Text, type IconName } from '@/components/ui';
import { CloudSettingsSection } from '@/features/cloud/cloud-settings-section';
import { FinanceSettingsSection } from '@/features/finance/settings/finance-settings-section';
import { SecuritySection } from '@/features/security/security-section';
import { useAppTheme } from '@/theme';

import { AppearanceSection } from './appearance-section';
import {
  AboutSection,
  DataSection,
  FeelSection,
  FocusPreferencesSection,
  NotesPreferencesSection,
} from './preference-sections';
import { ProfileSection } from './profile-section';

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={{ gap: theme.spacing.md }}>
      <View style={styles.sectionHead}>
        <Text variant="labelLarge" color="textSecondary" accessibilityRole="header">
          {title}
        </Text>
        {hint ? (
          <Text variant="caption" color="textTertiary">
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function LinkRow({ label, icon, onPress }: { label: string; icon: IconName; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Card onPress={onPress} accessibilityLabel={label}>
      <View style={styles.linkRow}>
        <View style={styles.linkLeft}>
          <Icon name={icon} size={18} color={theme.colors.primary} />
          <Text variant="bodyLarge">{label}</Text>
        </View>
        <Icon name="chevron-right" size={18} color={theme.colors.textTertiary} />
      </View>
    </Card>
  );
}

export function SettingsScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + theme.spacing.sm, paddingBottom: insets.bottom + theme.spacing.huge },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={styles.backButton}>
          <IconButton name="arrow-left" variant="ghost" accessibilityLabel="Back" onPress={() => router.back()} />
        </View>
        <Text variant="displayMedium">Settings</Text>
      </View>

      <Section title="PROFILE">
        <ProfileSection />
      </Section>

      <Section title="CLOUD" hint="Where your data lives, encrypted.">
        <CloudSettingsSection />
      </Section>

      <Section title="APPEARANCE">
        <AppearanceSection />
        <FeelSection />
      </Section>

      <Section title="NOTES">
        <NotesPreferencesSection />
      </Section>

      <Section title="FOCUS">
        <FocusPreferencesSection />
      </Section>

      <Section title="FINANCE">
        <FinanceSettingsSection />
      </Section>

      <Section title="SECURITY">
        <SecuritySection />
      </Section>

      <Section title="DATA & STORAGE">
        <DataSection />
      </Section>

      <Section title="MORE">
        <LinkRow label="Habits" icon="repeat" onPress={() => router.push('/habits')} />
        <LinkRow label="Calendar" icon="calendar" onPress={() => router.push('/calendar')} />
        <LinkRow label="Goals" icon="target" onPress={() => router.push('/goal')} />
        <LinkRow label="Focus timer" icon="clock" onPress={() => router.push('/focus')} />
        <LinkRow label="Archived notes" icon="archive" onPress={() => router.push('/note/archive')} />
        <LinkRow label="Deleted notes" icon="trash-2" onPress={() => router.push('/note/trash')} />
      </Section>

      <Section title="ABOUT">
        <AboutSection />
      </Section>

      {__DEV__ ? (
        <Section title="DEVELOPER">
          <LinkRow label="Design system showcase" icon="layout" onPress={() => router.push('/dev/ui-showcase')} />
        </Section>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    gap: 24,
  },
  header: {
    gap: 4,
  },
  sectionHead: {
    gap: 2,
  },
  backButton: {
    marginLeft: -10,
    alignSelf: 'flex-start',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
