import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';

import * as folderRepository from '@/data/repositories/folder-repository';
import * as noteRepository from '@/data/repositories/note-repository';
import type { ListOptions, NoteView } from '@/data/repositories/note-repository';
import * as tagRepository from '@/data/repositories/tag-repository';
import type { NewFolderInput, UpdateFolderInput } from '@/domain/entities/folder';
import type { NewNoteInput, UpdateNoteInput } from '@/domain/entities/note';

import { cancelNoteReminder, scheduleNoteReminder } from './services/note-reminders';
import { createTasksFromNote } from './services/note-to-task';

/**
 * TanStack Query hooks over the note repository. Everything notes-related
 * lives under the `notes` key root, so any mutation can refresh every list,
 * count and detail at once.
 */
export const noteKeys = {
  all: ['notes'] as const,
  list: (options: ListOptions) => ['notes', 'list', options] as const,
  search: (query: string) => ['notes', 'search', query] as const,
  detail: (id: string) => ['notes', 'detail', id] as const,
  counts: ['notes', 'counts'] as const,
  revisions: (id: string) => ['notes', 'revisions', id] as const,
  folders: ['notes', 'folders'] as const,
  tags: ['notes', 'tags'] as const,
};

function useInvalidateNotes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: noteKeys.all });
}

// ---- Reads -----------------------------------------------------------------------------------

/** Card-ready summaries for a view (active / archived / trashed) plus optional filters. */
export function useNotes(view: NoteView = 'active', options: Omit<ListOptions, 'view'> = {}) {
  const db = useSQLiteContext();
  const listOptions: ListOptions = { view, ...options };
  return useQuery({
    queryKey: noteKeys.list(listOptions),
    queryFn: () => noteRepository.listSummaries(db, listOptions),
  });
}

export function useSearchNotes(query: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: noteKeys.search(query.trim()),
    queryFn: () => noteRepository.search(db, query),
    enabled: query.trim().length > 0,
    placeholderData: (previous) => previous,
  });
}

export function useNoteCounts() {
  const db = useSQLiteContext();
  return useQuery({ queryKey: noteKeys.counts, queryFn: () => noteRepository.counts(db) });
}

export function useNoteWithTags(id: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: noteKeys.detail(id),
    queryFn: () => noteRepository.getWithTags(db, id),
  });
}

export function useNoteRevisions(id: string, enabled: boolean) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: noteKeys.revisions(id),
    queryFn: () => noteRepository.listRevisions(db, id),
    enabled,
  });
}

export function useFolders() {
  const db = useSQLiteContext();
  return useQuery({ queryKey: noteKeys.folders, queryFn: () => folderRepository.listWithCounts(db) });
}

export function useNoteTags() {
  const db = useSQLiteContext();
  return useQuery({ queryKey: noteKeys.tags, queryFn: () => tagRepository.listForNotes(db) });
}

// ---- Writes ----------------------------------------------------------------------------------

export function useCreateNote() {
  const db = useSQLiteContext();
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: (input?: NewNoteInput) => noteRepository.create(db, input),
    onSuccess: invalidate,
  });
}

/**
 * Autosave. Writes land straight in the detail cache (no refetch while
 * typing); lists refresh in the background.
 */
export function useUpdateNote() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateNoteInput }) => noteRepository.update(db, id, input),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['notes', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['notes', 'search'] });
      queryClient.invalidateQueries({ queryKey: noteKeys.folders });
      queryClient.invalidateQueries({ queryKey: noteKeys.revisions(id) });
      queryClient.invalidateQueries({ queryKey: noteKeys.detail(id) });
    },
  });
}

type Flag = 'pinned' | 'favorite' | 'archived' | 'locked';

const FLAG_SETTERS = {
  pinned: noteRepository.setPinned,
  favorite: noteRepository.setFavorite,
  archived: noteRepository.setArchived,
  locked: noteRepository.setLocked,
} as const;

export function useSetNoteFlag() {
  const db = useSQLiteContext();
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: ({ id, flag, value }: { id: string; flag: Flag; value: boolean }) => FLAG_SETTERS[flag](db, id, value),
    onSuccess: invalidate,
  });
}

export function useMoveNoteToTrash() {
  const db = useSQLiteContext();
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: async (id: string) => {
      const note = await noteRepository.getById(db, id);
      await cancelNoteReminder(db, note);
      await noteRepository.moveToTrash(db, id);
    },
    onSuccess: invalidate,
  });
}

export function useRestoreNote() {
  const db = useSQLiteContext();
  const invalidate = useInvalidateNotes();
  return useMutation({ mutationFn: (id: string) => noteRepository.restoreFromTrash(db, id), onSuccess: invalidate });
}

export function usePermanentlyDeleteNote() {
  const db = useSQLiteContext();
  const invalidate = useInvalidateNotes();
  return useMutation({ mutationFn: (id: string) => noteRepository.permanentlyDelete(db, id), onSuccess: invalidate });
}

export function useEmptyTrash() {
  const db = useSQLiteContext();
  const invalidate = useInvalidateNotes();
  return useMutation({ mutationFn: () => noteRepository.emptyTrash(db), onSuccess: invalidate });
}

export function useDuplicateNote() {
  const db = useSQLiteContext();
  const invalidate = useInvalidateNotes();
  return useMutation({ mutationFn: (id: string) => noteRepository.duplicate(db, id), onSuccess: invalidate });
}

export function useRestoreRevision() {
  const db = useSQLiteContext();
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: (revisionId: string) => noteRepository.restoreRevision(db, revisionId),
    onSuccess: invalidate,
  });
}

export function useSetNoteTags() {
  const db = useSQLiteContext();
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: async ({ noteId, tagNames }: { noteId: string; tagNames: string[] }) => {
      const names = [...new Set(tagNames.map((name) => name.trim().replace(/^#/, '')).filter(Boolean))];
      const tags = await Promise.all(names.map((name) => tagRepository.findOrCreateByName(db, name)));
      await noteRepository.setTags(
        db,
        noteId,
        tags.map((tag) => tag.id),
      );
      return tags;
    },
    onSuccess: invalidate,
  });
}

export function useSetNoteReminder() {
  const db = useSQLiteContext();
  const invalidate = useInvalidateNotes();
  return useMutation({
    /** `at` null clears it. Resolves false when notification permission was refused. */
    mutationFn: async ({ id, at }: { id: string; at: Date | null }) => {
      const note = await noteRepository.getById(db, id);
      if (!note) return false;
      await cancelNoteReminder(db, note);
      if (!at) return true;
      return scheduleNoteReminder(db, note, at);
    },
    onSuccess: invalidate,
  });
}

export function useCreateTasksFromNote() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { noteId: string; mode: 'note' | 'open-items' }) => createTasksFromNote(db, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: noteKeys.all });
    },
  });
}

// ---- Folders ---------------------------------------------------------------------------------

export function useCreateFolder() {
  const db = useSQLiteContext();
  const invalidate = useInvalidateNotes();
  return useMutation({ mutationFn: (input: NewFolderInput) => folderRepository.create(db, input), onSuccess: invalidate });
}

export function useUpdateFolder() {
  const db = useSQLiteContext();
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFolderInput }) => folderRepository.update(db, id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteFolder() {
  const db = useSQLiteContext();
  const invalidate = useInvalidateNotes();
  return useMutation({ mutationFn: (id: string) => folderRepository.remove(db, id), onSuccess: invalidate });
}

export function useReorderFolders() {
  const db = useSQLiteContext();
  const invalidate = useInvalidateNotes();
  return useMutation({ mutationFn: (ids: string[]) => folderRepository.reorder(db, ids), onSuccess: invalidate });
}

/** Trash empties itself after 30 days; checked whenever Notes opens. */
export function usePurgeExpiredTrash() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['notes', 'purge-trash'],
    queryFn: async () => {
      const removed = await noteRepository.purgeExpiredTrash(db);
      if (removed > 0) queryClient.invalidateQueries({ queryKey: ['notes', 'list'] });
      return removed;
    },
    staleTime: 60 * 60_000,
  });
}
