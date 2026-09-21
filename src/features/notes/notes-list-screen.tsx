import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip, EmptyState, ErrorState, IconButton, Skeleton, Text } from '@/components/ui';
import { useAppTheme } from '@/theme';

import { useCreateNote, useFolders, useNotes, useSearchNotes } from './hooks';
import { NoteCard } from './note-card';

export function NotesListScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [folderId, setFolderId] = useState<string | undefined>(undefined);

  const { data: notes, isLoading, isError, refetch } = useNotes('active', folderId);
  const { data: searchResults, isLoading: isSearching } = useSearchNotes(query);
  const { data: folders } = useFolders();
  const createNote = useCreateNote();

  const isSearchMode = query.trim().length > 0;

  const { pinned, recent } = useMemo(() => {
    const list = notes ?? [];
    return {
      pinned: list.filter((note) => note.isPinned),
      recent: list.filter((note) => !note.isPinned),
    };
  }, [notes]);

  const handleCreate = () => {
    createNote.mutate(undefined, {
      onSuccess: (note) => router.push(`/note/${note.id}`),
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <Text variant="displayMedium">Notes</Text>
        <View style={styles.headerActions}>
          <IconButton
            name="archive"
            variant="ghost"
            accessibilityLabel="Archived notes"
            onPress={() => router.push('/note/archive')}
          />
          <IconButton
            name="trash-2"
            variant="ghost"
            accessibilityLabel="Trash"
            onPress={() => router.push('/note/trash')}
          />
          <IconButton name="plus" variant="filled" accessibilityLabel="New note" onPress={handleCreate} />
        </View>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search notes..."
          placeholderTextColor={theme.colors.textTertiary}
          style={[
            styles.search,
            {
              color: theme.colors.textPrimary,
              backgroundColor: theme.colors.surfaceMuted,
              borderRadius: theme.radii.md,
            },
          ]}
        />
      </View>

      {!isSearchMode && (folders?.length ?? 0) > 0 && (
        <View style={styles.filterRow}>
          <Chip label="All" selected={!folderId} onPress={() => setFolderId(undefined)} />
          {folders!.map((folder) => (
            <Chip
              key={folder.id}
              label={folder.name}
              selected={folderId === folder.id}
              onPress={() => setFolderId(folder.id)}
            />
          ))}
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + theme.spacing.huge }]}
        showsVerticalScrollIndicator={false}
      >
        {isSearchMode ? (
          isSearching ? (
            <Skeleton height={64} radius={theme.radii.lg} />
          ) : (searchResults?.length ?? 0) === 0 ? (
            <EmptyState icon="search" title="No matching notes" />
          ) : (
            searchResults!.map((note) => <NoteCard key={note.id} note={note} />)
          )
        ) : isLoading ? (
          <View style={{ gap: 10 }}>
            <Skeleton height={80} radius={theme.radii.lg} />
            <Skeleton height={80} radius={theme.radii.lg} />
          </View>
        ) : isError ? (
          <ErrorState message="Couldn't load your notes." onRetry={() => refetch()} />
        ) : (notes?.length ?? 0) === 0 ? (
          <EmptyState
            icon="file-text"
            title="No notes yet"
            message="Tap + to write your first note."
          />
        ) : (
          <>
            {pinned.length > 0 && (
              <View style={styles.section}>
                <Text variant="labelLarge" color="textSecondary">
                  PINNED
                </Text>
                {pinned.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </View>
            )}
            <View style={styles.section}>
              {pinned.length > 0 && (
                <Text variant="labelLarge" color="textSecondary">
                  RECENT
                </Text>
              )}
              {recent.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </View>
          </>
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
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  search: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  list: {
    paddingHorizontal: 20,
    gap: 16,
  },
  section: {
    gap: 10,
  },
});
