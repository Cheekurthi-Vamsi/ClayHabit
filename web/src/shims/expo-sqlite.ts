import { createContext, useContext } from 'react';

/**
 * The slice of expo-sqlite the shared code (src/data and the feature hooks)
 * uses, provided in the browser by `WebDatabase` (lib/web-database.ts).
 */
export type SQLiteBindValue = string | number | null | boolean | Uint8Array;

export interface SQLiteRunResult {
  lastInsertRowId: number;
  changes: number;
}

export interface SQLiteDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: unknown[]): Promise<SQLiteRunResult>;
  getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]>;
  getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null>;
}

export const SQLiteContext = createContext<SQLiteDatabase | null>(null);

export function useSQLiteContext(): SQLiteDatabase {
  const db = useContext(SQLiteContext);
  if (!db) throw new Error('useSQLiteContext needs the unlocked database (DatabaseProvider)');
  return db;
}
