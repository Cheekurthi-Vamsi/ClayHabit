import * as SecureStore from 'expo-secure-store';
import { deleteDatabaseAsync, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { DataKey } from './keyring';
import { sqlcipherKey } from './vault-store';

/**
 * The phone's database, encrypted with SQLCipher under the account's data key.
 *
 * Encrypted databases live under a new name (`x.db` → `x.secure.db`), so an
 * existing install is migrated by copying, never in place: the plain file is
 * deleted only after the encrypted copy reopens with the key, every table
 * holds the same number of rows and that result is recorded. A crash midway
 * leaves the plain file intact and the migration simply runs again.
 */

export function secureDatabaseName(plainName: string): string {
  return `${plainName.replace(/\.db$/, '')}.secure.db`;
}

/** Runs first on every connection to an encrypted database. */
export async function applyDatabaseKey(db: SQLiteDatabase, dataKey: DataKey): Promise<void> {
  await db.execAsync(`PRAGMA key = ${sqlcipherKey(dataKey)};`);
}

function quotePath(path: string): string {
  return `'${path.replace(/'/g, "''")}'`;
}

async function tableCounts(db: SQLiteDatabase, schema = 'main'): Promise<Map<string, number>> {
  const tables = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM ${schema}.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`,
  );
  const counts = new Map<string, number>();
  for (const { name } of tables) {
    const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${schema}."${name.replace(/"/g, '""')}"`);
    counts.set(name, row?.n ?? 0);
  }
  return counts;
}

async function openKeyed(name: string, dataKey: DataKey): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(name, { useNewConnection: true });
  await applyDatabaseKey(db, dataKey);
  return db;
}

export class DatabaseKeyError extends Error {
  constructor() {
    super('This phone’s data is locked with a different key.');
    this.name = 'DatabaseKeyError';
  }
}

function migratedFlag(plainName: string): string {
  return `clayhabit.vault.migrated.${plainName.replace(/[^A-Za-z0-9._-]/g, '_')}`;
}

/**
 * Makes sure the encrypted database exists and holds this account's data,
 * migrating the plain one the first time. Returns the name to open.
 *
 * The plain file is deleted only after a verified copy is recorded (a flag in
 * the Keystore). Without that flag, whatever is in the encrypted file is a
 * half-finished copy: it's thrown away and the copy is redone.
 */
export async function prepareSecureDatabase(plainName: string, dataKey: DataKey): Promise<string> {
  const secureName = secureDatabaseName(plainName);
  const verified = (await SecureStore.getItemAsync(migratedFlag(plainName))) === '1';

  const plain = await openDatabaseAsync(plainName, { useNewConnection: true });
  let plainCounts: Map<string, number>;
  let version = 0;
  try {
    plainCounts = await tableCounts(plain).catch(() => new Map<string, number>());
    version = (await plain.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0;
  } catch {
    plainCounts = new Map();
  }

  try {
    if (plainCounts.size > 0 && !verified) {
      // Start from nothing: any earlier, unverified copy is discarded.
      await deleteDatabaseAsync(secureName).catch(() => {});
      const target = await openKeyed(secureName, dataKey);
      const securePath = target.databasePath;
      await target.getFirstAsync('SELECT COUNT(*) FROM sqlite_master');
      await target.closeAsync();

      await plain.execAsync(
        `ATTACH DATABASE ${quotePath(securePath)} AS secure KEY ${sqlcipherKey(dataKey)};
         SELECT sqlcipher_export('secure');
         PRAGMA secure.user_version = ${Math.floor(version)};
         DETACH DATABASE secure;`,
      );

      const check = await openKeyed(secureName, dataKey);
      try {
        const copied = await tableCounts(check);
        for (const [table, count] of plainCounts) {
          if (copied.get(table) !== count) throw new Error(`Encrypted copy of ${table} is incomplete`);
        }
        const copiedVersion = (await check.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version;
        if (copiedVersion !== version) throw new Error('Encrypted copy lost the schema version');
      } finally {
        await check.closeAsync();
      }
      await SecureStore.setItemAsync(migratedFlag(plainName), '1');
    }
  } finally {
    await plain.closeAsync().catch(() => {});
  }

  // The encrypted database must open with this key (a new one is created empty here).
  const secure = await openKeyed(secureName, dataKey);
  try {
    await secure.getFirstAsync('SELECT COUNT(*) FROM sqlite_master');
  } catch {
    throw new DatabaseKeyError();
  } finally {
    await secure.closeAsync().catch(() => {});
  }

  // Reached only with a verified copy, or when the plain file was empty (opening it created it).
  await deleteDatabaseAsync(plainName).catch(() => {});
  return secureName;
}

/**
 * Re-encrypts the open database under another key (joining a Cloud whose
 * passcode made a different key). SQLCipher can't re-key a WAL database,
 * so the journal is switched to rollback mode around it.
 */
export async function rekeyDatabase(db: SQLiteDatabase, dataKey: DataKey): Promise<void> {
  const mode = (await db.getFirstAsync<{ journal_mode: string }>('PRAGMA journal_mode'))?.journal_mode;
  const wal = mode?.toLowerCase() === 'wal';
  if (wal) await db.execAsync('PRAGMA journal_mode = DELETE;');
  await db.execAsync(`PRAGMA rekey = ${sqlcipherKey(dataKey)};`);
  if (wal) await db.execAsync('PRAGMA journal_mode = WAL;');
}
