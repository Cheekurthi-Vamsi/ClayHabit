import sqlite3InitModule, { type Database, type Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import type { SQLiteDatabase, SQLiteRunResult } from 'expo-sqlite';

import { migrateDatabase } from '@/data/db/migrate';
import { markAsRollbackJournal } from '@/lib/cloud/snapshot-bytes';

/**
 * The browser's database: SQLite compiled to WebAssembly, **in memory only**.
 * Nothing is ever written to the browser's storage. The data comes from the
 * encrypted Cloud copy and goes back to it (see lib/cloud-session.ts).
 *
 * `WebDatabase` speaks the four-method slice of expo-sqlite that the phone's
 * repositories, migrations and feature hooks use, so all of them run here
 * unchanged.
 */

let sqlite: Promise<Sqlite3Static> | null = null;

function loadSqlite(): Promise<Sqlite3Static> {
  sqlite ??= sqlite3InitModule();
  return sqlite;
}

type Bindable = string | number | null | bigint | Uint8Array;

/** expo-sqlite takes parameters as varargs, one array, or one `$name` object. */
function bindingsOf(params: unknown[]): Bindable[] | Record<string, Bindable> | undefined {
  if (params.length === 0) return undefined;
  const single = params.length === 1 ? params[0] : undefined;
  if (Array.isArray(single)) return single.map(toBindable);
  if (single && typeof single === 'object' && !(single instanceof Uint8Array)) {
    return Object.fromEntries(Object.entries(single).map(([key, value]) => [key, toBindable(value)]));
  }
  return params.map(toBindable);
}

function toBindable(value: unknown): Bindable {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') return value;
  if (value instanceof Uint8Array) return value;
  return String(value);
}

type ChangeListener = () => void;

export class WebDatabase implements SQLiteDatabase {
  private readonly listeners = new Set<ChangeListener>();

  private constructor(
    private readonly sqlite3: Sqlite3Static,
    private readonly db: Database,
  ) {}

  /** An empty in-memory database with this app's schema. */
  static async create(): Promise<WebDatabase> {
    const sqlite3 = await loadSqlite();
    const database = new WebDatabase(sqlite3, new sqlite3.oo1.DB(':memory:', 'c'));
    await migrateDatabase(database);
    return database;
  }

  /** A database opened from snapshot bytes, as they are (no migrations run). */
  static async fromBytes(bytes: Uint8Array): Promise<WebDatabase> {
    const sqlite3 = await loadSqlite();
    const database = new WebDatabase(sqlite3, new sqlite3.oo1.DB(':memory:', 'c'));
    database.load(bytes);
    return database;
  }

  // ---- expo-sqlite surface ---------------------------------------------------------------

  async execAsync(source: string): Promise<void> {
    const before = this.totalChanges();
    this.db.exec(source);
    this.notifyIfChanged(before);
  }

  async runAsync(source: string, ...params: unknown[]): Promise<SQLiteRunResult> {
    const before = this.totalChanges();
    this.db.exec({ sql: source, bind: bindingsOf(params) });
    const changes = this.db.changes(false, false) as number;
    const lastInsertRowId = Number(this.sqlite3.capi.sqlite3_last_insert_rowid(this.db));
    this.notifyIfChanged(before);
    return { changes, lastInsertRowId };
  }

  async getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]> {
    return this.db.selectObjects(source, bindingsOf(params)) as T[];
  }

  async getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null> {
    return (this.db.selectObject(source, bindingsOf(params)) as T | undefined) ?? null;
  }

  // ---- snapshots ---------------------------------------------------------------------------

  /** The whole database as SQLite file bytes (what the Cloud copy seals). */
  exportBytes(): Uint8Array {
    return markAsRollbackJournal(this.sqlite3.capi.sqlite3_js_db_export(this.db));
  }

  /**
   * Replaces this database's contents with `bytes`, in place (the connection stays).
   * Not reported as a change: it's the Cloud's copy arriving, not an edit to send back.
   */
  replaceWith(bytes: Uint8Array): void {
    this.load(bytes);
  }

  close(): void {
    this.listeners.clear();
    this.db.close();
  }

  /** Called after every write that changed a row: the sync schedules an upload. */
  onChange(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private load(bytes: Uint8Array): void {
    const { capi, wasm } = this.sqlite3;
    const image = markAsRollbackJournal(new Uint8Array(bytes));
    const pointer = wasm.allocFromTypedArray(image);
    const rc = capi.sqlite3_deserialize(
      this.db,
      'main',
      pointer,
      image.byteLength,
      image.byteLength,
      capi.SQLITE_DESERIALIZE_FREEONCLOSE | capi.SQLITE_DESERIALIZE_RESIZEABLE,
    );
    this.db.checkRc(rc);
  }

  private totalChanges(): number {
    return this.db.changes(true, false) as number;
  }

  private notifyIfChanged(before: number): void {
    if (this.totalChanges() !== before) this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
