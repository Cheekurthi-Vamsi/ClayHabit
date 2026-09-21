import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';

import * as folderRepository from '@/data/repositories/folder-repository';
import * as noteRepository from '@/data/repositories/note-repository';
import type { NoteView } from '@/data/repositories/note-repository';
import * as tagRepository from '@/data/repositories/tag-repository';
import type { NewFolderInput } from '@/domain/entities/folder';
import type { NewNoteInput, UpdateNoteInput } from '@/domain/entities/note';

const keys = {
  list: (view: NoteView, folderId?: string) => ['notes', view, folderId ?? 'any'] as const,
  search: (query: string) => ['notes', 'search', query] as const,
  detail: (id: string) => ['notes', 'detail', id] as const,
  folders: ['folders'] as const,
};

function invalidateNotes(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['notes'] });
}

export function useNotes(view: NoteView = 'active', folderId?: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: keys.list(view, folderId),
    queryFn: () => noteRepository.listAll(db, { view, folderId }),
  });
}

export function useSearchNotes(query: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: keys.search(query),
    queryFn: () => noteRepository.search(db, query),
    enabled: query.trim().length > 0,
  });
}

export function useNoteWithTags(id: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: () => noteRepository.getWithTags(db, id),
  });
}

export function useCreateNote() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input?: NewNoteInput) => noteRepository.create(db, input),
    onSuccess: () => invalidateNotes(queryClient),
  });
}

export function useUpdateNote() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateNoteInput }) =>
      noteRepository.update(db, id, input),
    onSuccess: (_data, variables) => {
      invalidateNotes(queryClient);
      queryClient.invalidateQueries({ queryKey: keys.detail(variables.id) });
    },
  });
}

export function useSetNotePinned() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isPinned }: { id: string; isPinned: boolean }) =>
      noteRepository.setPinned(db, id, isPinned),
    onSuccess: () => invalidateNotes(queryClient),
  });
}

export function useSetNoteArchived() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isArchived }: { id: string; isArchived: boolean }) =>
      noteRepository.setArchived(db, id, isArchived),
    onSuccess: () => invalidateNotes(queryClient),
  });
}

export function useMoveNoteToTrash() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => noteRepository.moveToTrash(db, id),
    onSuccess: () => invalidateNotes(queryClient),
  });
}

export function useRestoreNote() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => noteRepository.restoreFromTrash(db, id),
    onSuccess: () => invalidateNotes(queryClient),
  });
}

export function usePermanentlyDeleteNote() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => noteRepository.permanentlyDelete(db, id),
    onSuccess: () => invalidateNotes(queryClient),
  });
}

export function useEmptyTrash() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => noteRepository.emptyTrash(db),
    onSuccess: () => invalidateNotes(queryClient),
  });
}

export function useSetNoteTags() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, tagNames }: { noteId: string; tagNames: string[] }) => {
      const tags = await Promise.all(tagNames.map((name) => tagRepository.findOrCreateByName(db, name)));
      await noteRepository.setTags(db, noteId, tags.map((tag) => tag.id));
      return tags;
    },
    onSuccess: (_data, variables) => {
      invalidateNotes(queryClient);
      queryClient.invalidateQueries({ queryKey: keys.detail(variables.noteId) });
    },
  });
}

export function useFolders() {
  const db = useSQLiteContext();
  return useQuery({ queryKey: keys.folders, queryFn: () => folderRepository.listAll(db) });
}

export function useCreateFolder() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: NewFolderInput) => folderRepository.create(db, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.folders }),
  });
}
