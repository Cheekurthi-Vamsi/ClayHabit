import * as Notifications from 'expo-notifications';

export const TASK_REMINDER_CATEGORY = 'task-reminder';

let handlerConfigured = false;
let categoryConfigured = false;

export function configureNotificationHandler(): void {
  if (handlerConfigured) return;
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

export async function scheduleTaskReminder(input: ScheduleTaskReminderInput): Promise<string> {
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

export async function cancelReminder(notificationId: string | null): Promise<void> {
  if (!notificationId) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {});
}
