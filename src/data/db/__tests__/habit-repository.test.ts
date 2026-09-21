import * as activityRepository from '@/data/repositories/activity-repository';
import * as habitRepository from '@/data/repositories/habit-repository';
import * as taskRepository from '@/data/repositories/task-repository';
import { todayIso } from '@/utils/date';

import { migrateDatabase } from '../migrate';
import { createTestDb } from '../testing/create-test-db';

async function setup() {
  const db = createTestDb();
  await migrateDatabase(db);
  return db;
}

describe('habitRepository', () => {
  it('creates a habit with a sane default schedule and target', async () => {
    const db = await setup();
    const habit = await habitRepository.create(db, { name: ' Read ', emoji: '📚', color: 'blue' });

    expect(habit.name).toBe('Read');
    expect(habit.targetPerDay).toBe(1);
    expect(habit.daysOfWeek).toBe('1111111');
    expect(await habitRepository.listActive(db)).toHaveLength(1);
  });

  it('rejects an empty schedule by falling back to every day', async () => {
    const db = await setup();
    const habit = await habitRepository.create(db, {
      name: 'Gym',
      emoji: '💪',
      color: 'pink',
      daysOfWeek: '0000000',
    });
    expect(habit.daysOfWeek).toBe('1111111');
  });

  it('orders habits by creation via sort_order', async () => {
    const db = await setup();
    await habitRepository.create(db, { name: 'First', emoji: '1️⃣', color: 'purple' });
    await habitRepository.create(db, { name: 'Second', emoji: '2️⃣', color: 'mint' });
    const names = (await habitRepository.listActive(db)).map((h) => h.name);
    expect(names).toEqual(['First', 'Second']);
  });

  it('increments, decrements, and clears a day of check-ins', async () => {
    const db = await setup();
    const habit = await habitRepository.create(db, {
      name: 'Water',
      emoji: '💧',
      color: 'cyan',
      targetPerDay: 8,
    });
    const today = todayIso();

    expect(await habitRepository.adjustCount(db, habit.id, today, 1)).toBe(1);
    expect(await habitRepository.adjustCount(db, habit.id, today, 1)).toBe(2);
    expect(await habitRepository.adjustCount(db, habit.id, today, -5)).toBe(0);
    expect(await habitRepository.getLogs(db, habit.id)).toEqual({});
  });

  it('loads every active habit with its logs in one pass, excluding archived', async () => {
    const db = await setup();
    const kept = await habitRepository.create(db, { name: 'Walk', emoji: '🏃', color: 'mint' });
    const archived = await habitRepository.create(db, { name: 'Old', emoji: '🗑️', color: 'amber' });
    await habitRepository.setCount(db, kept.id, '2026-09-20', 1);
    await habitRepository.setCount(db, archived.id, '2026-09-20', 1);
    await habitRepository.setArchived(db, archived.id, true);

    const habits = await habitRepository.listActiveWithLogs(db);
    expect(habits.map((h) => h.id)).toEqual([kept.id]);
    expect(habits[0].logs).toEqual({ '2026-09-20': 1 });
  });

  it('removes logs along with the habit', async () => {
    const db = await setup();
    const habit = await habitRepository.create(db, { name: 'Tmp', emoji: '⏳', color: 'purple' });
    await habitRepository.setCount(db, habit.id, '2026-09-20', 2);
    await habitRepository.remove(db, habit.id);

    const orphan = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) as n FROM habit_logs');
    expect(orphan?.n).toBe(0);
  });

  it('updates fields and clamps the daily target', async () => {
    const db = await setup();
    const habit = await habitRepository.create(db, { name: 'Pushups', emoji: '💪', color: 'pink' });
    await habitRepository.update(db, habit.id, { targetPerDay: 500, color: 'blue', daysOfWeek: '1010100' });

    const updated = await habitRepository.getById(db, habit.id);
    expect(updated?.targetPerDay).toBe(99);
    expect(updated?.color).toBe('blue');
    expect(updated?.daysOfWeek).toBe('1010100');
  });
});

describe('activityRepository', () => {
  it('merges task completions and habit check-ins by local date', async () => {
    const db = await setup();
    const today = todayIso();

    const task = await taskRepository.create(db, { title: 'Ship it', dueDate: today });
    await taskRepository.setCompleted(db, task.id, true);
    const habit = await habitRepository.create(db, { name: 'Water', emoji: '💧', color: 'cyan' });
    await habitRepository.setCount(db, habit.id, today, 3);

    const { tasks, habits, total } = await activityRepository.countsByDate(db, today, today);
    expect(tasks[today]).toBe(1);
    expect(habits[today]).toBe(3);
    expect(total[today]).toBe(4);
  });

  it('reports every date with any activity for the app-wide streak', async () => {
    const db = await setup();
    const habit = await habitRepository.create(db, { name: 'Read', emoji: '📚', color: 'blue' });
    await habitRepository.setCount(db, habit.id, '2026-09-19', 1);
    await habitRepository.setCount(db, habit.id, '2026-09-20', 1);

    expect(await activityRepository.activeDates(db)).toEqual(['2026-09-19', '2026-09-20']);
  });
});
