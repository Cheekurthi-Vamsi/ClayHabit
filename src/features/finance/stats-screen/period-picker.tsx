import { StyleSheet, View } from 'react-native';

import { IconButton, SegmentedControl, Text } from '@/components/ui';
import { formatMonthLabel, monthKeyOf } from '@/domain/finance/month';
import {
  canShift,
  clampPeriod,
  currentPeriod,
  periodLabel,
  shiftPeriod,
  yearOf,
  type PeriodBounds,
  type StatsPeriod,
  type StatsScope,
} from '@/domain/finance/period';

const SCOPES: readonly { value: StatsScope; label: string }[] = [
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'all', label: 'All time' },
];

interface PeriodPickerProps {
  period: StatsPeriod;
  bounds: PeriodBounds;
  today: string;
  onChange: (period: StatsPeriod) => void;
}

/** Switching scope keeps your place: a month opens its year, and a past year opens on its last month. */
function rescope(period: StatsPeriod, scope: StatsScope, today: string, bounds: PeriodBounds): StatsPeriod {
  if (scope === 'year' && period.scope === 'month') return { scope, year: yearOf(`${period.month}-01`) };
  if (scope === 'month' && period.scope === 'year' && period.year !== yearOf(today)) {
    return clampPeriod({ scope, month: `${String(period.year).padStart(4, '0')}-12` }, bounds);
  }
  return currentPeriod(scope, today);
}

/**
 * The scope switch and the period stepper, above everything they filter. The
 * arrows step through every month or year that has records.
 */
export function PeriodPicker({ period, bounds, today, onChange }: PeriodPickerProps) {
  const isCurrent =
    period.scope === 'all' ||
    (period.scope === 'month' ? period.month === monthKeyOf(today) : period.year === yearOf(today));
  const first = formatMonthLabel(bounds.firstMonth);

  return (
    <View style={styles.wrap}>
      <SegmentedControl
        options={SCOPES}
        value={period.scope}
        onChange={(scope) => onChange(rescope(period, scope, today, bounds))}
        accessibilityLabel="Stats period"
      />
      <View style={styles.stepper}>
        {period.scope !== 'all' ? (
          <IconButton
            name="chevron-left"
            variant="ghost"
            size={36}
            disabled={!canShift(period, -1, bounds)}
            accessibilityLabel={period.scope === 'month' ? 'Previous month' : 'Previous year'}
            onPress={() => onChange(shiftPeriod(period, -1))}
          />
        ) : null}
        <View style={styles.label}>
          <Text variant="titleMedium" accessibilityRole="header" accessibilityLiveRegion="polite">
            {periodLabel(period)}
          </Text>
          <Text variant="caption" color="textTertiary">
            {period.scope === 'all' ? `Since ${first}` : isCurrent ? 'So far' : 'Complete'}
          </Text>
        </View>
        {period.scope !== 'all' ? (
          <IconButton
            name="chevron-right"
            variant="ghost"
            size={36}
            disabled={!canShift(period, 1, bounds)}
            accessibilityLabel={period.scope === 'month' ? 'Next month' : 'Next year'}
            onPress={() => onChange(shiftPeriod(period, 1))}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  label: {
    flex: 1,
    alignItems: 'center',
  },
});
