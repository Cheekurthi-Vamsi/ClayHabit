import * as dataRepository from '@/data/repositories/data-repository';
import * as noteRepository from '@/data/repositories/note-repository';
import * as taskRepository from '@/data/repositories/task-repository';
import * as transactionRepository from '@/data/repositories/finance/transaction-repository';
import { countUserRecords, markAsRollbackJournal } from '@/lib/cloud/snapshot-bytes';
import { todayIso } from '@/utils/date';

import { migrateDatabase } from '../migrate';
import { createTestDb } from '../testing/create-test-db';

async function seeded() {
  const db = createTestDb();
  await migrateDatabase(db);
  await taskRepository.create(db, { title: 'Pay rent', priority: 'high' });
  await noteRepository.create(db, { body: 'Groceries\n- milk' });
  await transactionRepository.create(db, { type: 'expense', amountMinor: 12_000, occurredOn: todayIso() });
  return db;
}

describe('dataRepository', () => {
  it('counts what the person made', async () => {
    const db = await seeded();
    expect(await dataRepository.summarize(db)).toEqual({
      tasks: 1,
      notes: 1,
      habits: 0,
      transactions: 1,
      goals: 0,
      events: 0,
    });
  });

  it('erases everything and puts back the built-in finance defaults', async () => {
    const db = await seeded();
    await dataRepository.eraseAll(db);

    expect(await dataRepository.summarize(db)).toEqual({
      tasks: 0,
      notes: 0,
      habits: 0,
      transactions: 0,
      goals: 0,
      events: 0,
    });
    const categories = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM fin_categories');
    expect(categories?.count).toBeGreaterThan(0);
    const accounts = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM fin_accounts');
    expect(accounts?.count).toBe(1);
    const fk = await db.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys');
    expect(fk?.foreign_keys).toBe(1);
    // Still usable afterwards.
    await transactionRepository.create(db, { type: 'income', amountMinor: 500, occurredOn: todayIso() });
  });
});

describe('Cloud snapshot helpers', () => {
  it('treats a fresh install as empty, so the Cloud copy restores without asking', async () => {
    const db = createTestDb();
    await migrateDatabase(db);
    expect(await countUserRecords(db)).toBe(0);
    await taskRepository.create(db, { title: 'x' });
    expect(await countUserRecords(db)).toBe(1);
  });

  it('marks WAL images as rollback-journal so they can be opened in memory', () => {
    const header = new Uint8Array(100);
    header[18] = 2;
    header[19] = 2;
    markAsRollbackJournal(header);
    expect([header[18], header[19]]).toEqual([1, 1]);

    const legacy = new Uint8Array(100);
    legacy[18] = 1;
    legacy[19] = 1;
    expect(Array.from(markAsRollbackJournal(legacy).slice(18, 20))).toEqual([1, 1]);
  });
});
