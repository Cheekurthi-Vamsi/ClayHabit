import * as folderRepository from '@/data/repositories/folder-repository';
import * as noteRepository from '@/data/repositories/note-repository';
import * as tagRepository from '@/data/repositories/tag-repository';

import { migrateDatabase } from '../migrate';
import { createTestDb } from '../testing/create-test-db';

describe('noteRepository', () => {
  it('creates a note and updates its body', async () => {
    const db = createTestDb();
    await migrateDatabase(db);

    const note = await noteRepository.create(db);
    expect(note.title).toBe('');

    await noteRepository.update(db, note.id, { title: 'Project Ideas', body: 'Project Ideas\nDetails' });

    const updated = await noteRepository.getById(db, note.id);
    expect(updated?.title).toBe('Project Ideas');
    expect(updated?.body).toBe('Project Ideas\nDetails');
  });

  it('lists pinned notes before unpinned notes', async () => {
    const db = createTestDb();
    await migrateDatabase(db);

    const first = await noteRepository.create(db, { title: 'First' });
    const second = await noteRepository.create(db, { title: 'Second' });
    await noteRepository.setPinned(db, second.id, true);

    const list = await noteRepository.listAll(db);
    expect(list[0]?.id).toBe(second.id);
    expect(list[1]?.id).toBe(first.id);
  });

  it('searches by title and body', async () => {
    const db = createTestDb();
    await migrateDatabase(db);

    await noteRepository.create(db, { title: 'Cybersecurity', body: 'Cybersecurity\nNetwork analysis' });
    await noteRepository.create(db, { title: 'Groceries', body: 'Groceries\nMilk, eggs' });

    const results = await noteRepository.search(db, 'network');
    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe('Cybersecurity');
  });

  it('moves a note to trash and restores it', async () => {
    const db = createTestDb();
    await migrateDatabase(db);

    const note = await noteRepository.create(db, { title: 'Temp' });
    await noteRepository.moveToTrash(db, note.id);

    expect(await noteRepository.listAll(db)).toHaveLength(0);
    expect(await noteRepository.listAll(db, { view: 'trashed' })).toHaveLength(1);

    await noteRepository.restoreFromTrash(db, note.id);
    expect(await noteRepository.listAll(db)).toHaveLength(1);
  });

  it('empties the trash permanently', async () => {
    const db = createTestDb();
    await migrateDatabase(db);

    const note = await noteRepository.create(db, { title: 'Temp' });
    await noteRepository.moveToTrash(db, note.id);
    await noteRepository.emptyTrash(db);

    expect(await noteRepository.getById(db, note.id)).toBeNull();
  });

  it('assigns a folder and filters notes by it', async () => {
    const db = createTestDb();
    await migrateDatabase(db);

    const folder = await folderRepository.create(db, { name: 'Work', color: '#6C5CE7' });
    const note = await noteRepository.create(db, { title: 'In folder', folderId: folder.id });
    await noteRepository.create(db, { title: 'Not in folder' });

    const filtered = await noteRepository.listAll(db, { folderId: folder.id });
    expect(filtered.map((n) => n.id)).toEqual([note.id]);
  });

  it('attaches tags and reads them back with the note', async () => {
    const db = createTestDb();
    await migrateDatabase(db);

    const note = await noteRepository.create(db, { title: 'Tagged' });
    const tag = await tagRepository.findOrCreateByName(db, 'ideas');
    await noteRepository.setTags(db, note.id, [tag.id]);

    const withTags = await noteRepository.getWithTags(db, note.id);
    expect(withTags?.tags.map((t) => t.name)).toEqual(['ideas']);
  });
});
