import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Icon, IconButton, Text } from '@/components/ui';
import { FinanceSettingsSection } from '@/features/finance/settings/finance-settings-section';
import { SecuritySection } from '@/features/security/security-section';
import { useAppTheme } from '@/theme';

import { AppearanceSection } from './appearance-section';
import { ProfileSection } from './profile-section';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={{ gap: theme.spacing.md }}>
      <Text variant="labelLarge" color="textSecondary" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

function LinkRow({ label, icon, onPress }: { label: string; icon: 'calendar' | 'target' | 'repeat' | 'layout'; onPress: () => void }) {
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

      <Section title="APPEARANCE">
        <AppearanceSection />
      </Section>

      <Section title="FINANCE">
        <FinanceSettingsSection />
      </Section>

      <Section title="SECURITY">
        <SecuritySection />
      </Section>

      <Section title="MORE">
        <LinkRow label="Habits" icon="repeat" onPress={() => router.push('/habits')} />
        <LinkRow label="Calendar" icon="calendar" onPress={() => router.push('/calendar')} />
        <LinkRow label="Goals" icon="target" onPress={() => router.push('/goal')} />
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
