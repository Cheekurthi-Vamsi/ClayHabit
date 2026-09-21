import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Icon, Text } from '@/components/ui';
import { SecuritySection } from '@/features/security/security-section';
import { useAppTheme } from '@/theme';

import { AppearanceSection } from './appearance-section';

export function SettingsScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.huge },
      ]}
    >
      <Text variant="displayMedium">Settings</Text>

      <View style={{ gap: theme.spacing.md }}>
        <Text variant="labelLarge" color="textSecondary">
          APPEARANCE
        </Text>
        <AppearanceSection />
      </View>

      <View style={{ gap: theme.spacing.md }}>
        <Text variant="labelLarge" color="textSecondary">
          SECURITY
        </Text>
        <SecuritySection />
      </View>

      {__DEV__ ? (
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="labelLarge" color="textSecondary">
            DEVELOPER
          </Text>
          <Card onPress={() => router.push('/dev/ui-showcase')} accessibilityLabel="UI Showcase">
            <View style={styles.devRow}>
              <Text variant="bodyLarge">Design system showcase</Text>
              <Icon name="chevron-right" size={18} color={theme.colors.textTertiary} />
            </View>
          </Card>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    gap: 24,
  },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
