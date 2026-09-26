import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import * as noteRepository from '@/data/repositories/note-repository';
import * as taskRepository from '@/data/repositories/task-repository';
import {
  addNotificationResponseListener,
  scheduleTaskReminder,
} from '@/lib/notifications/notification-service';

import { useAppLockStore } from '@/store/app-lock-store';
import { useSettingsStore } from '@/store/settings-store';

import { scheduleReminderForTask } from './hooks';

type NotificationResponse = Parameters<Parameters<typeof addNotificationResponseListener>[0]>[0];

function appLocked(): boolean {
  return useSettingsStore.getState().appLockEnabled && !useAppLockStore.getState().isSessionUnlocked;
}

/**
 * Wires OS notification taps/actions back into the app: tapping opens the
 * task, "Mark Done" completes it in place, "Snooze" reschedules 15 minutes
 * out. Mounted once near the app root so it works regardless of which
 * screen is currently visible. While App Lock is locked, a response waits
 * for the unlock, so nothing changes (or opens) behind the lock screen.
 */
export function NotificationResponseHandler() {
  const db = useSQLiteContext();
  const router = useRouter();
  const queryClient = useQueryClient();

  const pending = useRef<NotificationResponse | null>(null);
  const handleRef = useRef<(response: NotificationResponse) => Promise<void>>(async () => {});

  useEffect(() => {
    handleRef.current = async (response) => {
      const noteId = response.notification.request.content.data?.noteId as string | undefined;
      if (noteId) {
        // A note reminder has done its job once it fires and is opened.
        await noteRepository.setReminder(db, noteId, { at: null, notificationId: null }).catch(() => {});
        queryClient.invalidateQueries({ queryKey: ['notes'] });
        router.push(`/note/${noteId}`);
        return;
      }
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
    };
  }, [db, queryClient, router]);

  useEffect(() => {
    const unsubscribe = addNotificationResponseListener((response) => {
      if (appLocked()) {
        pending.current = response;
        return;
      }
      void handleRef.current(response);
    });
    const unsubscribeLock = useAppLockStore.subscribe((state) => {
      if (!state.isSessionUnlocked || !pending.current) return;
      const response = pending.current;
      pending.current = null;
      void handleRef.current(response);
    });
    return () => {
      unsubscribe();
      unsubscribeLock();
    };
  }, []);

  return null;
}
