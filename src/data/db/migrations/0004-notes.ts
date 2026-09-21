import type { SQLiteDatabase } from 'expo-sqlite';

export const version = 4;

export async function up(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      is_trashed INTEGER NOT NULL DEFAULT 0,
      trashed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS note_tags (
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (note_id, tag_id)
    );

    CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id);
    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
    CREATE INDEX IF NOT EXISTS idx_notes_is_pinned ON notes(is_pinned);
    CREATE INDEX IF NOT EXISTS idx_notes_is_trashed ON notes(is_trashed);
    CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id);
  `);
}
