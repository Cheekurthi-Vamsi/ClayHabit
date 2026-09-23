import * as folderRepository from '@/data/repositories/folder-repository';
import * as noteRepository from '@/data/repositories/note-repository';
import * as tagRepository from '@/data/repositories/tag-repository';

import { migrateDatabase } from '../migrate';
import { migrations } from '../migrations';
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

  it('saves the title and body independently, bumping the version each time', async () => {
    const db = createTestDb();
    await migrateDatabase(db);

    const note = await noteRepository.create(db, { title: 'Weekend plan', body: '- [ ] Hike' });
    await noteRepository.update(db, note.id, { body: '- [x] Hike' });
    await noteRepository.update(db, note.id, { title: 'Trip' });
    // Moving folders doesn't touch the text.
    await noteRepository.update(db, note.id, { folderId: null });

    expect(await noteRepository.getById(db, note.id)).toMatchObject({ title: 'Trip', body: '- [x] Hike', version: 4 });
  });

  it('stores a colour and paper per note, defaulting to plain white and the app-wide paper', async () => {
    const db = createTestDb();
    await migrateDatabase(db);

    const note = await noteRepository.create(db, { body: 'Hi' });
    expect(note).toMatchObject({ color: 'default', paper: null });

    await noteRepository.update(db, note.id, { color: 'mint', paper: 'dots' });
    expect(await noteRepository.getById(db, note.id)).toMatchObject({ color: 'mint', paper: 'dots', body: 'Hi' });

    await noteRepository.update(db, note.id, { paper: null });
    expect(await noteRepository.getById(db, note.id)).toMatchObject({ color: 'mint', paper: null });
  });

  it('backfills titles for notes saved before titles were cached', async () => {
    const db = createTestDb();
    for (const migration of migrations.filter((m) => m.version <= 10)) await migration.up(db);
    await db.execAsync('PRAGMA user_version = 10');
    await db.runAsync(
      "INSERT INTO notes (id, title, body, created_at, updated_at) VALUES ('n1', '', ?, 'x', 'x')",
      ['## Old note', 'body'].join('\n'),
    );

    await migrateDatabase(db);
    // Migration 12 then moves that first line out of the body, so it isn't shown twice.
    expect(await noteRepository.getById(db, 'n1')).toMatchObject({
      title: 'Old note',
      body: 'body',
      color: 'default',
      paper: null,
      noteType: 'standard',
      isLocked: false,
    });
  });
});
