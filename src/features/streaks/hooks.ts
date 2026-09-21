import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';

import * as activityRepository from '@/data/repositories/activity-repository';
import * as taskRepository from '@/data/repositories/task-repository';
import type { RepeatRule } from '@/domain/entities/task';
import { buildContributionGrid, computeStreakStats } from '@/domain/services/streak-engine';
import { todayIso } from '@/utils/date';

/** App-wide streak: any day with a completed task or a habit check-in counts. */
export function useOverallStreak() {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['streaks', 'overall'],
    queryFn: async () => {
      const dates = await activityRepository.activeDates(db);
      return computeStreakStats(dates, 'daily', todayIso());
    },
  });
}

export function useSeriesStreak(seriesId: string, rule: RepeatRule | null) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['streaks', 'series', seriesId],
    queryFn: async () => {
      const dates = await taskRepository.getStreakDates(db, seriesId);
      return computeStreakStats(dates, rule ?? 'daily', todayIso());
    },
    enabled: Boolean(rule),
  });
}

export function useContributionGrid(seriesId: string, weeks = 12) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['streaks', 'grid', seriesId, weeks],
    queryFn: async () => {
      const dates = await taskRepository.getStreakDates(db, seriesId);
      return buildContributionGrid(dates, weeks, todayIso());
    },
  });
}
