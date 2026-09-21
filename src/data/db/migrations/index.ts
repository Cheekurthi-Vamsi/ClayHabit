import type { SQLiteDatabase } from 'expo-sqlite';

import * as m0001 from './0001-init';
import * as m0002 from './0002-task-extensions';

export interface Migration {
  version: number;
  up: (db: SQLiteDatabase) => Promise<void>;
}

export const migrations: Migration[] = [
  { version: m0001.version, up: m0001.up },
  { version: m0002.version, up: m0002.up },
];
