import { backupDatabaseAsync, deserializeDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { migrateDatabase } from '@/data/db/migrate';
import { LATEST_SCHEMA_VERSION } from '@/data/db/migrations';

import { CloudError } from './cloud-error';
import { countUserRecords, markAsRollbackJournal } from './snapshot-bytes';
import type { SnapshotStore } from './sync-engine';

function ident(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

async function tableNames(db: SQLiteDatabase, schema: string): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM ${schema}.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
  );
  return rows.map((row) => row.name);
}

async function columnNames(db: SQLiteDatabase, schema: string, table: string): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA ${schema}.table_info(${ident(table)})`);
  return rows.map((row) => row.name);
}

/**
 * Snapshots of the phone's database for the Cloud. The database is encrypted
 * (SQLCipher), so a snapshot is made by exporting it into an in-memory,
 * unencrypted scratch database and serializing that; nothing plain touches
 * the disk, and the snapshot is sealed with AES-GCM before it leaves the phone.
 */
export function createSqliteSnapshots(db: SQLiteDatabase): SnapshotStore {
  return {
    async exportSnapshot() {
      const version = (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0;
      await db.execAsync(`ATTACH DATABASE ':memory:' AS plain KEY '';`);
      try {
        await db.execAsync(`SELECT sqlcipher_export('plain'); PRAGMA plain.user_version = ${Math.floor(version)};`);
        const bytes = markAsRollbackJournal(await db.serializeAsync('plain'));
        return { bytes, schemaVersion: version };
      } finally {
        await db.execAsync('DETACH DATABASE plain;').catch(() => {});
      }
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

        // An older snapshot catches up to this app's schema before it's copied in.
        await migrateDatabase(incoming);

        // SQLite's backup API can't write into an encrypted database, so the
        // snapshot is staged in an unencrypted in-memory schema on this same
        // connection and copied table by table in one transaction.
        await db.execAsync(`ATTACH DATABASE ':memory:' AS snap KEY '';`);
        try {
          await backupDatabaseAsync({ sourceDatabase: incoming, destDatabase: db, destDatabaseName: 'snap' });
          const staged = new Set(await tableNames(db, 'snap'));
          const statements: string[] = [];
          for (const table of await tableNames(db, 'main')) {
            statements.push(`DELETE FROM main.${ident(table)};`);
            if (!staged.has(table)) continue;
            const theirs = new Set(await columnNames(db, 'snap', table));
            const shared = (await columnNames(db, 'main', table)).filter((column) => theirs.has(column)).map(ident);
            if (shared.length === 0) continue;
            statements.push(
              `INSERT INTO main.${ident(table)} (${shared.join(', ')}) SELECT ${shared.join(', ')} FROM snap.${ident(table)};`,
            );
          }
          await db.execAsync('PRAGMA foreign_keys = OFF;');
          try {
            await db.execAsync(`BEGIN IMMEDIATE; ${statements.join(' ')} COMMIT;`);
          } catch (error) {
            await db.execAsync('ROLLBACK;').catch(() => {});
            throw error;
          }
        } finally {
          await db.execAsync('DETACH DATABASE snap;').catch(() => {});
        }
      } finally {
        await incoming.closeAsync().catch(() => {});
      }
      // Foreign keys come back on (and any pending migration runs) for the live database.
      await migrateDatabase(db);
    },

    async hasUserData() {
      return (await countUserRecords(db)) > 0;
    },
  };
}
