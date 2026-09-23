import type { SQLiteDatabase } from 'expo-sqlite';

import * as noteRepository from '@/data/repositories/note-repository';
import type { Note } from '@/domain/entities/note';
import {
  cancelReminder,
  requestPermission,
  scheduleNoteReminder as scheduleNotification,
} from '@/lib/notifications/notification-service';
import { displayTitle } from '@/utils/markdown';

/**
 * Note reminders ride on the app's one notification system
 * (lib/notifications). A locked note's reminder never shows its title.
 */
export async function scheduleNoteReminder(db: SQLiteDatabase, note: Note, at: Date): Promise<boolean> {
  const granted = await requestPermission();
  if (!granted) return false;
  const notificationId = await scheduleNotification({
    noteId: note.id,
    title: note.isLocked ? 'Locked note' : displayTitle(note),
    body: 'Reminder from ClayHabbit Notes',
    date: at,
  });
  await noteRepository.setReminder(db, note.id, { at: at.toISOString(), notificationId });
  return true;
}

export async function cancelNoteReminder(db: SQLiteDatabase, note: Note | null): Promise<void> {
  if (!note?.reminderAt && !note?.notificationId) return;
  await cancelReminder(note.notificationId);
  await noteRepository.setReminder(db, note.id, { at: null, notificationId: null });
}

/** After a Cloud restore replaced the data: put every upcoming note reminder back. */
export async function rescheduleNoteReminders(db: SQLiteDatabase): Promise<void> {
  const notes = await noteRepository.listUpcomingReminders(db);
  for (const note of notes) {
    if (!note.reminderAt) continue;
    await scheduleNoteReminder(db, note, new Date(note.reminderAt)).catch(() => {});
  }
}
