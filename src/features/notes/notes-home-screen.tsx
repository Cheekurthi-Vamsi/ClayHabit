import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDockSpace } from '@/components/navigation/floating-dock';
import { ActionSheet, ErrorState, IconButton, Skeleton, Text } from '@/components/ui';
import type { NoteFilter } from '@/data/repositories/note-repository';
import type { FolderWithCount } from '@/domain/entities/folder';
import type { NewNoteInput, NoteSummary } from '@/domain/entities/note';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useSettingsStore, type NotesSort } from '@/store/settings-store';
import { useAppTheme } from '@/theme';

import { NoteActions } from './components/note-actions';
import { NoteCard } from './components/note-card';
import { FolderEditorSheet } from './components/folder-editor-sheet';
import {
  FolderStrip,
  NoteFilterBar,
  NoteSearchField,
  NotesEmptyState,
  QuickNoteButton,
  SectionTitle,
  TagFilterRow,
} from './components/notes-chrome';
import { NotesGridBackground } from './components/notes-grid-background';
import { QuickNoteSheet } from './components/quick-note-sheet';
import {
  useCreateNote,
  useFolders,
  useMoveNoteToTrash,
  useNoteCounts,
  useNotes,
  useNoteTags,
  usePurgeExpiredTrash,
  useSearchNotes,
  useSetNoteFlag,
} from './hooks';
import { buildBentoRows, type BentoRow } from './utils/bento';

type Row = { kind: 'section'; key: string; title: string; count?: number } | BentoRow<NoteSummary>;

const SORT_LABELS: Record<NotesSort, string> = {
  updated: 'Last edited',
  created: 'Date created',
  title: 'Title (A–Z)',
};

/**
 * The Notes workspace: a calm grid-paper page with search, smart filters,
 * folders and tags up top, pinned notes first, then everything else in a
 * bento grid (or a swipeable list). "New note" is always one tap away.
 */
export function NotesHomeScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const dockSpace = useDockSpace();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const viewMode = useSettingsStore((state) => state.notesViewMode);
  const setViewMode = useSettingsStore((state) => state.setNotesViewMode);
  const sort = useSettingsStore((state) => state.notesSort);
  const setSort = useSettingsStore((state) => state.setNotesSort);
  const paper = useSettingsStore((state) => state.notePaper);
  const hidePreviews = useSettingsStore((state) => state.notesHidePreviews);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<NoteFilter>('all');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [tagId, setTagId] = useState<string | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [menuFor, setMenuFor] = useState<NoteSummary | null>(null);
  const [folderEditor, setFolderEditor] = useState<{ folder: FolderWithCount | null } | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);

  usePurgeExpiredTrash();
  const debouncedQuery = useDebouncedValue(query, 250);
  const searching = debouncedQuery.trim().length > 0;

  const notes = useNotes('active', { filter, folderId: folderId ?? undefined, tagId: tagId ?? undefined, sort });
  const results = useSearchNotes(debouncedQuery);
  const { data: folders } = useFolders();
  const { data: tags } = useNoteTags();
  const { data: counts } = useNoteCounts();
  const createNote = useCreateNote();
  const setFlag = useSetNoteFlag();
  const moveToTrash = useMoveNoteToTrash();

  const columns = width >= 700 ? 3 : 2;
  const folderNames = useMemo(() => new Map((folders ?? []).map((folder) => [folder.id, folder.name])), [folders]);

  const rows = useMemo<Row[]>(() => {
    const list = searching ? (results.data ?? []) : (notes.data ?? []);
    const toRows = (items: NoteSummary[]): Row[] =>
      viewMode === 'list'
        ? items.map((item) => ({ kind: 'wide', key: item.id, item }))
        : buildBentoRows(items, { columns, prefersWide: (item) => item.checklist.total >= 5 });

    if (searching) {
      return [{ kind: 'section', key: 's-results', title: 'Results', count: list.length }, ...toRows(list)];
    }
    const showPinnedSection = filter === 'all' && !folderId && !tagId;
    const pinned = showPinnedSection ? list.filter((note) => note.isPinned) : [];
    const rest = showPinnedSection ? list.filter((note) => !note.isPinned) : list;
    const out: Row[] = [];
    if (pinned.length > 0) {
      out.push({ kind: 'section', key: 's-pinned', title: 'Pinned', count: pinned.length }, ...toRows(pinned));
    }
    if (rest.length > 0) {
      const title = folderId ? (folderNames.get(folderId) ?? 'Folder') : pinned.length > 0 ? 'Recent' : 'All notes';
      out.push({ kind: 'section', key: 's-rest', title, count: rest.length }, ...toRows(rest));
    }
    return out;
  }, [searching, results.data, notes.data, viewMode, columns, filter, folderId, tagId, folderNames]);

  const open = useCallback((note: Pick<NoteSummary, 'id'>) => router.push(`/note/${note.id}`), [router]);
  const create = (input: NewNoteInput) =>
    createNote.mutate({ ...input, folderId: input.folderId ?? folderId }, { onSuccess: (note) => open(note) });

  const cardProps = {
    hidePreview: hidePreviews,
    onOpen: open,
    onMenu: setMenuFor,
    onTogglePin: (note: NoteSummary) => setFlag.mutate({ id: note.id, flag: 'pinned', value: !note.isPinned }),
    onTrash: (note: NoteSummary) => moveToTrash.mutate(note.id),
  };

  const renderRow = ({ item: row }: { item: Row }) => {
    if (row.kind === 'section') return <SectionTitle title={row.title} count={row.count} />;
    if (row.kind === 'wide') {
      return (
        <NoteCard
          note={row.item}
          size={viewMode === 'list' ? 'row' : 'wide'}
          folderName={row.item.folderId ? folderNames.get(row.item.folderId) : null}
          {...cardProps}
        />
      );
    }
    return (
      <View style={styles.group}>
        {row.items.map((note) => (
          <NoteCard key={note.id} note={note} size="half" folderName={note.folderId ? folderNames.get(note.folderId) : null} {...cardProps} />
        ))}
        {Array.from({ length: columns - row.items.length }, (_, index) => (
          <View key={`gap-${index}`} style={styles.flex} />
        ))}
      </View>
    );
  };

  const loading = searching ? results.isLoading : notes.isLoading;
  const filtered = searching || filter !== 'all' || !!folderId || !!tagId;

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.flex}>
          <Text variant="displayLarge" accessibilityRole="header">
            Notes
          </Text>
          <Text variant="bodyMedium" color="textSecondary">
            Capture ideas. Keep moving.{counts ? ` · ${counts.all} ${counts.all === 1 ? 'note' : 'notes'}` : ''}
          </Text>
        </View>
        <IconButton name="sliders" variant="muted" accessibilityLabel="View, sort, archive and trash" onPress={() => setOptionsOpen(true)} />
      </View>

      <NoteSearchField value={query} onChange={setQuery} />

      {!searching ? (
        <>
          <NoteFilterBar
            filter={filter}
            onFilter={setFilter}
            tagsOpen={tagsOpen}
            onToggleTags={() => {
              if (tagsOpen) setTagId(null);
              setTagsOpen((open) => !open);
            }}
          />
          {tagsOpen ? <TagFilterRow tags={tags ?? []} activeTagId={tagId} onPick={setTagId} /> : null}
          <FolderStrip
            folders={folders ?? []}
            activeFolderId={folderId}
            onPick={setFolderId}
            onEdit={(folder) => setFolderEditor({ folder })}
            onCreate={() => setFolderEditor({ folder: null })}
          />
        </>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <NotesGridBackground paper={paper === 'plain' ? 'grid' : paper} />
      <FlatList
        data={loading || notes.isError ? [] : rows}
        keyExtractor={(row) => row.key}
        renderItem={renderRow}
        ListHeaderComponent={header}
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletons}>
              <Skeleton height={140} radius={theme.radii.lg} />
              <View style={styles.group}>
                <View style={styles.flex}>
                  <Skeleton height={160} radius={theme.radii.lg} />
                </View>
                <View style={styles.flex}>
                  <Skeleton height={160} radius={theme.radii.lg} />
                </View>
              </View>
            </View>
          ) : notes.isError ? (
            <ErrorState message="Something went wrong. Your notes are safe — try again." onRetry={() => notes.refetch()} />
          ) : (
            <NotesEmptyState filtered={filtered} onCreate={() => setCreating(true)} />
          )
        }
        contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.md, paddingBottom: dockSpace + 80 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        windowSize={9}
        removeClippedSubviews
      />

      <QuickNoteButton bottom={dockSpace - 12} onPress={() => setCreating(true)} />

      <QuickNoteSheet visible={creating} onClose={() => setCreating(false)} onCreate={create} />
      <NoteActions note={menuFor} onClose={() => setMenuFor(null)} onOpen={(id) => open({ id })} />
      <FolderEditorSheet visible={folderEditor !== null} folder={folderEditor?.folder ?? null} onClose={() => setFolderEditor(null)} />
      <ActionSheet
        visible={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        title="Notes"
        subtitle={`Sorted by ${SORT_LABELS[sort].toLowerCase()} · ${viewMode === 'grid' ? 'grid' : 'list'} view`}
        actions={[
          {
            label: viewMode === 'grid' ? 'Show as list' : 'Show as grid',
            icon: viewMode === 'grid' ? 'list' : 'grid',
            onPress: () => setViewMode(viewMode === 'grid' ? 'list' : 'grid'),
          },
          ...(Object.keys(SORT_LABELS) as NotesSort[])
            .filter((key) => key !== sort)
            .map((key) => ({ label: `Sort by ${SORT_LABELS[key].toLowerCase()}`, icon: 'bar-chart-2' as const, onPress: () => setSort(key) })),
          { label: `Archive${counts?.archived ? ` (${counts.archived})` : ''}`, icon: 'archive', onPress: () => router.push('/note/archive') },
          { label: `Trash${counts?.trashed ? ` (${counts.trashed})` : ''}`, icon: 'trash-2', onPress: () => router.push('/note/trash') },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    gap: 12,
  },
  header: {
    gap: 14,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  group: {
    flexDirection: 'row',
    gap: 12,
  },
  skeletons: {
    gap: 12,
  },
});
