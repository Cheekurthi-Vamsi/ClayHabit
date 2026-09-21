import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { MoneyText } from '@/components/finance/money-text';
import { Card, Chip, Icon, Text, type IconName } from '@/components/ui';
import { CURRENCIES, CURRENCY_CODES } from '@/domain/finance/currency';
import { useSettingsStore } from '@/store/settings-store';
import { useAppTheme } from '@/theme';

import { useFinanceAccount, useUpdateAccount } from '../hooks';

function SwitchRow({
  icon,
  label,
  hint,
  value,
  onValueChange,
}: {
  icon: IconName;
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.row}>
      <Icon name={icon} size={18} color={theme.colors.textSecondary} />
      <View style={styles.rowText}>
        <Text variant="bodyLarge">{label}</Text>
        <Text variant="caption" color="textTertiary">
          {hint}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={label}
        trackColor={{ false: theme.colors.surfaceMuted, true: theme.colors.finance }}
        thumbColor={theme.colors.onPrimary}
      />
    </View>
  );
}

/** Currency, starting balance and privacy for the finance workspace. */
export function FinanceSettingsSection() {
  const theme = useAppTheme();
  const router = useRouter();
  const { data: account } = useFinanceAccount();
  const updateAccount = useUpdateAccount();
  const hideAmounts = useSettingsStore((state) => state.hideAmounts);
  const setHideAmounts = useSettingsStore((state) => state.setHideAmounts);
  const showSummary = useSettingsStore((state) => state.showFinanceSummary);
  const setShowSummary = useSettingsStore((state) => state.setShowFinanceSummary);
  const currency = account?.currency ?? 'INR';

  return (
    <Card>
      <View style={styles.stack}>
        <View style={styles.block}>
          <Text variant="bodyLarge">Currency</Text>
          <View style={styles.chips}>
            {CURRENCY_CODES.map((code) => (
              <Chip
                key={code}
                label={`${CURRENCIES[code].symbol} ${code}`}
                selected={currency === code}
                onPress={() => updateAccount.mutate({ currency: code })}
              />
            ))}
          </View>
          <Text variant="caption" color="textTertiary">
            Changes the symbol and formatting. Recorded amounts aren&apos;t converted.
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        <Pressable
          onPress={() => router.push('/modal/starting-balance')}
          accessibilityRole="button"
          accessibilityLabel="Starting balance"
          style={styles.row}
        >
          <Icon name="flag" size={18} color={theme.colors.textSecondary} />
          <View style={styles.rowText}>
            <Text variant="bodyLarge">Starting balance</Text>
            <Text variant="caption" color="textTertiary">
              What you had before you started tracking
            </Text>
          </View>
          <MoneyText variant="labelLarge" color="textSecondary" amountMinor={account?.openingBalanceMinor ?? 0} currency={currency} />
          <Icon name="chevron-right" size={18} color={theme.colors.textTertiary} />
        </Pressable>

        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        <Pressable onPress={() => router.push('/fm/categories')} accessibilityRole="button" style={styles.row}>
          <Icon name="tag" size={18} color={theme.colors.textSecondary} />
          <Text variant="bodyLarge" style={styles.rowText}>
            Categories
          </Text>
          <Icon name="chevron-right" size={18} color={theme.colors.textTertiary} />
        </Pressable>
        <Pressable onPress={() => router.push('/fm/budgets')} accessibilityRole="button" style={styles.row}>
          <Icon name="sliders" size={18} color={theme.colors.textSecondary} />
          <Text variant="bodyLarge" style={styles.rowText}>
            Budgets
          </Text>
          <Icon name="chevron-right" size={18} color={theme.colors.textTertiary} />
        </Pressable>

        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        <SwitchRow
          icon="eye-off"
          label="Hide amounts"
          hint="Privacy mode: every amount shows as ••,•••"
          value={hideAmounts}
          onValueChange={setHideAmounts}
        />
        <SwitchRow
          icon="home"
          label="Show summary on Home"
          hint="Balance on the Productivity dashboard's Finance card"
          value={showSummary}
          onValueChange={setShowSummary}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 8,
  },
  block: {
    gap: 10,
    paddingVertical: 4,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
});
