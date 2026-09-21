import * as goalRepository from '@/data/repositories/goal-repository';
import * as taskRepository from '@/data/repositories/task-repository';

import { migrateDatabase } from '../migrate';
import { createTestDb } from '../testing/create-test-db';

describe('goalRepository', () => {
  it('computes task progress for a goal with no linked tasks', async () => {
    const db = createTestDb();
    await migrateDatabase(db);

    const goal = await goalRepository.create(db, { title: 'Learn Rust' });
    const [withProgress] = await goalRepository.listAll(db);

    expect(withProgress.id).toBe(goal.id);
    expect(withProgress.taskCount).toBe(0);
    expect(withProgress.completedTaskCount).toBe(0);
  });

  it('counts completed vs total linked tasks', async () => {
    const db = createTestDb();
    await migrateDatabase(db);

    const goal = await goalRepository.create(db, { title: 'Become job-ready in cybersecurity' });
    const taskA = await taskRepository.create(db, { title: 'Study Nmap', goalId: goal.id });
    await taskRepository.create(db, { title: 'Study Wireshark', goalId: goal.id });
    await taskRepository.create(db, { title: 'Unrelated task' });

    await taskRepository.setCompleted(db, taskA.id, true);

    const [withProgress] = await goalRepository.listAll(db);
    expect(withProgress.taskCount).toBe(2);
    expect(withProgress.completedTaskCount).toBe(1);
  });

  it('excludes archived tasks from the progress count', async () => {
    const db = createTestDb();
    await migrateDatabase(db);

    const goal = await goalRepository.create(db, { title: 'Ship the app' });
    const task = await taskRepository.create(db, { title: 'Old idea', goalId: goal.id });
    await taskRepository.setArchived(db, task.id, true);

    const [withProgress] = await goalRepository.listAll(db);
    expect(withProgress.taskCount).toBe(0);
  });
});
