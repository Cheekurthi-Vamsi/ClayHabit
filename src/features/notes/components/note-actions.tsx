import { useRef, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert, Share } from 'react-native';

import { ActionSheet, type SheetAction } from '@/components/ui';
import * as noteRepository from '@/data/repositories/note-repository';
import type { NoteSummary } from '@/domain/entities/note';
import * as Haptics from '@/lib/haptics';
import { displayTitle } from '@/utils/markdown';

import {
  useCreateTasksFromNote,
  useDuplicateNote,
  useMoveNoteToTrash,
  useSetNoteFlag,
  useSetNoteReminder,
  useUpdateNote,
} from '../hooks';
import { authenticateForNote, noteLockMethod, NO_LOCK_METHOD_MESSAGE } from '../services/note-lock';
import { FolderPickerSheet } from './folder-picker-sheet';
import { ReminderSheet } from './reminder-sheet';

type Sheet = 'menu' | 'folder' | 'reminder';

/** Note metadata an action needs; summaries (lists) and full notes (editor) both fit. */
export type ActionableNote = Pick<
  NoteSummary,
  'id' | 'title' | 'isPinned' | 'isFavorite' | 'isArchived' | 'isLocked' | 'folderId' | 'reminderAt' | 'checklist'
> & { excerpt?: string };

interface NoteActionsProps {
  note: ActionableNote | null;
  onClose: () => void;
  onOpen?: (id: string) => void;
  /** After trash/archive from inside the editor, leave it. */
  onLeave?: () => void;
}

const ignore = () => {};

/**
 * Every action on a note, from a card's long press or the editor's •••:
 * open, pin, favourite, move, remind, lock, make tasks, duplicate, share,
 * archive and delete. Folder and reminder choices open as their own sheets.
 *
 * Mutations use `mutateAsync` because the sheet unmounts as soon as it
 * closes; the work (and any confirmation alert) must not depend on it.
 */
export function NoteActions({ note, onClose, onOpen, onLeave }: NoteActionsProps) {
  const db = useSQLiteContext();
  const [sheet, setSheet] = useState<Sheet>('menu');
  // The menu's close callback fires before the chosen action runs; the ref
  // lets it see whether that action opened a sub-sheet instead of ending the flow.
  const sheetRef = useRef<Sheet>('menu');
  const setFlag = useSetNoteFlag();
  const updateNote = useUpdateNote();
  const duplicate = useDuplicateNote();
  const moveToTrash = useMoveNoteToTrash();
  const setReminder = useSetNoteReminder();
  const createTasks = useCreateTasksFromNote();

  if (!note) return null;
  const title = displayTitle({ title: note.title, body: note.excerpt ?? '' });
  const openItems = note.checklist.total - note.checklist.done;

  const show = (next: Sheet) => {
    sheetRef.current = next;
    setSheet(next);
  };
  const finish = () => {
    sheetRef.current = 'menu';
    setSheet('menu');
    onClose();
  };

  const flag = (name: 'pinned' | 'favorite' | 'archived' | 'locked', value: boolean) =>
    setFlag.mutateAsync({ id: note.id, flag: name, value }).catch(ignore);

  const toggleLock = async () => {
    if (note.isLocked) {
      if (!(await authenticateForNote(`Remove the lock from "${title}"`))) return;
      await flag('locked', false);
      return;
    }
    if ((await noteLockMethod()) === 'none') {
      Alert.alert("Can't lock notes yet", NO_LOCK_METHOD_MESSAGE);
      return;
    }
    await flag('locked', true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const share = async () => {
    if (note.isLocked) {
      if ((await noteLockMethod()) !== 'device') {
        Alert.alert('Open the note first', 'Unlock this note in the editor, then share it from there.');
        return;
      }
      if (!(await authenticateForNote(`Share "${title}"`))) return;
    }
    const full = await noteRepository.getById(db, note.id);
    if (!full) return;
    const message = [displayTitle(full), full.body].filter(Boolean).join('\n\n');
    await Share.share({ title: displayTitle(full), message }).catch(ignore);
  };

  const makeTasks = async (mode: 'note' | 'open-items') => {
    const count = await createTasks.mutateAsync({ noteId: note.id, mode }).catch(() => 0);
    if (count > 0) {
      Alert.alert(
        count === 1 ? 'Task created' : `${count} tasks created`,
        'You’ll find them in Tasks. Each one links back to this note.',
      );
    }
  };

  const actions: SheetAction[] = [
    ...(onOpen ? [{ label: 'Open', icon: 'book-open' as const, onPress: () => onOpen(note.id) }] : []),
    { label: note.isPinned ? 'Unpin' : 'Pin to top', icon: 'bookmark', onPress: () => void flag('pinned', !note.isPinned) },
    {
      label: note.isFavorite ? 'Remove from favourites' : 'Add to favourites',
      icon: 'star',
      onPress: () => void flag('favorite', !note.isFavorite),
    },
    { label: 'Move to folder…', icon: 'folder', onPress: () => show('folder') },
    { label: note.reminderAt ? 'Change reminder…' : 'Add reminder…', icon: 'bell', onPress: () => show('reminder') },
    {
      label: note.isLocked ? 'Remove lock' : 'Lock note',
      icon: note.isLocked ? 'unlock' : 'lock',
      onPress: () => void toggleLock(),
    },
    { label: 'Create task from note', icon: 'check-circle', onPress: () => void makeTasks('note') },
    ...(openItems > 0
      ? [
          {
            label: `Turn ${openItems} open item${openItems === 1 ? '' : 's'} into tasks`,
            icon: 'list' as const,
            onPress: () => void makeTasks('open-items'),
          },
        ]
      : []),
    { label: 'Duplicate', icon: 'copy', onPress: () => void duplicate.mutateAsync(note.id).catch(ignore) },
    { label: 'Share', icon: 'share-2', onPress: () => void share() },
    {
      label: note.isArchived ? 'Unarchive' : 'Archive',
      icon: 'archive',
      onPress: () => {
        void flag('archived', !note.isArchived);
        if (!note.isArchived) onLeave?.();
      },
    },
    {
      label: 'Move to trash',
      icon: 'trash-2',
      destructive: true,
      onPress: () =>
        Alert.alert('Move to trash?', 'It stays in Trash for 30 days, then it’s deleted for good.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Move to trash',
            style: 'destructive',
            onPress: () => {
              void moveToTrash.mutateAsync(note.id).catch(ignore);
              onLeave?.();
            },
          },
        ]),
    },
  ];

  return (
    <>
      <ActionSheet
        visible={sheet === 'menu'}
        onClose={() =>
          setTimeout(() => {
            if (sheetRef.current === 'menu') finish();
          }, 0)
        }
        title={title}
        actions={actions}
      />
      <FolderPickerSheet
        visible={sheet === 'folder'}
        currentFolderId={note.folderId}
        onClose={finish}
        onPick={(folderId) => void updateNote.mutateAsync({ id: note.id, input: { folderId } }).catch(ignore)}
      />
      <ReminderSheet
        visible={sheet === 'reminder'}
        current={note.reminderAt}
        onClose={finish}
        onPick={async (date) => {
          const ok = await setReminder.mutateAsync({ id: note.id, at: date }).catch(() => true);
          if (!ok) {
            Alert.alert('Notifications are off', 'Allow notifications for ClayHabbit in system settings to get reminders.');
          }
        }}
      />
    </>
  );
}
