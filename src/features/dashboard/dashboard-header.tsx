import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Avatar, Text } from '@/components/ui';
import { useSettingsStore } from '@/store/settings-store';
import { formatLongDate, greetingForHour } from '@/utils/date';

export function DashboardHeader() {
  const router = useRouter();
  const displayName = useSettingsStore((state) => state.displayName);
  const now = new Date();
  const firstName = displayName.split(/\s+/)[0];
  const greeting = greetingForHour(now.getHours());

  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text variant="headlineLarge" accessibilityRole="header" numberOfLines={1}>
          {firstName ? `${greeting}, ${firstName}` : greeting} 👋
        </Text>
        <Text variant="bodyMedium" color="textSecondary">
          {formatLongDate(now)}
        </Text>
      </View>
      <Avatar
        name={displayName}
        onPress={() => router.push('/settings')}
        accessibilityLabel="Profile and settings"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
