import * as activityRepository from '@/data/repositories/activity-repository';
import * as projectRepository from '@/data/repositories/project-repository';
import * as subtaskRepository from '@/data/repositories/subtask-repository';
import * as tagRepository from '@/data/repositories/tag-repository';
import * as taskRepository from '@/data/repositories/task-repository';
import { todayIso } from '@/utils/date';

import { migrateDatabase } from '../migrate';
import { createTestDb } from '../testing/create-test-db';

describe('migrations + taskRepository', () => {
  it('creates the schema and tracks user_version', async () => {
    const db = createTestDb();
    await migrateDatabase(db);

    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(version?.user_version).toBe(7);

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

    const today = todayIso();
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

  it('excludes archived tasks from listAll by default', async () => {
    const db = createTestDb();
    await migrateDatabase(db);

    const task = await taskRepository.create(db, { title: 'Old idea' });
    await taskRepository.setArchived(db, task.id, true);

    const visible = await taskRepository.listAll(db);
    expect(visible.map((t) => t.id)).not.toContain(task.id);

    const withArchived = await taskRepository.listAll(db, { includeArchived: true });
    expect(withArchived.map((t) => t.id)).toContain(task.id);
  });

  it('filters tasks by project', async () => {
    const db = createTestDb();
    await migrateDatabase(db);

    const project = await projectRepository.create(db, { name: 'Cybersecurity', color: '#6C5CE7' });
    const inProject = await taskRepository.create(db, { title: 'Study Nmap', projectId: project.id });
    await taskRepository.create(db, { title: 'Unrelated task' });

    const filtered = await taskRepository.listAll(db, { projectId: project.id });
    expect(filtered.map((t) => t.id)).toEqual([inProject.id]);
  });

  it('attaches tags to a task and reads them back', async () => {
    const db = createTestDb();
    await migrateDatabase(db);

    const task = await taskRepository.create(db, { title: 'Read RFC 9110' });
    const tag = await tagRepository.findOrCreateByName(db, 'reading');
    await tagRepository.setTagsForTask(db, task.id, [tag.id]);

    const details = await taskRepository.getWithDetails(db, task.id);
    expect(details?.tags.map((t) => t.name)).toEqual(['reading']);
  });

  it('adds and completes subtasks independently of the parent task', async () => {
    const db = createTestDb();
    await migrateDatabase(db);

    const task = await taskRepository.create(db, { title: 'Plan launch' });
    const subtask = await subtaskRepository.create(db, task.id, 'Write changelog');
    await subtaskRepository.setCompleted(db, subtask.id, true);

    const details = await taskRepository.getWithDetails(db, task.id);
    expect(details?.subtasks).toHaveLength(1);
    expect(details?.subtasks[0]?.isCompleted).toBe(true);
    expect(details?.isCompleted).toBe(false);
  });

  it('creates the next occurrence when a recurring task is completed', async () => {
    const db = createTestDb();
    await migrateDatabase(db);

    const today = todayIso();
    const task = await taskRepository.create(db, {
      title: 'Daily standup',
      dueDate: today,
      repeatRule: 'daily',
    });

    await taskRepository.setCompleted(db, task.id, true);

    const all = await taskRepository.listAll(db, { includeArchived: true });
    const nextInstance = all.find((t) => t.title === 'Daily standup' && t.id !== task.id);

    expect(nextInstance).toBeDefined();
    expect(nextInstance?.dueDate).not.toBe(today);
    expect(nextInstance?.isCompleted).toBe(false);
  });

  it('logs a completion for the overall streak, and removes it when un-completed', async () => {
    const db = createTestDb();
    await migrateDatabase(db);

    const task = await taskRepository.create(db, { title: 'One-off task', dueDate: todayIso() });

    await taskRepository.setCompleted(db, task.id, true);
    expect(await activityRepository.activeDates(db)).toContain(todayIso());
    expect(await taskRepository.getStreakDates(db, task.seriesId)).toEqual([todayIso()]);

    await taskRepository.setCompleted(db, task.id, false);
    expect(await activityRepository.activeDates(db)).not.toContain(todayIso());
  });

  it('shares one series id across a recurring task and its next occurrence', async () => {
    const db = createTestDb();
    await migrateDatabase(db);

    const task = await taskRepository.create(db, {
      title: 'Morning pages',
      dueDate: todayIso(),
      repeatRule: 'daily',
    });

    await taskRepository.setCompleted(db, task.id, true);

    const all = await taskRepository.listAll(db, { includeArchived: true });
    const next = all.find((t) => t.id !== task.id && t.title === 'Morning pages');

    expect(next?.seriesId).toBe(task.seriesId);

    const streakDates = await taskRepository.getStreakDates(db, task.seriesId);
    expect(streakDates).toEqual([todayIso()]);
  });
});
