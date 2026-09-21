import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { GradientCard, Text } from '@/components/ui';
import { buildCalendarColumns, relativeLevel } from '@/domain/services/heatmap';
import { useCountUp } from '@/hooks/use-count-up';
import { useAppTheme } from '@/theme';
import { todayIso } from '@/utils/date';

import { useOverallStreak } from '../streaks/hooks';
import { useActivity } from './hooks';

const WEEKS = 4;
const CELL_OPACITY = [0.16, 0.38, 0.58, 0.8, 1];

export function StreakCard({ onPress, style }: { onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const theme = useAppTheme();
  const today = todayIso();
  const columns = buildCalendarColumns(WEEKS, today);
  const { data: streak } = useOverallStreak();
  const { data: activity } = useActivity(columns[0][0].date, today);

  const current = streak?.current ?? 0;
  const animated = useCountUp(current);
  const max = Math.max(0, ...Object.values(activity?.total ?? {}));

  return (
    <GradientCard
      gradient={theme.gradients.pinkPurple}
      orbs="bubbles"
      onPress={onPress}
      style={style}
      contentStyle={styles.content}
      accessibilityLabel={`Current streak: ${current} days. Best: ${streak?.best ?? 0}.`}
      accessibilityHint="Opens your stats"
    >
      <Text variant="labelMedium" style={styles.label}>
        🔥 STREAK
      </Text>
      <View>
        <Text style={styles.number}>{Math.round(animated)}</Text>
        <Text variant="labelMedium" style={styles.label}>
          {current === 1 ? 'DAY' : 'DAYS'} · BEST {streak?.best ?? 0}
        </Text>
      </View>

      {/* Rows are weeks (oldest first), columns Mon→Sun — a compact, softened contribution grid. */}
      <View style={styles.grid}>
        {columns.map((week) => (
          <View key={week[0].date} style={styles.gridRow}>
            {week.map((cell) => (
              <View
                key={cell.date}
                style={[
                  styles.cell,
                  {
                    backgroundColor: '#FFFFFF',
                    opacity: cell.isFuture
                      ? 0.06
                      : CELL_OPACITY[relativeLevel(activity?.total[cell.date] ?? 0, max)],
                    borderWidth: cell.isToday ? 1.5 : 0,
                    borderColor: '#FFFFFF',
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 10,
  },
  label: {
    color: 'rgba(255,255,255,0.9)',
  },
  number: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 46,
    lineHeight: 50,
    color: '#FFFFFF',
    letterSpacing: -1.5,
  },
  grid: {
    gap: 4,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 4,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 16,
    borderRadius: 4,
  },
});
