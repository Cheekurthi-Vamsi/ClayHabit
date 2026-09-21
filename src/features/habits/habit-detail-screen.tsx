import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  Card,
  EmptyState,
  GradientCard,
  Heatmap,
  HeatmapLegend,
  IconButton,
  Skeleton,
  Text,
} from '@/components/ui';
import type { HabitWithLogs } from '@/domain/entities/habit';
import {
  completionRate,
  computeHabitStats,
  describeSchedule,
  habitLevel,
} from '@/domain/services/habit-engine';
import { buildCalendarColumns, formatShortDate } from '@/domain/services/heatmap';
import { habitPalette, useAppTheme } from '@/theme';
import { addDaysIso, toLocalIsoDate, todayIso } from '@/utils/date';

import { HabitForm } from './habit-form';
import { HabitGlyph } from './habit-glyph';
import { useArchiveHabit, useDeleteHabit, useHabit, useSetHabitCount, useUpdateHabit } from './hooks';

export function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: habit, isLoading } = useHabit(id);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, padding: 20, paddingTop: insets.top + 20, gap: 16 }]}>
        <Skeleton height={180} radius={theme.radii.lg} />
        <Skeleton height={160} radius={theme.radii.lg} />
      </View>
    );
  }

  if (!habit) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <EmptyState icon="alert-circle" title="Habit not found" message="It may have been deleted." />
        <Button label="Go back" variant="outline" onPress={() => router.back()} />
      </View>
    );
  }

  return <HabitDetailBody key={habit.id} habit={habit} />;
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <Card style={styles.statTile}>
      <Text variant="headlineMedium">{value}</Text>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </Card>
  );
}

function HabitDetailBody({ habit }: { habit: HabitWithLogs }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const setCount = useSetHabitCount();
  const updateHabit = useUpdateHabit();
  const archiveHabit = useArchiveHabit();
  const deleteHabit = useDeleteHabit();

  const today = todayIso();
  const [selected, setSelected] = useState(today);
  const [editing, setEditing] = useState(false);

  const swatch = habitPalette[habit.color];
  const target = habit.targetPerDay;
  const stats = computeHabitStats(habit.logs, target, habit.daysOfWeek, today);
  const createdOn = toLocalIsoDate(new Date(habit.createdAt));
  const windowStart = addDaysIso(today, -29);
  const rate = completionRate(
    habit.logs,
    target,
    habit.daysOfWeek,
    createdOn > windowStart ? createdOn : windowStart,
    today,
  );
  const columns = buildCalendarColumns(53, today);
  const rangeStart = columns[0][0].date;
  const yearCheckIns = Object.entries(habit.logs).reduce(
    (sum, [date, value]) => (date >= rangeStart && date <= today ? sum + value : sum),
    0,
  );
  const selectedCount = habit.logs[selected] ?? 0;

  const setSelectedCount = (count: number) =>
    setCount.mutate({ habitId: habit.id, date: selected, count: Math.max(0, count) });

  const confirmDelete = () =>
    Alert.alert('Delete habit?', `"${habit.name}" and its entire history will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteHabit.mutate(habit.id, { onSuccess: () => router.back() }),
      },
    ]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + theme.spacing.sm, paddingBottom: insets.bottom + theme.spacing.huge },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <IconButton name="arrow-left" variant="ghost" accessibilityLabel="Back" onPress={() => router.back()} />
        </View>

        <GradientCard gradient={swatch.gradient} orbs="glow" contentStyle={styles.hero}>
          <View style={styles.heroTop}>
            <HabitGlyph icon={habit.icon} emoji={habit.emoji} color={habit.color} size={56} onGradient />
            <View style={styles.flex}>
              <Text variant="headlineMedium" style={styles.white} numberOfLines={2}>
                {habit.name}
              </Text>
              <Text variant="bodySmall" style={styles.whiteMuted}>
                {describeSchedule(habit.daysOfWeek)}
                {target > 1 ? ` · ${target}× a day` : ''}
              </Text>
            </View>
          </View>
          <View style={styles.heroStreak}>
            <Text variant="labelMedium" style={styles.whiteMuted}>
              🔥 CURRENT STREAK
            </Text>
            <View style={styles.streakRow}>
              <Text style={styles.streakNumber}>{stats.currentStreak}</Text>
              <Text variant="titleMedium" style={styles.white}>
                {stats.currentStreak === 1 ? 'day' : 'days'}
              </Text>
            </View>
            <Text variant="bodySmall" style={styles.whiteMuted}>
              Best streak: {stats.bestStreak} {stats.bestStreak === 1 ? 'day' : 'days'}
            </Text>
          </View>
        </GradientCard>

        <View style={styles.statsRow}>
          <StatTile value={String(stats.totalCheckIns)} label="Check-ins" />
          <StatTile value={String(stats.activeDays)} label="Active days" />
          <StatTile value={`${Math.round(rate * 100)}%`} label="Last 30 days" />
        </View>

        <Card style={styles.heatmapCard}>
          <View style={styles.rowBetween}>
            <Text variant="bodySmall">
              <Text variant="labelLarge">{yearCheckIns}</Text>
              <Text variant="bodySmall" color="textSecondary">
                {' '}
                check-ins in the past year
              </Text>
            </Text>
            <HeatmapLegend color={swatch.base} />
          </View>
          <Heatmap
            columns={columns}
            levelFor={(date) => habitLevel(habit.logs[date] ?? 0, target)}
            color={swatch.base}
            showMonthLabels
            showWeekdayLabels
            scrollable
            selectedDate={selected}
            onSelectDate={setSelected}
            accessibilityLabel={`${habit.name} yearly heatmap. Tap a day to edit it.`}
          />
          <View
            style={[
              styles.dayEditor,
              { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md },
            ]}
          >
            <View>
              <Text variant="titleMedium">{selected === today ? 'Today' : formatShortDate(selected)}</Text>
              <Text variant="caption" color="textSecondary">
                {selectedCount} / {target} {target === 1 ? 'check-in' : 'check-ins'}
              </Text>
            </View>
            <View style={styles.stepper}>
              <IconButton
                name="minus"
                variant="muted"
                size={38}
                accessibilityLabel={`Remove a check-in for ${formatShortDate(selected)}`}
                disabled={selectedCount === 0}
                onPress={() => setSelectedCount(selectedCount - 1)}
              />
              <IconButton
                name="plus"
                variant="filled"
                size={38}
                accessibilityLabel={`Add a check-in for ${formatShortDate(selected)}`}
                onPress={() => setSelectedCount(selectedCount + 1)}
              />
            </View>
          </View>
          <Text variant="caption" color="textTertiary">
            Tap any day to fix a missed or mistaken check-in.
          </Text>
        </Card>

        {editing ? (
          <Card>
            <HabitForm
              initial={habit}
              submitLabel="Save changes"
              submitting={updateHabit.isPending}
              onSubmit={(input) =>
                updateHabit.mutate({ id: habit.id, input }, { onSuccess: () => setEditing(false) })
              }
            />
          </Card>
        ) : (
          <Button label="Edit habit" icon="edit-2" variant="outline" fullWidth onPress={() => setEditing(true)} />
        )}

        <View style={styles.dangerRow}>
          <Button
            label="Archive"
            icon="archive"
            variant="ghost"
            onPress={() => archiveHabit.mutate(habit.id, { onSuccess: () => router.back() })}
          />
          <Button label="Delete" icon="trash-2" variant="ghost" onPress={confirmDelete} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  content: {
    paddingHorizontal: 20,
    gap: 16,
  },
  topBar: {
    marginLeft: -10,
    alignSelf: 'flex-start',
  },
  flex: {
    flex: 1,
  },
  hero: {
    gap: 22,
    padding: 22,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroStreak: {
    gap: 2,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  streakNumber: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 56,
    lineHeight: 62,
    color: '#FFFFFF',
    letterSpacing: -1.5,
  },
  white: {
    color: '#FFFFFF',
  },
  whiteMuted: {
    color: 'rgba(255,255,255,0.85)',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statTile: {
    flex: 1,
    gap: 2,
    paddingVertical: 14,
  },
  heatmapCard: {
    gap: 14,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayEditor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  stepper: {
    flexDirection: 'row',
    gap: 10,
  },
  dangerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
});
