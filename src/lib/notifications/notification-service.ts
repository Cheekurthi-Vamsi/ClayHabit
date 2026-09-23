import { notificationsUnsupported } from './expo-go-guard';

export const TASK_REMINDER_CATEGORY = 'task-reminder';

type NotificationsModule = typeof import('expo-notifications');

let cached: NotificationsModule | null = null;

/**
 * Lazily requires expo-notifications. Never called (and the module never
 * touched) when `notificationsUnsupported` is true, since even requiring
 * it throws in that environment. See expo-go-guard.ts.
 */
function getNotifications(): NotificationsModule | null {
  if (notificationsUnsupported) return null;
  if (cached) return cached;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-notifications') as NotificationsModule;
    return cached;
  } catch {
    return null;
  }
}

let handlerConfigured = false;
let categoryConfigured = false;

export function configureNotificationHandler(): void {
  if (handlerConfigured) return;
  const Notifications = getNotifications();
  if (!Notifications) return;
  handlerConfigured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureTaskReminderCategory(): Promise<void> {
  if (categoryConfigured) return;
  const Notifications = getNotifications();
  if (!Notifications) return;
  categoryConfigured = true;

  await Notifications.setNotificationCategoryAsync(TASK_REMINDER_CATEGORY, [
    {
      identifier: 'complete',
      buttonTitle: 'Mark Done',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'snooze',
      buttonTitle: 'Snooze 15m',
      options: { opensAppToForeground: false },
    },
  ]);
}

export async function requestPermission(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) return false;

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;

  const result = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return result.granted;
}

interface ScheduleTaskReminderInput {
  taskId: string;
  title: string;
  body?: string;
  date: Date;
}

export async function scheduleTaskReminder(input: ScheduleTaskReminderInput): Promise<string | null> {
  const Notifications = getNotifications();
  if (!Notifications) return null;

  await ensureTaskReminderCategory();

  return Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      categoryIdentifier: TASK_REMINDER_CATEGORY,
      data: { taskId: input.taskId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: input.date,
    },
  });
}

interface ScheduleNoteReminderInput {
  noteId: string;
  title: string;
  body?: string;
  date: Date;
}

/** A plain reminder that opens a note when tapped (no Mark Done / Snooze actions). */
export async function scheduleNoteReminder(input: ScheduleNoteReminderInput): Promise<string | null> {
  const Notifications = getNotifications();
  if (!Notifications) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      data: { noteId: input.noteId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: input.date,
    },
  });
}

export async function cancelReminder(notificationId: string | null): Promise<void> {
  if (!notificationId) return;
  const Notifications = getNotifications();
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {});
}

/** Clears every reminder this app scheduled — used when the data they belonged to is replaced. */
export async function cancelAllReminders(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}

type NotificationResponse = import('expo-notifications').NotificationResponse;

/**
 * Subscribes to notification taps/actions. Returns a no-op unsubscribe
 * when notifications aren't supported in this environment, so callers
 * don't need their own guard.
 */
export function addNotificationResponseListener(
  callback: (response: NotificationResponse) => void,
): () => void {
  const Notifications = getNotifications();
  if (!Notifications) return () => {};

  const subscription = Notifications.addNotificationResponseReceivedListener(callback);
  return () => subscription.remove();
}
