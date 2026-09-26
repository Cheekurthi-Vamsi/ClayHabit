import { migrateDatabase } from '@/data/db/migrate';
import { LATEST_SCHEMA_VERSION } from '@/data/db/migrations';
import { CloudError } from '@/lib/cloud/cloud-error';
import { countUserRecords } from '@/lib/cloud/snapshot-bytes';
import type { SnapshotStore } from '@/lib/cloud/sync-engine';

import { WebDatabase } from './web-database';

/**
 * The sync engine's view of the browser database (the web twin of
 * src/lib/cloud/sqlite-snapshots.ts). The live database is plain and in
 * memory, so exporting is a straight serialize. An incoming Cloud copy is
 * opened on its own first, checked and brought up to this schema, and only
 * then swapped in whole.
 */
export function createWebSnapshots(db: WebDatabase): SnapshotStore {
  return {
    async exportSnapshot() {
      const version = (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0;
      return { bytes: db.exportBytes(), schemaVersion: version };
    },

    async importSnapshot(bytes) {
      let incoming: WebDatabase;
      try {
        incoming = await WebDatabase.fromBytes(bytes);
      } catch {
        throw new CloudError('corrupt', 'not a database');
      }
      try {
        const check = await incoming.getFirstAsync<{ quick_check: string }>('PRAGMA quick_check');
        if (check?.quick_check !== 'ok') throw new CloudError('corrupt', 'integrity check failed');

        const version = await incoming.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
        if ((version?.user_version ?? 0) > LATEST_SCHEMA_VERSION) throw new CloudError('newer-app');

        const tasks = await incoming.getFirstAsync<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tasks'",
        );
        if (!tasks) throw new CloudError('corrupt', 'not a ClayHabbit database');

        // An older snapshot catches up to this app's schema before it's used.
        await migrateDatabase(incoming);
        db.replaceWith(incoming.exportBytes());
      } finally {
        incoming.close();
      }
      // Per-connection settings (foreign keys) apply to the swapped-in data too.
      await migrateDatabase(db);
    },

    async hasUserData() {
      return (await countUserRecords(db)) > 0;
    },
  };
}
