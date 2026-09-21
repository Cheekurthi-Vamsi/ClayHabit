import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, EmptyState, IconButton, Skeleton, Text } from '@/components/ui';
import type { NoteView } from '@/data/repositories/note-repository';
import { useAppTheme } from '@/theme';
import { getPreviewText } from '@/utils/markdown';

import {
  useEmptyTrash,
  useNotes,
  usePermanentlyDeleteNote,
  useRestoreNote,
  useSetNoteArchived,
} from './hooks';

interface NoteViewScreenProps {
  view: NoteView;
  title: string;
  emptyMessage: string;
}

export function NoteViewScreen({ view, title, emptyMessage }: NoteViewScreenProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: notes, isLoading } = useNotes(view);
  const restoreNote = useRestoreNote();
  const setArchived = useSetNoteArchived();
  const deleteForever = usePermanentlyDeleteNote();
  const emptyTrash = useEmptyTrash();

  const handleEmptyTrash = () => {
    Alert.alert('Empty Trash?', 'All trashed notes will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Empty Trash', style: 'destructive', onPress: () => emptyTrash.mutate() },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <IconButton name="arrow-left" variant="ghost" accessibilityLabel="Back" onPress={() => router.back()} />
        <Text variant="headlineMedium">{title}</Text>
        {view === 'trashed' ? (
          <Button label="Empty" variant="ghost" onPress={handleEmptyTrash} />
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + theme.spacing.huge }]}
      >
        {isLoading ? (
          <Skeleton height={72} radius={theme.radii.lg} />
        ) : (notes?.length ?? 0) === 0 ? (
          <EmptyState icon={view === 'trashed' ? 'trash-2' : 'archive'} title={emptyMessage} />
        ) : (
          notes!.map((note) => (
            <Card key={note.id} style={styles.card}>
              <Text variant="titleMedium" numberOfLines={1}>
                {note.title.trim() || 'New Note'}
              </Text>
              <Text variant="bodySmall" color="textSecondary" numberOfLines={2}>
                {getPreviewText(note.body)}
              </Text>
              <View style={styles.actions}>
                {view === 'trashed' ? (
                  <>
                    <Button label="Restore" variant="outline" onPress={() => restoreNote.mutate(note.id)} />
                    <Button
                      label="Delete Forever"
                      variant="ghost"
                      onPress={() => deleteForever.mutate(note.id)}
                    />
                  </>
                ) : (
                  <Button
                    label="Unarchive"
                    variant="outline"
                    onPress={() => setArchived.mutate({ id: note.id, isArchived: false })}
                  />
                )}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  list: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    gap: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
});
