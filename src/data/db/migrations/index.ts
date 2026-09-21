import type { SQLiteDatabase } from 'expo-sqlite';

import * as m0001 from './0001-init';
import * as m0002 from './0002-task-extensions';
import * as m0003 from './0003-streaks';
import * as m0004 from './0004-notes';
import * as m0005 from './0005-reminders';
import * as m0006 from './0006-calendar-goals-focus';
import * as m0007 from './0007-habits';
import * as m0008 from './0008-habit-icons';

export interface Migration {
  version: number;
  up: (db: SQLiteDatabase) => Promise<void>;
}

export const migrations: Migration[] = [
  { version: m0001.version, up: m0001.up },
  { version: m0002.version, up: m0002.up },
  { version: m0003.version, up: m0003.up },
  { version: m0004.version, up: m0004.up },
  { version: m0005.version, up: m0005.up },
  { version: m0006.version, up: m0006.up },
  { version: m0007.version, up: m0007.up },
  { version: m0008.version, up: m0008.up },
];
