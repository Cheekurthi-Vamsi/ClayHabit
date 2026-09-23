import type { SQLiteDatabase } from 'expo-sqlite';

import { splitTitleFromBody } from '@/utils/markdown';

export const version = 12;

/**
 * The Notes workspace:
 *
 * - notes: a type (standard, checklist, meeting, …), favourite and locked
 *   flags, a reminder, and a `version` counter bumped on every edit (ready
 *   for record-level sync conflict checks).
 * - folders: an icon and a manual sort order.
 * - tasks: `source_type` / `source_id`, so a task made from a note links back.
 * - note_revisions: snapshots taken on meaningful edits (see note-repository).
 * - note_attachments: files attached to a note (schema only, for now).
 *
 * Notes also gain a real title. Until now the title was just a cached copy of
 * the body's first line; that line moves into the title so it isn't shown twice.
 *
 * Every column add is guarded so a re-run after an interrupted launch is safe.
 */
export async function up(db: SQLiteDatabase) {
  const addColumns = async (table: string, columns: [string, string][]) => {
    const existing = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
    for (const [name, definition] of columns) {
      if (!existing.some((column) => column.name === name)) {
        await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition};`);
      }
    }
  };

  await addColumns('notes', [
    ['note_type', "TEXT NOT NULL DEFAULT 'standard'"],
    ['is_favorite', 'INTEGER NOT NULL DEFAULT 0'],
    ['is_locked', 'INTEGER NOT NULL DEFAULT 0'],
    ['reminder_at', 'TEXT'],
    ['notification_id', 'TEXT'],
    ['version', 'INTEGER NOT NULL DEFAULT 1'],
  ]);
  await addColumns('folders', [
    ['icon', 'TEXT'],
    ['sort_order', 'INTEGER NOT NULL DEFAULT 0'],
  ]);
  await addColumns('tasks', [
    ['source_type', 'TEXT'],
    ['source_id', 'TEXT'],
  ]);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS note_revisions (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS note_attachments (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      uri TEXT NOT NULL,
      name TEXT NOT NULL,
      size INTEGER,
      mime_type TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_notes_note_type ON notes(note_type);
    CREATE INDEX IF NOT EXISTS idx_notes_is_favorite ON notes(is_favorite);
    CREATE INDEX IF NOT EXISTS idx_notes_is_archived ON notes(is_archived);
    CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON note_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_note_revisions_note_id ON note_revisions(note_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_note_attachments_note_id ON note_attachments(note_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_source ON tasks(source_type, source_id);
  `);

  // Title = the cached first line → move that line out of the body.
  const notes = await db.getAllAsync<{ id: string; title: string; body: string }>('SELECT id, title, body FROM notes');
  for (const note of notes) {
    const split = splitTitleFromBody(note.body);
    if (split.title && split.title === note.title) {
      await db.runAsync('UPDATE notes SET body = ? WHERE id = ?', split.body, note.id);
    }
  }
}
