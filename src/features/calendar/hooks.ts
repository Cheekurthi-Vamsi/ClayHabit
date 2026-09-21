import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';

import * as calendarEventRepository from '@/data/repositories/calendar-event-repository';
import * as taskRepository from '@/data/repositories/task-repository';
import type { NewCalendarEventInput } from '@/domain/entities/calendar-event';

export function useTasksForRange(startIso: string, endIso: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['calendar', 'tasks', startIso, endIso],
    queryFn: () => taskRepository.listForDateRange(db, startIso, endIso),
  });
}

export function useEventsForRange(startIso: string, endIso: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['calendar', 'events', startIso, endIso],
    queryFn: () => calendarEventRepository.listForDateRange(db, startIso, endIso),
  });
}

export function useCreateEvent() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: NewCalendarEventInput) => calendarEventRepository.create(db, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendar', 'events'] }),
  });
}

export function useDeleteEvent() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => calendarEventRepository.remove(db, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendar', 'events'] }),
  });
}
