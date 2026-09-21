import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip, IconButton, Skeleton, Text } from '@/components/ui';
import type { NoteWithTags } from '@/domain/entities/note';
import { useAppTheme } from '@/theme';

import { FormattingToolbar, type Selection } from './formatting-toolbar';
import {
  useCreateFolder,
  useFolders,
  useMoveNoteToTrash,
  useNoteWithTags,
  useSetNoteArchived,
  useSetNotePinned,
  useSetNoteTags,
  useUpdateNote,
} from './hooks';

const AUTOSAVE_DELAY_MS = 600;

export function NoteEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const { data: note, isLoading } = useNoteWithTags(id);

  if (isLoading || !note) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, padding: 20 }]}>
        <Skeleton height={28} radius={8} />
        <View style={{ height: 16 }} />
        <Skeleton height={200} radius={theme.radii.lg} />
      </View>
    );
  }

  return <NoteEditorBody key={note.id} note={note} />;
}

function NoteEditorBody({ note }: { note: NoteWithTags }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const updateNote = useUpdateNote();
  const setPinned = useSetNotePinned();
  const setArchived = useSetNoteArchived();
  const moveToTrash = useMoveNoteToTrash();
  const setTags = useSetNoteTags();
  const { data: folders } = useFolders();
  const createFolder = useCreateFolder();

  const [body, setBody] = useState(note.body);
  const [selection, setSelection] = useState<Selection>({ start: body.length, end: body.length });
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [newTag, setNewTag] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [addingFolder, setAddingFolder] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback(
    (nextBody: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setSaveState('saving');
      timeoutRef.current = setTimeout(() => {
        updateNote.mutate(
          { id: note.id, input: { body: nextBody } },
          { onSuccess: () => setSaveState('saved') },
        );
      }, AUTOSAVE_DELAY_MS);
    },
    [note.id, updateNote],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleChangeText = (text: string) => {
    setBody(text);
    scheduleSave(text);
  };

  const handleToolbarChange = (nextBody: string, cursor: number) => {
    setBody(nextBody);
    setSelection({ start: cursor, end: cursor });
    scheduleSave(nextBody);
  };

  const handleTrash = () => {
    Alert.alert('Move to Trash?', 'You can restore it later from Trash.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Move to Trash',
        style: 'destructive',
        onPress: () => moveToTrash.mutate(note.id, { onSuccess: () => router.back() }),
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.headerRow, { paddingTop: insets.top + theme.spacing.sm }]}>
        <IconButton name="arrow-left" variant="ghost" accessibilityLabel="Back" onPress={() => router.back()} />
        <View style={styles.headerActions}>
          <Text variant="caption" color="textTertiary" style={styles.saveLabel}>
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : ''}
          </Text>
          <IconButton
            name="star"
            variant={note.isPinned ? 'filled' : 'ghost'}
            accessibilityLabel={note.isPinned ? 'Unpin note' : 'Pin note'}
            onPress={() => setPinned.mutate({ id: note.id, isPinned: !note.isPinned })}
          />
          <IconButton
            name="archive"
            variant={note.isArchived ? 'filled' : 'ghost'}
            accessibilityLabel={note.isArchived ? 'Unarchive note' : 'Archive note'}
            onPress={() => setArchived.mutate({ id: note.id, isArchived: !note.isArchived })}
          />
          <IconButton name="trash-2" variant="ghost" accessibilityLabel="Move to trash" onPress={handleTrash} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          value={body}
          onChangeText={handleChangeText}
          onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
          multiline
          autoFocus={note.body.length === 0}
          placeholder="Start writing…"
          placeholderTextColor={theme.colors.textTertiary}
          style={[theme.typography.bodyLarge, { color: theme.colors.textPrimary, minHeight: 240 }]}
        />

        <View style={styles.metaSection}>
          <Text variant="labelMedium" color="textSecondary">
            FOLDER
          </Text>
          <View style={styles.chipRow}>
            <Chip
              label="None"
              selected={!note.folderId}
              onPress={() => updateNote.mutate({ id: note.id, input: { folderId: null } })}
            />
            {(folders ?? []).map((folder) => (
              <Chip
                key={folder.id}
                label={folder.name}
                selected={note.folderId === folder.id}
                onPress={() => updateNote.mutate({ id: note.id, input: { folderId: folder.id } })}
              />
            ))}
            {addingFolder ? (
              <TextInput
                value={newFolderName}
                onChangeText={setNewFolderName}
                placeholder="Folder name"
                placeholderTextColor={theme.colors.textTertiary}
                autoFocus
                onSubmitEditing={() => {
                  if (!newFolderName.trim()) return;
                  createFolder.mutate(
                    { name: newFolderName, color: theme.colors.primary },
                    {
                      onSuccess: (folder) => {
                        updateNote.mutate({ id: note.id, input: { folderId: folder.id } });
                        setNewFolderName('');
                        setAddingFolder(false);
                      },
                    },
                  );
                }}
                style={[
                  styles.inlineInput,
                  {
                    color: theme.colors.textPrimary,
                    backgroundColor: theme.colors.surfaceMuted,
                    borderRadius: theme.radii.full,
                  },
                ]}
              />
            ) : (
              <Chip label="+ New" onPress={() => setAddingFolder(true)} />
            )}
          </View>

          <Text variant="labelMedium" color="textSecondary">
            TAGS
          </Text>
          <View style={styles.chipRow}>
            {note.tags.map((tag) => (
              <Chip key={tag.id} label={tag.name} selected />
            ))}
            <TextInput
              value={newTag}
              onChangeText={setNewTag}
              placeholder="Add tag"
              placeholderTextColor={theme.colors.textTertiary}
              onSubmitEditing={() => {
                if (!newTag.trim()) return;
                setTags.mutate({ noteId: note.id, tagNames: [...note.tags.map((t) => t.name), newTag.trim()] });
                setNewTag('');
              }}
              style={[
                styles.inlineInput,
                {
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.surfaceMuted,
                  borderRadius: theme.radii.full,
                },
              ]}
            />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.toolbarWrap, { paddingBottom: insets.bottom, borderTopColor: theme.colors.border }]}>
        <FormattingToolbar body={body} selection={selection} onChange={handleToolbarChange} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  saveLabel: {
    marginRight: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },
  metaSection: {
    gap: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  inlineInput: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    fontSize: 13,
    minWidth: 100,
  },
  toolbarWrap: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
  },
});
