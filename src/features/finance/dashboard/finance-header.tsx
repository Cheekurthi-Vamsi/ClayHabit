import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Avatar, IconButton, Text } from '@/components/ui';
import type { MonthKey } from '@/domain/finance/entities';
import { useAccount } from '@/features/auth/account-context';
import { formatMonthLabel } from '@/domain/finance/month';
import { useSettingsStore } from '@/store/settings-store';

/** Title, month, the one-tap privacy toggle, and the shared profile/settings entry. */
export function FinanceHeader({ title, monthKey }: { title: string; monthKey: MonthKey }) {
  const router = useRouter();
  const localName = useSettingsStore((state) => state.displayName);
  const account = useAccount();
  const displayName = localName || account?.fullName || '';
  const hidden = useSettingsStore((state) => state.hideAmounts);
  const setHidden = useSettingsStore((state) => state.setHideAmounts);

  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text variant="headlineLarge" accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="bodyMedium" color="textSecondary">
          {formatMonthLabel(monthKey)}
        </Text>
      </View>
      <IconButton
        name={hidden ? 'eye-off' : 'eye'}
        variant="muted"
        accessibilityLabel={hidden ? 'Show amounts' : 'Hide amounts'}
        onPress={() => setHidden(!hidden)}
      />
      <Avatar name={displayName} imageUrl={account?.imageUrl} onPress={() => router.push('/settings')} accessibilityLabel="Profile and settings" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
