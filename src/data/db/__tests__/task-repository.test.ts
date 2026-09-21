import * as taskRepository from '@/data/repositories/task-repository';

import { migrateDatabase } from '../migrate';
import { createTestDb } from '../testing/create-test-db';

describe('migrations + taskRepository', () => {
  it('creates the tasks table and tracks user_version', async () => {
    const db = createTestDb();
    await migrateDatabase(db);

    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(version?.user_version).toBe(1);

    const count = await taskRepository.countTable(db);
    expect(count).toBe(0);
  });

  it('seeds sample tasks only when the table is empty', async () => {
    const db = createTestDb();
    await migrateDatabase(db);

    await taskRepository.seedIfEmpty(db);
    const afterFirstSeed = await taskRepository.countTable(db);
    expect(afterFirstSeed).toBeGreaterThan(0);

    await taskRepository.seedIfEmpty(db);
    const afterSecondSeed = await taskRepository.countTable(db);
    expect(afterSecondSeed).toBe(afterFirstSeed);
  });

  it('creates a task and lists it for today', async () => {
    const db = createTestDb();
    await migrateDatabase(db);

    const today = new Date().toISOString().slice(0, 10);
    const created = await taskRepository.create(db, {
      title: 'Write streak engine tests',
      priority: 'high',
      dueDate: today,
    });

    expect(created.isCompleted).toBe(false);

    const todayTasks = await taskRepository.listToday(db, today);
    expect(todayTasks.map((task) => task.id)).toContain(created.id);
  });

  it('toggles task completion', async () => {
    const db = createTestDb();
    await migrateDatabase(db);

    const created = await taskRepository.create(db, { title: 'Ship Phase 1' });
    await taskRepository.setCompleted(db, created.id, true);

    const all = await taskRepository.listAll(db);
    const updated = all.find((task) => task.id === created.id);

    expect(updated?.isCompleted).toBe(true);
    expect(updated?.completedAt).not.toBeNull();
  });
});
