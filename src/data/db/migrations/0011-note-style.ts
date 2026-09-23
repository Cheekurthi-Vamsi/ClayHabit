import type { SQLiteDatabase } from 'expo-sqlite';

import { deriveTitleFromBody } from '@/utils/markdown';

export const version = 11;

/**
 * Notes get a colour (`default`, `yellow`, `peach`, …) and a paper
 * (`grid`, `lines`, `dots`, `plain`). A null paper follows the default in
 * Settings → Notes, so changing that setting restyles every note that never
 * picked its own.
 *
 * It also fills in titles: they were meant to be cached from each note's
 * first line but never were, so every note read "New Note" in lists.
 *
 * Guarded so a re-run after an interrupted launch doesn't fail on the
 * already-added column.
 */
export async function up(db: SQLiteDatabase) {
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(notes)');
  const has = (name: string) => columns.some((column) => column.name === name);
  if (!has('color')) await db.execAsync("ALTER TABLE notes ADD COLUMN color TEXT NOT NULL DEFAULT 'default';");
  if (!has('paper')) await db.execAsync('ALTER TABLE notes ADD COLUMN paper TEXT;');

  const untitled = await db.getAllAsync<{ id: string; body: string }>("SELECT id, body FROM notes WHERE title = ''");
  for (const note of untitled) {
    const title = deriveTitleFromBody(note.body);
    if (title) await db.runAsync('UPDATE notes SET title = ? WHERE id = ?', title, note.id);
  }
}
