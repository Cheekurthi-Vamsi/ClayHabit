import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDockSpace } from '@/components/navigation/floating-dock';
import {
  Card,
  ErrorState,
  Heatmap,
  HeatmapLegend,
  Icon,
  ProgressBar,
  SectionHeader,
  Skeleton,
  Stagger,
  StatCard,
  Text,
  type IconName,
} from '@/components/ui';
import type { HabitWithLogs } from '@/domain/entities/habit';
import { completionRate, computeHabitStats, weekdayIndex } from '@/domain/services/habit-engine';
import { buildCalendarColumns, formatShortDate, relativeLevel } from '@/domain/services/heatmap';
import { computeStreakStats } from '@/domain/services/streak-engine';
import { habitPalette, useAppTheme, type ThemeGradients } from '@/theme';
import { addDaysIso, startOfWeekIso, toLocalIsoDate, todayIso } from '@/utils/date';

import { useActivity } from '../dashboard/hooks';
import { HabitGlyph } from '../habits/habit-glyph';
import { useHabits } from '../habits/hooks';
import { useOverallStreak } from '../streaks/hooks';
import { FocusTrendCard } from './focus-trend-card';
import { HabitRingsCard } from './habit-rings-card';
import { useCompletionHours, useFocusMinutesBetween } from './hooks';
import { habitsCompletionRate, percentChange, sumRange } from './insights';
import { MomentumCard } from './momentum-card';
import { PeakHoursCard } from './peak-hours-card';
import { PriorityMixCard } from './priority-mix-card';
import { WeeklyRhythmCard } from './weekly-rhythm-card';

function HabitStatRow({ habit, onPress }: { habit: HabitWithLogs; onPress: () => void }) {
  const theme = useAppTheme();
  const today = todayIso();
  const swatch = habitPalette[habit.color];
  const stats = computeHabitStats(habit.logs, habit.targetPerDay, habit.daysOfWeek, today);
  const createdOn = toLocalIsoDate(new Date(habit.createdAt));
  const windowStart = addDaysIso(today, -29);
  const rate = completionRate(
    habit.logs,
    habit.targetPerDay,
    habit.daysOfWeek,
    createdOn > windowStart ? createdOn : windowStart,
    today,
  );

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${habit.name}: ${Math.round(rate * 100)} percent over 30 days, ${stats.currentStreak} day streak`}
      style={({ pressed }) => [styles.habitRow, pressed && { opacity: 0.7 }]}
    >
      <HabitGlyph icon={habit.icon} emoji={habit.emoji} color={habit.color} size={36} />
      <View style={styles.habitBody}>
        <View style={styles.rowBetween}>
          <Text variant="titleMedium" numberOfLines={1} style={styles.flex}>
            {habit.name}
          </Text>
          <Text variant="labelMedium" color="textSecondary">
            {Math.round(rate * 100)}%
          </Text>
        </View>
        <ProgressBar progress={rate} gradient={swatch.gradient} height={6} />
        <Text variant="caption" color="textTertiary">
          🔥 {stats.currentStreak} now · best {stats.bestStreak} · {stats.totalCheckIns} check-ins
        </Text>
      </View>
      <Icon name="chevron-right" size={18} color={theme.colors.textTertiary} />
    </Pressable>
  );
}

function ExploreTile({
  icon,
  label,
  gradient,
  onPress,
}: {
  icon: IconName;
  label: string;
  gradient: keyof ThemeGradients;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Card onPress={onPress} accessibilityLabel={label} style={styles.exploreTile}>
      <LinearGradient
        colors={theme.gradients[gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.exploreIcon}
      >
        <Icon name={icon} size={18} color="#FFFFFF" />
      </LinearGradient>
      <Text variant="labelLarge">{label}</Text>
    </Card>
  );
}

export function StatsScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const dockSpace = useDockSpace();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = todayIso();
  const monday = startOfWeekIso(today);
  const lastMonday = addDaysIso(monday, -7);
  // Compare week-to-date against the same span last week, not a full week.
  const lastWeekSameDay = addDaysIso(lastMonday, weekdayIndex(today));

  const columns = buildCalendarColumns(53, today);
  const yearStart = columns[0][0].date;
  const activity = useActivity(yearStart, today);
  const totals = activity.data?.total ?? {};

  const focusThisWeek = useFocusMinutesBetween(monday, addDaysIso(today, 1));
  const focusLastWeek = useFocusMinutesBetween(lastMonday, addDaysIso(lastWeekSameDay, 1));
  const { data: streak } = useOverallStreak();
  const { data: habits } = useHabits();
  const { data: hours } = useCompletionHours(addDaysIso(today, -59));

  const doneThisWeek = sumRange(totals, monday, today);
  const doneLastWeek = sumRange(totals, lastMonday, lastWeekSameDay);
  const habitRate = habitsCompletionRate(habits ?? [], addDaysIso(today, -6), today);
  const habitRatePrev = habitsCompletionRate(habits ?? [], addDaysIso(today, -13), addDaysIso(today, -7));

  const activeDates = Object.keys(totals).filter((date) => (totals[date] ?? 0) > 0);
  const yearTotal = sumRange(totals, yearStart, today);
  const maxDay = Math.max(0, ...Object.values(totals));
  const maxStreak = computeStreakStats(activeDates, 'daily', today).best;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + theme.spacing.md, paddingBottom: dockSpace },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Stagger index={0} style={styles.header}>
          <Text variant="displayMedium" accessibilityRole="header">
            Stats
          </Text>
          <Text variant="bodyMedium" color="textSecondary">
            How your week is going, and the year so far.
          </Text>
        </Stagger>

        <Stagger index={1} style={styles.grid}>
          <View style={styles.gridRow}>
            <StatCard
              title="Done this week"
              value={doneThisWeek}
              delta={percentChange(doneThisWeek, doneLastWeek)}
              footer={`Same point last week: ${doneLastWeek}`}
              gradient={theme.gradients.primary}
              style={styles.flex}
            />
            <StatCard
              title="Focus"
              value={focusThisWeek.data ?? 0}
              format={(v) => `${Math.round(v)}m`}
              delta={percentChange(focusThisWeek.data ?? 0, focusLastWeek.data ?? 0)}
              footer={`Last week: ${focusLastWeek.data ?? 0}m`}
              gradient={theme.gradients.secondary}
              orbs="drift"
              style={styles.flex}
            />
          </View>
          <View style={styles.gridRow}>
            <StatCard
              title="Streak"
              value={streak?.current ?? 0}
              format={(v) => `${Math.round(v)}d`}
              footer={`Best: ${streak?.best ?? 0} days`}
              gradient={theme.gradients.pinkPurple}
              orbs="glow"
              style={styles.flex}
            />
            <StatCard
              title="Habit rate"
              value={Math.round((habitRate ?? 0) * 100)}
              format={(v) => (habitRate === null ? '—' : `${Math.round(v)}%`)}
              delta={
                habitRate !== null && habitRatePrev !== null
                  ? (habitRate - habitRatePrev) * 100
                  : null
              }
              footer="Last 7 days"
              gradient={theme.gradients.mintCyan}
              orbs="drift"
              style={styles.flex}
            />
          </View>
        </Stagger>

        <Stagger index={2}>
          <MomentumCard activity={activity.data} loading={activity.isLoading} />
        </Stagger>

        <Stagger index={3}>
          <WeeklyRhythmCard totals={totals} />
        </Stagger>

        <Stagger index={4}>
          <PeakHoursCard hours={hours ?? []} />
        </Stagger>

        <Stagger index={5}>
          <PriorityMixCard />
        </Stagger>

        <Stagger index={6}>
          <FocusTrendCard />
        </Stagger>

        <Stagger index={7} style={styles.section}>
          <SectionHeader title="Activity" />
          <Card style={styles.heatmapCard}>
            {activity.isLoading ? (
              <Skeleton height={130} radius={theme.radii.md} />
            ) : activity.isError ? (
              <ErrorState message="Couldn't load your activity." onRetry={() => activity.refetch()} />
            ) : (
              <>
                <Text variant="bodySmall">
                  <Text variant="labelLarge">{yearTotal}</Text>
                  <Text variant="bodySmall" color="textSecondary">
                    {' '}
                    things done in the past year
                  </Text>
                </Text>
                <View style={styles.rowBetween}>
                  <Text variant="caption" color="textTertiary">
                    Active days {activeDates.length} · Max streak {maxStreak}
                  </Text>
                </View>
                <Heatmap
                  columns={columns}
                  levelFor={(date) => relativeLevel(totals[date] ?? 0, maxDay)}
                  color={theme.colors.primary}
                  showMonthLabels
                  showWeekdayLabels
                  scrollable
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  accessibilityLabel={`Activity over the past year: ${yearTotal} things done on ${activeDates.length} days`}
                />
                <View style={styles.rowBetween}>
                  <Text variant="caption" color="textSecondary">
                    {selectedDate
                      ? `${formatShortDate(selectedDate)} · ${totals[selectedDate] ?? 0} done`
                      : 'Tap a day for details'}
                  </Text>
                  <HeatmapLegend color={theme.colors.primary} />
                </View>
              </>
            )}
          </Card>
        </Stagger>

        {(habits?.length ?? 0) > 0 ? (
          <Stagger index={8} style={styles.section}>
            <SectionHeader title="Habits · 30 days" onAction={() => router.push('/habits')} />
            <HabitRingsCard habits={habits!} />
            <Card style={styles.habitList}>
              {habits!.map((habit, index) => (
                <View key={habit.id}>
                  {index > 0 ? <View style={[styles.separator, { backgroundColor: theme.colors.border }]} /> : null}
                  <HabitStatRow habit={habit} onPress={() => router.push(`/habit/${habit.id}`)} />
                </View>
              ))}
            </Card>
          </Stagger>
        ) : null}

        <Stagger index={9} style={styles.section}>
          <SectionHeader title="Explore" />
          <View style={styles.gridRow}>
            <ExploreTile icon="calendar" label="Calendar" gradient="primary" onPress={() => router.push('/calendar')} />
            <ExploreTile icon="target" label="Goals" gradient="mintCyan" onPress={() => router.push('/goal')} />
            <ExploreTile icon="zap" label="Focus" gradient="aurora" onPress={() => router.push('/focus')} />
          </View>
        </Stagger>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    gap: 20,
  },
  header: {
    gap: 4,
  },
  flex: {
    flex: 1,
  },
  grid: {
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  section: {
    gap: 10,
  },
  heatmapCard: {
    gap: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  habitList: {
    paddingVertical: 4,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  habitBody: {
    flex: 1,
    gap: 6,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  exploreTile: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  exploreIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
