import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Avatar, IconButton, Text } from '@/components/ui';
import { useAccount } from '@/features/auth/account-context';
import { useSettingsStore } from '@/store/settings-store';
import { fontFamily } from '@/theme';
import { formatLongDate, greetingForHour } from '@/utils/date';

/** Avatar and shortcuts on one row, then the big "Hi …, here's …" headline from the dashboard design. */
export function DashboardHeader() {
  const router = useRouter();
  const localName = useSettingsStore((state) => state.displayName);
  const account = useAccount();
  const displayName = localName || account?.fullName || account?.firstName || '';
  const now = new Date();
  const firstName = displayName.split(/\s+/)[0];

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Avatar
          name={displayName}
          imageUrl={account?.imageUrl}
          size={46}
          onPress={() => router.push('/settings')}
          accessibilityLabel="Profile and settings"
        />
        <View style={styles.actions}>
          <IconButton name="calendar" variant="surface" accessibilityLabel="Calendar" onPress={() => router.push('/calendar')} />
          <IconButton name="target" variant="surface" accessibilityLabel="Goals" onPress={() => router.push('/goal')} />
        </View>
      </View>
      <View style={styles.text}>
        <Text variant="displayMedium" accessibilityRole="header">
          {firstName ? `Hi ${firstName}, ` : 'Hi there, '}
          <Text variant="displayMedium" style={styles.soft}>
            here&apos;s
          </Text>
          {'\n'}what&apos;s on today.
        </Text>
        <Text variant="bodyMedium" color="textSecondary">
          {greetingForHour(now.getHours())} · {formatLongDate(now)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  text: {
    gap: 6,
  },
  soft: {
    fontFamily: fontFamily.regular,
  },
});
