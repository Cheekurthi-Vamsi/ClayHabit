import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';

import * as activityRepository from '@/data/repositories/activity-repository';
import * as focusSessionRepository from '@/data/repositories/focus-session-repository';
import { localMidnightIso } from '@/utils/date';

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
