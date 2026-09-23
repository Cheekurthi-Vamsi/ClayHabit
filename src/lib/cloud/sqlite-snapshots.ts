import { backupDatabaseAsync, deserializeDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { migrateDatabase } from '@/data/db/migrate';
import { LATEST_SCHEMA_VERSION } from '@/data/db/migrations';

import { CloudError } from './cloud-error';
import { countUserRecords, markAsRollbackJournal } from './snapshot-bytes';
import type { SnapshotStore } from './sync-engine';

export function createSqliteSnapshots(db: SQLiteDatabase): SnapshotStore {
  return {
    async exportSnapshot() {
      const bytes = markAsRollbackJournal(await db.serializeAsync());
      const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      return { bytes, schemaVersion: row?.user_version ?? 0 };
    },

    async importSnapshot(bytes) {
      const incoming = await deserializeDatabaseAsync(markAsRollbackJournal(bytes));
      try {
        const check = await incoming.getFirstAsync<{ quick_check: string }>('PRAGMA quick_check');
        if (check?.quick_check !== 'ok') throw new CloudError('corrupt', 'integrity check failed');

        const version = await incoming.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
        if ((version?.user_version ?? 0) > LATEST_SCHEMA_VERSION) throw new CloudError('newer-app');

        const tasks = await incoming.getFirstAsync<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tasks'",
        );
        if (!tasks) throw new CloudError('corrupt', 'not a ClayHabbit database');

        // SQLite's online backup copies every page into the open database in one step,
        // so the connection the app is using never has to close.
        await backupDatabaseAsync({ sourceDatabase: incoming, destDatabase: db });
      } finally {
        await incoming.closeAsync().catch(() => {});
      }
      // An older snapshot catches up to this app's schema, and foreign keys come back on.
      await migrateDatabase(db);
    },

    async hasUserData() {
      return (await countUserRecords(db)) > 0;
    },
  };
}
