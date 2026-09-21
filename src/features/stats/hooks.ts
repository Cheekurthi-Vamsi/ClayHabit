import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';

import * as activityRepository from '@/data/repositories/activity-repository';
import * as focusSessionRepository from '@/data/repositories/focus-session-repository';
import { addDaysIso, localMidnightIso } from '@/utils/date';

/** Completed tasks per priority since local day `sinceIso`. */
export function usePriorityBreakdown(sinceIso: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['activity', 'priority', sinceIso],
    queryFn: () => activityRepository.completedByPriority(db, sinceIso),
  });
}

/** Focus minutes per local day for [startIso, endIso] inclusive. */
export function useFocusByDay(startIso: string, endIso: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['focus', 'byDay', startIso, endIso],
    queryFn: () =>
      focusSessionRepository.minutesByDay(
        db,
        localMidnightIso(startIso),
        localMidnightIso(addDaysIso(endIso, 1)),
      ),
  });
}

export function useCompletionHours(sinceIso: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['activity', 'hours', sinceIso],
    queryFn: () => activityRepository.completionHours(db, sinceIso),
  });
}

/** Focus minutes for local days [startIso, endExclusiveIso). */
export function useFocusMinutesBetween(startIso: string, endExclusiveIso: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['focus', 'range', startIso, endExclusiveIso],
    queryFn: () =>
      focusSessionRepository.totalMinutesBetween(
        db,
        localMidnightIso(startIso),
        localMidnightIso(endExclusiveIso),
      ),
  });
}
