import * as folderRepository from '@/data/repositories/folder-repository';
import * as noteRepository from '@/data/repositories/note-repository';
import * as tagRepository from '@/data/repositories/tag-repository';
import * as taskRepository from '@/data/repositories/task-repository';
import { createTasksFromNote } from '@/features/notes/services/note-to-task';

import { migrateDatabase } from '../migrate';
import { createTestDb } from '../testing/create-test-db';

async function freshDb() {
  const db = createTestDb();
  await migrateDatabase(db);
  return db;
}

describe('notes workspace', () => {
  it('create → save → reload keeps the content', async () => {
    const db = await freshDb();
    const note = await noteRepository.create(db, { title: 'Draft' });
    await noteRepository.update(db, note.id, { body: 'Typed while offline' });
    expect(await noteRepository.getById(db, note.id)).toMatchObject({ title: 'Draft', body: 'Typed while offline' });
  });

  it('summaries carry a plain preview, checklist progress and tags — but nothing from locked notes', async () => {
    const db = await freshDb();
    const plan = await noteRepository.create(db, {
      title: 'Study plan',
      body: '- [x] **TCP/IP**\n- [x] DNS\n- [ ] TLS',
    });
    const tag = await tagRepository.findOrCreateByName(db, 'cyber');
    await noteRepository.setTags(db, plan.id, [tag.id]);
    const secret = await noteRepository.create(db, { title: 'Passwords', body: 'hunter2' });
    await noteRepository.setLocked(db, secret.id, true);

    const summaries = await noteRepository.listSummaries(db);
    const planSummary = summaries.find((note) => note.id === plan.id)!;
    expect(planSummary.excerpt).toBe('TCP/IP DNS TLS');
    expect(planSummary.checklist).toEqual({ done: 2, total: 3 });
    expect(planSummary.tags.map((t) => t.name)).toEqual(['cyber']);
    expect(summaries.find((note) => note.id === secret.id)).toMatchObject({ excerpt: '', isLocked: true });
  });

  it('searches titles, bodies, folders and tags, and never matches a locked note’s body', async () => {
    const db = await freshDb();
    const folder = await folderRepository.create(db, { name: 'Learning', color: '#123456' });
    await noteRepository.create(db, { title: 'Sockets', body: 'Python socket programming', folderId: folder.id });
    const tagged = await noteRepository.create(db, { title: 'Weekend', body: 'Hike' });
    const tag = await tagRepository.findOrCreateByName(db, 'outdoors');
    await noteRepository.setTags(db, tagged.id, [tag.id]);
    const locked = await noteRepository.create(db, { title: 'Vault', body: 'python secrets' });
    await noteRepository.setLocked(db, locked.id, true);

    expect((await noteRepository.search(db, 'python')).map((n) => n.title)).toEqual(['Sockets']);
    expect((await noteRepository.search(db, 'learning')).map((n) => n.title)).toEqual(['Sockets']);
    expect((await noteRepository.search(db, 'outdoor')).map((n) => n.title)).toEqual(['Weekend']);
    expect((await noteRepository.search(db, 'vault')).map((n) => n.title)).toEqual(['Vault']);
    // LIKE wildcards are matched literally.
    expect(await noteRepository.search(db, '%')).toEqual([]);
  });

  it('smart filters: pinned, favourites, checklists, code, locked, reminders', async () => {
    const db = await freshDb();
    const pinned = await noteRepository.create(db, { title: 'Pinned' });
    await noteRepository.setPinned(db, pinned.id, true);
    const favourite = await noteRepository.create(db, { title: 'Fav' });
    await noteRepository.setFavorite(db, favourite.id, true);
    await noteRepository.create(db, { title: 'List', body: '- [ ] a' });
    await noteRepository.create(db, { title: 'Snippet', noteType: 'code' });
    const reminded = await noteRepository.create(db, { title: 'Later' });
    await noteRepository.setReminder(db, reminded.id, { at: '2999-01-01T09:00:00.000Z', notificationId: 'n' });

    const titles = async (filter: noteRepository.NoteFilter) =>
      (await noteRepository.listAll(db, { filter })).map((note) => note.title);
    expect(await titles('pinned')).toEqual(['Pinned']);
    expect(await titles('favorites')).toEqual(['Fav']);
    expect(await titles('checklists')).toEqual(['List']);
    expect(await titles('code')).toEqual(['Snippet']);
    expect(await titles('reminders')).toEqual(['Later']);
    expect(await titles('all')).toHaveLength(5);
  });

  it('filters by tag, sorts by title, and counts every view', async () => {
    const db = await freshDb();
    const b = await noteRepository.create(db, { title: 'Beta' });
    await noteRepository.create(db, { title: 'alpha' });
    const archived = await noteRepository.create(db, { title: 'Old' });
    await noteRepository.setArchived(db, archived.id, true);
    const tag = await tagRepository.findOrCreateByName(db, 'x');
    await noteRepository.setTags(db, b.id, [tag.id]);

    expect((await noteRepository.listAll(db, { tagId: tag.id })).map((n) => n.title)).toEqual(['Beta']);
    expect((await noteRepository.listAll(db, { sort: 'title' })).map((n) => n.title)).toEqual(['alpha', 'Beta']);
    expect(await noteRepository.counts(db)).toMatchObject({ all: 2, archived: 1, trashed: 0 });
    expect(await tagRepository.listForNotes(db)).toEqual([expect.objectContaining({ name: 'x', noteCount: 1 })]);
  });

  it('duplicates content, colour and tags but not pin, lock or reminder', async () => {
    const db = await freshDb();
    const source = await noteRepository.create(db, { title: 'Plan', body: 'Body', color: 'mint' });
    const tag = await tagRepository.findOrCreateByName(db, 'work');
    await noteRepository.setTags(db, source.id, [tag.id]);
    await noteRepository.setPinned(db, source.id, true);
    await noteRepository.setLocked(db, source.id, true);

    const copy = await noteRepository.duplicate(db, source.id);
    expect(copy).toMatchObject({ title: 'Plan (copy)', body: 'Body', color: 'mint', isPinned: false, isLocked: false });
    expect((await noteRepository.getWithTags(db, copy!.id))?.tags.map((t) => t.name)).toEqual(['work']);
  });

  it('empties old trash after 30 days, keeping recent deletions', async () => {
    const db = await freshDb();
    const old = await noteRepository.create(db, { title: 'Old' });
    const recent = await noteRepository.create(db, { title: 'Recent' });
    await noteRepository.moveToTrash(db, old.id);
    await noteRepository.moveToTrash(db, recent.id);
    await db.runAsync("UPDATE notes SET trashed_at = '2020-01-01T00:00:00.000Z' WHERE id = ?", old.id);

    expect(await noteRepository.purgeExpiredTrash(db)).toBe(1);
    expect(await noteRepository.getById(db, old.id)).toBeNull();
    expect(await noteRepository.getById(db, recent.id)).not.toBeNull();
  });

  it('keeps revisions on meaningful edits (not every keystroke) and restores them reversibly', async () => {
    const db = await freshDb();
    const note = await noteRepository.create(db, { title: 'T', body: 'v1' });
    await noteRepository.update(db, note.id, { body: 'v2' });
    await noteRepository.update(db, note.id, { body: 'v3' }); // within the interval: no new snapshot
    const revisions = await noteRepository.listRevisions(db, note.id);
    expect(revisions.map((r) => r.body)).toEqual(['v1']);

    await noteRepository.restoreRevision(db, revisions[0].id);
    expect((await noteRepository.getById(db, note.id))?.body).toBe('v1');
    expect((await noteRepository.listRevisions(db, note.id)).map((r) => r.body)).toContain('v3');
  });

  it('manages folders: counts, rename, reorder, delete without losing notes', async () => {
    const db = await freshDb();
    const work = await folderRepository.create(db, { name: 'Work', color: '#111111' });
    const home = await folderRepository.create(db, { name: 'Home', color: '#222222' });
    const note = await noteRepository.create(db, { title: 'Report', folderId: work.id });

    expect((await folderRepository.listWithCounts(db)).map((f) => [f.name, f.noteCount])).toEqual([
      ['Work', 1],
      ['Home', 0],
    ]);
    await folderRepository.update(db, work.id, { name: 'Office', icon: 'briefcase' });
    await folderRepository.reorder(db, [home.id, work.id]);
    expect((await folderRepository.listAll(db)).map((f) => f.name)).toEqual(['Home', 'Office']);

    await folderRepository.remove(db, work.id);
    expect((await noteRepository.getById(db, note.id))?.folderId).toBeNull();
  });

  it('turns a note, or its open checklist items, into tasks that link back', async () => {
    const db = await freshDb();
    const note = await noteRepository.create(db, {
      title: 'Meeting',
      body: '## Action items\n- [ ] Configure API\n- [x] Test auth\n- [ ] Deploy backend',
    });

    expect(await createTasksFromNote(db, { noteId: note.id, mode: 'open-items' })).toBe(2);
    expect(await createTasksFromNote(db, { noteId: note.id, mode: 'note' })).toBe(1);

    const tasks = await taskRepository.listAll(db);
    expect(tasks.map((task) => task.title).sort()).toEqual(['Configure API', 'Deploy backend', 'Meeting']);
    expect(tasks.every((task) => task.sourceType === 'NOTE' && task.sourceId === note.id)).toBe(true);
  });
});
