import type { SQLiteDatabase } from 'expo-sqlite';

import * as m0001 from './0001-init';

export interface Migration {
  version: number;
  up: (db: SQLiteDatabase) => Promise<void>;
}

export const migrations: Migration[] = [{ version: m0001.version, up: m0001.up }];
