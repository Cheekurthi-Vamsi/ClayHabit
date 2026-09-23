import type { SQLiteDatabase } from 'expo-sqlite';

import * as noteRepository from '@/data/repositories/note-repository';
import * as taskRepository from '@/data/repositories/task-repository';
import { displayTitle } from '@/utils/markdown';
import { inlineText, parseNoteBlocks } from '@/utils/note-format';

/** The note's unticked checklist items, as plain text. */
export function openChecklistItems(body: string): string[] {
  return parseNoteBlocks(body)
    .filter((block) => block.type === 'checklist' && !block.checked)
    .map((block) => ('inline' in block ? inlineText(block.inline).trim() : ''))
    .filter(Boolean);
}

/**
 * Note → Task. `note` makes one task named after the note; `open-items`
 * makes one task per unticked checklist item (e.g. a meeting's action
 * items). Every task records the note as its source, so the task can link
 * back to it. Returns how many tasks were made.
 */
export async function createTasksFromNote(
  db: SQLiteDatabase,
  { noteId, mode }: { noteId: string; mode: 'note' | 'open-items' },
): Promise<number> {
  const note = await noteRepository.getById(db, noteId);
  if (!note) return 0;

  const titles = mode === 'note' ? [displayTitle(note)] : openChecklistItems(note.body);
  for (const title of titles) {
    await taskRepository.create(db, {
      title: title.slice(0, 200),
      description: mode === 'note' || note.isLocked ? null : `From note: ${displayTitle(note)}`,
      sourceType: 'NOTE',
      sourceId: note.id,
    });
  }
  return titles.length;
}
