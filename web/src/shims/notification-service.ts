/**
 * The browser can't schedule a phone's local notifications. A reminder set on
 * the web is still saved with its task or note and travels in the Cloud copy;
 * the phone schedules it when it restores (rescheduleAllReminders).
 * Same exports as src/lib/notifications/notification-service.ts.
 */
export const TASK_REMINDER_CATEGORY = 'task-reminder';

export function configureNotificationHandler(): void {}

export async function ensureTaskReminderCategory(): Promise<void> {}

/** Nothing to ask for here: the phone rings once it has synced. */
export async function requestPermission(): Promise<boolean> {
  return true;
}

export async function scheduleTaskReminder(_input: {
  taskId: string;
  title: string;
  body?: string;
  date: Date;
}): Promise<string | null> {
  return null;
}

export async function scheduleNoteReminder(_input: {
  noteId: string;
  title: string;
  body?: string;
  date: Date;
}): Promise<string | null> {
  return null;
}

export async function cancelReminder(_notificationId: string | null): Promise<void> {}

export async function cancelAllReminders(): Promise<void> {}

export function addNotificationResponseListener(_listener: unknown): { remove: () => void } {
  return { remove: () => {} };
}
