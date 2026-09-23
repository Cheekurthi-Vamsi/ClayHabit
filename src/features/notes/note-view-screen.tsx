import { useRouter } from 'expo-router';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, EmptyState, IconButton, Skeleton, Text } from '@/components/ui';
import { TRASH_RETENTION_DAYS, type NoteView } from '@/data/repositories/note-repository';
import type { NoteSummary } from '@/domain/entities/note';
import { useSettingsStore } from '@/store/settings-store';
import { useAppTheme } from '@/theme';

import { NoteCard } from './components/note-card';
import { NotesGridBackground } from './components/notes-grid-background';
import { useEmptyTrash, useNotes, usePermanentlyDeleteNote, useRestoreNote, useSetNoteFlag } from './hooks';

interface NoteViewScreenProps {
  view: Exclude<NoteView, 'active'>;
  title: string;
  emptyMessage: string;
}

function daysLeft(trashedAt: string | null): number {
  if (!trashedAt) return TRASH_RETENTION_DAYS;
  const elapsed = (Date.now() - new Date(trashedAt).getTime()) / 86_400_000;
  return Math.max(0, Math.ceil(TRASH_RETENTION_DAYS - elapsed));
}

/** Archive and Trash ("Recently deleted"): the notes, with restore and delete-for-good. */
export function NoteViewScreen({ view, title, emptyMessage }: NoteViewScreenProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const hidePreviews = useSettingsStore((state) => state.notesHidePreviews);
  const { data: notes, isLoading } = useNotes(view);
  const restoreNote = useRestoreNote();
  const setFlag = useSetNoteFlag();
  const deleteForever = usePermanentlyDeleteNote();
  const emptyTrash = useEmptyTrash();
  const trashed = view === 'trashed';

  const confirmDelete = (note: NoteSummary) =>
    Alert.alert('Delete for good?', "This note can't be recovered afterwards.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteForever.mutate(note.id) },
    ]);

  const renderItem = ({ item: note }: { item: NoteSummary }) => (
    <View style={styles.item}>
      <NoteCard
        note={note}
        size="row"
        hidePreview={hidePreviews}
        onOpen={(target) => (trashed ? undefined : router.push(`/note/${target.id}`))}
        onMenu={() => {}}
      />
      <View style={styles.actions}>
        {trashed ? (
          <>
            <Text variant="caption" color="textTertiary" style={styles.flex}>
              Deleted for good in {daysLeft(note.trashedAt)} days
            </Text>
            <Button label="Restore" icon="rotate-ccw" size="sm" variant="soft" onPress={() => restoreNote.mutate(note.id)} />
            <Button label="Delete" size="sm" variant="ghost" onPress={() => confirmDelete(note)} />
          </>
        ) : (
          <Button
            label="Unarchive"
            icon="inbox"
            size="sm"
            variant="soft"
            onPress={() => setFlag.mutate({ id: note.id, flag: 'archived', value: false })}
          />
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <NotesGridBackground paper="dots" />
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <IconButton name="arrow-left" variant="muted" accessibilityLabel="Back" onPress={() => router.back()} />
        <View style={styles.flex}>
          <Text variant="headlineLarge" accessibilityRole="header">
            {trashed ? 'Recently deleted' : title}
          </Text>
          {trashed ? (
            <Text variant="bodySmall" color="textSecondary">
              Notes here are removed for good after {TRASH_RETENTION_DAYS} days.
            </Text>
          ) : null}
        </View>
        {trashed && (notes?.length ?? 0) > 0 ? (
          <Button
            label="Empty"
            size="sm"
            variant="danger"
            onPress={() =>
              Alert.alert('Empty Trash?', 'Every note in Trash will be deleted for good.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Empty Trash', style: 'destructive', onPress: () => emptyTrash.mutate() },
              ])
            }
          />
        ) : null}
      </View>

      <FlatList
        data={notes ?? []}
        keyExtractor={(note) => note.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + theme.spacing.huge }]}
        ListEmptyComponent={
          isLoading ? (
            <Skeleton height={96} radius={theme.radii.lg} />
          ) : (
            <EmptyState icon={trashed ? 'trash-2' : 'archive'} title={emptyMessage} />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  flex: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 20,
    gap: 14,
  },
  item: {
    gap: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
