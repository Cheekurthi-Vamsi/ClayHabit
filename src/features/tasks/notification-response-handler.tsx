import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import * as taskRepository from '@/data/repositories/task-repository';
import {
  addNotificationResponseListener,
  scheduleTaskReminder,
} from '@/lib/notifications/notification-service';

import { scheduleReminderForTask } from './hooks';

/**
 * Wires OS notification taps/actions back into the app: tapping opens the
 * task, "Mark Done" completes it in place, "Snooze" reschedules 15 minutes
 * out. Mounted once near the app root so it works regardless of which
 * screen is currently visible.
 */
export function NotificationResponseHandler() {
  const db = useSQLiteContext();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = addNotificationResponseListener(async (response) => {
      const taskId = response.notification.request.content.data?.taskId as string | undefined;
      if (!taskId) return;

      const { actionIdentifier } = response;

      if (actionIdentifier === 'complete') {
        const result = await taskRepository.setCompleted(db, taskId, true);
        if (result.nextOccurrence?.reminderEnabled && result.nextOccurrence.reminderTime) {
          await scheduleReminderForTask(
            db,
            result.nextOccurrence,
            true,
            result.nextOccurrence.reminderTime,
          );
        }
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['streaks'] });
        queryClient.invalidateQueries({ queryKey: ['activity'] });
        return;
      }

      if (actionIdentifier === 'snooze') {
        const task = await taskRepository.getById(db, taskId);
        if (!task) return;
        const date = new Date(Date.now() + 15 * 60 * 1000);
        const notificationId = await scheduleTaskReminder({ taskId, title: task.title, date });
        await taskRepository.setReminder(db, taskId, {
          enabled: true,
          time: task.reminderTime,
          notificationId,
        });
        return;
      }

      router.push(`/task/${taskId}`);
    });

    return unsubscribe;
  }, [db, queryClient, router]);

  return null;
}
