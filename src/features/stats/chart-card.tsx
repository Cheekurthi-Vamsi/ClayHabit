import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Card, Icon, Text } from '@/components/ui';
import { useAppTheme } from '@/theme';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  /** Top-right slot, e.g. a range switcher. */
  accessory?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ChartCard({ title, subtitle, accessory, children, style }: ChartCardProps) {
  return (
    <Card style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.titles}>
          <Text variant="titleMedium" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" color="textTertiary">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {accessory}
      </View>
      {children}
    </Card>
  );
}

/** "▲ 12%" in green or "▼ 8%" in red; nothing without a baseline. */
export function DeltaPill({ value }: { value: number | null }) {
  const theme = useAppTheme();
  if (value === null || !Number.isFinite(value)) return null;

  const up = value >= 0;
  const tint = up ? theme.colors.success : theme.colors.error;
  return (
    <View
      style={[styles.pill, { backgroundColor: up ? theme.colors.successMuted : theme.colors.errorMuted }]}
      accessibilityLabel={`${up ? 'Up' : 'Down'} ${Math.abs(Math.round(value))} percent`}
    >
      <Icon name={up ? 'trending-up' : 'trending-down'} size={12} color={tint} />
      <Text variant="labelMedium" style={{ color: tint }}>
        {Math.abs(Math.round(value))}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
});
