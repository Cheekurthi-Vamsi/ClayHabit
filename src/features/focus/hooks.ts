import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';

import * as focusSessionRepository from '@/data/repositories/focus-session-repository';
import type { NewFocusSessionInput } from '@/domain/entities/focus-session';

export function useStartFocusSession() {
  const db = useSQLiteContext();
  return useMutation({
    mutationFn: (input: NewFocusSessionInput) => focusSessionRepository.start(db, input),
  });
}

export function useFinishFocusSession() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      actualMinutes,
      isCompleted,
    }: {
      id: string;
      actualMinutes: number;
      isCompleted: boolean;
    }) => focusSessionRepository.finish(db, id, actualMinutes, isCompleted),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['focus'] }),
  });
}

export function useRecentFocusSessions() {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['focus', 'recent'],
    queryFn: () => focusSessionRepository.listRecent(db),
  });
}

export function useTodayFocusMinutes() {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['focus', 'today'],
    queryFn: () => {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      return focusSessionRepository.totalMinutesSince(db, startOfToday.toISOString());
    },
  });
}
