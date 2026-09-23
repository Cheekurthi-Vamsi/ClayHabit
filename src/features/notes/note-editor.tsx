import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import {
  Alert,
  AppState,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, IconButton, ProgressBar, Skeleton, Text } from '@/components/ui';
import * as noteRepository from '@/data/repositories/note-repository';
import type { NoteWithTags } from '@/domain/entities/note';
import { NOTE_TYPE_META } from '@/domain/notes/templates';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useSettingsStore, type NoteTextSize } from '@/store/settings-store';
import { fontFamily, useAppTheme } from '@/theme';
import { notePalette } from '@/theme/note-palette';
import { noteStats, toggleChecklistLine } from '@/utils/note-format';

import { FolderPickerSheet } from './components/folder-picker-sheet';
import { LockedNoteView } from './components/locked-note-view';
import { NoteActions } from './components/note-actions';
import { NoteHistorySheet } from './components/note-history-sheet';
import { NotesGridBackground } from './components/notes-grid-background';
import { ReminderSheet } from './components/reminder-sheet';
import { continueList, EditHistory, type EditResult, type Selection } from './editor/editor-actions';
import { EditorToolbar } from './editor/editor-toolbar';
import { NoteDetails } from './editor/note-details';
import { NoteRenderer } from './editor/note-renderer';
import { noteKeys, useFolders, useNoteWithTags, useSetNoteFlag, useSetNoteReminder, useSetNoteTags, useUpdateNote } from './hooks';

const AUTOSAVE_DELAY_MS = 600;
/** Typing within this window counts as one undo step. */
const UNDO_GROUP_MS = 1200;

const TEXT_SIZES: Record<NoteTextSize, { fontSize: number; lineHeight: number }> = {
  small: { fontSize: 15, lineHeight: 23 },
  medium: { fontSize: 17, lineHeight: 26 },
  large: { fontSize: 19, lineHeight: 29 },
};

/** Where one string's edit starts — used to find the cursor right after a keystroke. */
function firstDifference(a: string, b: string): number {
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index++) if (a[index] !== b[index]) return index;
  return length;
}

function lineOffset(body: string, line: number): number {
  let offset = 0;
  const lines = body.split('\n');
  for (let index = 0; index < line && index < lines.length; index++) offset += lines[index].length + 1;
  return Math.min(offset, body.length);
}

export function NoteEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const queryClient = useQueryClient();
  const { data: note, isLoading } = useNoteWithTags(id);
  // Bumped after a history restore, so the editor re-reads the text.
  const [reloadKey, setReloadKey] = useState(0);

  if (isLoading || note === undefined) {
    return (
      <View style={[styles.container, styles.loading, { backgroundColor: theme.colors.background }]}>
        <Skeleton height={34} radius={10} />
        <Skeleton height={220} radius={theme.radii.lg} />
      </View>
    );
  }
  if (note === null) {
    return (
      <View style={[styles.container, styles.missing, { backgroundColor: theme.colors.background }]}>
        <Icon name="file-minus" size={28} color={theme.colors.textTertiary} />
        <Text variant="headlineMedium">This note is gone</Text>
        <Text variant="bodyMedium" color="textSecondary">
          It may have been deleted on another device.
        </Text>
      </View>
    );
  }

  return (
    <NoteEditorBody
      key={`${note.id}-${reloadKey}`}
      note={note}
      onReload={async () => {
        await queryClient.refetchQueries({ queryKey: noteKeys.detail(note.id) });
        setReloadKey((value) => value + 1);
      }}
    />
  );
}

function NoteEditorBody({ note, onReload }: { note: NoteWithTags; onReload: () => void }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const db = useSQLiteContext();
  const reduceMotion = useReduceMotion();
  const keyboardVisible = useKeyboardVisible();

  const defaultPaper = useSettingsStore((state) => state.notePaper);
  const textSize = useSettingsStore((state) => state.noteTextSize);
  const openInPreview = useSettingsStore((state) => state.notesOpenInPreview);

  const updateNote = useUpdateNote();
  const setFlag = useSetNoteFlag();
  const setTags = useSetNoteTags();
  const setReminder = useSetNoteReminder();
  const { data: folders } = useFolders();

  const isEmpty = !note.title.trim() && !note.body.trim();
  // Just created (blank, checklist, template…): straight into writing.
  const [isNew] = useState(() => isEmpty || Date.now() - new Date(note.createdAt).getTime() < 15_000);
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [mode, setMode] = useState<'read' | 'edit'>(isNew || !openInPreview ? 'edit' : 'read');
  const [unlocked, setUnlocked] = useState(!note.isLocked);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [forcedSelection, setForcedSelection] = useState<Selection | undefined>(undefined);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sheet, setSheet] = useState<'actions' | 'folder' | 'reminder' | 'history' | null>(null);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });

  const [selection, setSelection] = useState<Selection>({ start: note.body.length, end: note.body.length });
  const pending = useRef<{ title?: string; body?: string }>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const history = useRef(new EditHistory());
  const lastSnapshot = useRef(0);
  const bodyRef = useRef<TextInput>(null);
  const latest = useRef({ title: note.title, body: note.body });

  const swatch = notePalette[theme.scheme === 'dark' ? 'dark' : 'light'][note.color];
  const paper = note.paper ?? defaultPaper;
  const text = TEXT_SIZES[textSize];
  const stats = useMemo(() => noteStats(body), [body]);
  const folderName = note.folderId ? ((folders ?? []).find((folder) => folder.id === note.folderId)?.name ?? null) : null;

  // ---- Autosave ------------------------------------------------------------------------------

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const input = pending.current;
    pending.current = {};
    if (input.title === undefined && input.body === undefined) return;
    try {
      await updateNote.mutateAsync({ id: note.id, input });
      setSaveState('saved');
    } catch {
      // Keep what failed so the next flush retries it rather than losing it.
      pending.current = { ...input, ...pending.current };
      setSaveState('idle');
    }
  }, [note.id, updateNote]);

  const queueSave = useCallback(
    (change: { title?: string; body?: string }) => {
      pending.current = { ...pending.current, ...change };
      setSaveState('saving');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
    },
    [flush],
  );

  // Never lose text: save when the app is backgrounded (and re-lock locked notes),
  // and on leaving the editor. A note left completely empty is removed.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        void flush();
        if (note.isLocked) setUnlocked(false);
      }
    });
    return () => subscription.remove();
  }, [flush, note.isLocked]);

  useEffect(() => {
    // The same object is updated in place on every keystroke, so this reference stays current.
    const values = latest.current;
    return () => {
      if (timer.current) clearTimeout(timer.current);
      const input = pending.current;
      const { title: lastTitle, body: lastBody } = values;
      if (!lastTitle.trim() && !lastBody.trim()) {
        void noteRepository.permanentlyDelete(db, note.id);
        return;
      }
      if (input.title !== undefined || input.body !== undefined) void noteRepository.update(db, note.id, input);
    };
    // Runs once, on leaving the editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Editing -------------------------------------------------------------------------------

  const snapshot = (force = false) => {
    const now = Date.now();
    if (force || now - lastSnapshot.current > UNDO_GROUP_MS) history.current.push(latest.current.body);
    lastSnapshot.current = now;
    setHistoryState({ canUndo: history.current.canUndo, canRedo: history.current.canRedo });
  };

  const applyBody = (next: string, nextSelection?: Selection) => {
    latest.current.body = next;
    setBody(next);
    queueSave({ body: next });
    if (nextSelection) {
      setSelection(nextSelection);
      setForcedSelection(nextSelection);
    }
  };

  const handleTitle = (next: string) => {
    latest.current.title = next;
    setTitle(next);
    queueSave({ title: next });
  };

  const handleBody = (next: string) => {
    snapshot();
    const previous = latest.current.body;
    const cursor = firstDifference(previous, next) + (next.length - previous.length);
    const continued = continueList(previous, next, cursor);
    if (continued) applyBody(continued.body, continued.selection);
    else applyBody(next);
  };

  const handleToolbar = (result: EditResult) => {
    snapshot(true);
    applyBody(result.body, result.selection);
  };

  const undo = () => {
    const previous = history.current.undo(latest.current.body);
    if (previous === null) return;
    applyBody(previous);
    setHistoryState({ canUndo: history.current.canUndo, canRedo: history.current.canRedo });
  };
  const redo = () => {
    const next = history.current.redo(latest.current.body);
    if (next === null) return;
    applyBody(next);
    setHistoryState({ canUndo: history.current.canUndo, canRedo: history.current.canRedo });
  };

  const toggleChecklist = (line: number) => {
    snapshot(true);
    applyBody(toggleChecklistLine(latest.current.body, line));
  };

  const editAt = (line: number) => {
    const offset = lineOffset(latest.current.body, line);
    const lineEnd = latest.current.body.indexOf('\n', offset);
    const position = lineEnd === -1 ? latest.current.body.length : lineEnd;
    setMode('edit');
    setForcedSelection({ start: position, end: position });
    setSelection({ start: position, end: position });
    setTimeout(() => bodyRef.current?.focus(), 60);
  };

  // ---- Locked --------------------------------------------------------------------------------

  if (note.isLocked && !unlocked) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <IconButton name="arrow-left" variant="muted" accessibilityLabel="Back" onPress={() => router.back()} />
        </View>
        <LockedNoteView title={note.title.trim() || 'Locked note'} onUnlocked={() => setUnlocked(true)} />
      </View>
    );
  }

  const meta = NOTE_TYPE_META[note.noteType];
  const showToolbar = mode === 'edit' && keyboardVisible;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: swatch.paper }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <NotesGridBackground paper={paper} fade={false} />

      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.sm }]}>
        <IconButton name="arrow-left" variant="ghost" accessibilityLabel="Back to notes" onPress={() => router.back()} />
        <Animated.View key={saveState} entering={reduceMotion ? undefined : FadeIn.duration(180)} style={styles.saveState}>
          {saveState !== 'idle' ? (
            <>
              <Icon
                name={saveState === 'saving' ? 'loader' : 'check'}
                size={12}
                color={saveState === 'saving' ? theme.colors.textTertiary : theme.colors.success}
              />
              <Text variant="caption" color="textTertiary">
                {saveState === 'saving' ? 'Saving…' : 'Saved'}
              </Text>
            </>
          ) : null}
        </Animated.View>
        <View style={styles.headerActions}>
          <IconButton
            name={mode === 'read' ? 'edit-3' : 'eye'}
            variant="ghost"
            accessibilityLabel={mode === 'read' ? 'Edit note' : 'Read note'}
            onPress={() => {
              if (mode === 'edit') void flush();
              setMode(mode === 'read' ? 'edit' : 'read');
            }}
          />
          <IconButton
            name="bookmark"
            variant={note.isPinned ? 'filled' : 'ghost'}
            accessibilityLabel={note.isPinned ? 'Unpin note' : 'Pin note'}
            onPress={() => setFlag.mutate({ id: note.id, flag: 'pinned', value: !note.isPinned })}
          />
          <IconButton name="more-horizontal" variant="ghost" accessibilityLabel="Note actions" onPress={() => setSheet('actions')} />
        </View>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Animated.View entering={reduceMotion ? undefined : FadeInDown.springify().damping(18)} style={styles.titleBlock}>
          <View style={styles.metaRow}>
            <View style={[styles.typeChip, { backgroundColor: `${swatch.accent}1F` }]}>
              <Icon name={meta.icon} size={12} color={swatch.accent} />
              <Text variant="caption" style={{ color: swatch.accent }}>
                {folderName ? `${meta.label} · ${folderName}` : meta.label}
              </Text>
            </View>
            {note.isLocked ? <Icon name="lock" size={13} color={theme.colors.textTertiary} /> : null}
            {note.reminderAt ? <Icon name="bell" size={13} color={theme.colors.textTertiary} /> : null}
          </View>
          <TextInput
            value={title}
            onChangeText={handleTitle}
            placeholder="Title"
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            blurOnSubmit
            returnKeyType="next"
            onSubmitEditing={() => {
              setMode('edit');
              setTimeout(() => bodyRef.current?.focus(), 40);
            }}
            accessibilityLabel="Note title"
            autoFocus={isNew && !note.title.trim()}
            style={[styles.title, { color: theme.colors.textPrimary }]}
          />
        </Animated.View>

        {stats.checklist.total > 0 ? (
          <View style={styles.progress}>
            <ProgressBar
              progress={stats.checklist.done / stats.checklist.total}
              color={swatch.accent}
              trackColor={theme.scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(27,33,64,0.08)'}
              height={6}
            />
            <Text variant="caption" color="textSecondary">
              {stats.checklist.done} / {stats.checklist.total} completed ·{' '}
              {Math.round((stats.checklist.done / stats.checklist.total) * 100)}%
            </Text>
          </View>
        ) : null}

        {mode === 'read' ? (
          body.trim() ? (
            <NoteRenderer
              body={body}
              text={text}
              accent={swatch.accent}
              onToggleChecklist={toggleChecklist}
              onEditLine={editAt}
            />
          ) : (
            <Pressable onPress={() => editAt(0)} accessibilityRole="button" style={styles.emptyBody}>
              <Text variant="bodyLarge" color="textTertiary">
                Tap to start writing…
              </Text>
            </Pressable>
          )
        ) : (
          <TextInput
            ref={bodyRef}
            value={body}
            onChangeText={handleBody}
            selection={forcedSelection}
            onSelectionChange={(event) => {
              setSelection(event.nativeEvent.selection);
              if (forcedSelection) setForcedSelection(undefined);
            }}
            multiline
            autoFocus={isNew && !!note.title.trim()}
            scrollEnabled={false}
            placeholder="Start writing…"
            placeholderTextColor={theme.colors.textTertiary}
            textAlignVertical="top"
            accessibilityLabel="Note text"
            style={[styles.body, text, { color: theme.colors.textPrimary }]}
          />
        )}

        <Pressable
          onPress={() => setDetailsOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: detailsOpen }}
          style={styles.detailsToggle}
        >
          <Icon name={detailsOpen ? 'chevron-up' : 'sliders'} size={15} color={theme.colors.primary} />
          <Text variant="labelLarge" color="primary">
            {detailsOpen ? 'Hide details' : 'Folder, tags, colour & more'}
          </Text>
          {!detailsOpen && note.tags.length > 0 ? (
            <Text variant="caption" color="textTertiary" numberOfLines={1} style={styles.flex}>
              {note.tags.map((tag) => `#${tag.name}`).join(' ')}
            </Text>
          ) : null}
        </Pressable>

        {detailsOpen ? (
          <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(200)}>
            <NoteDetails
              note={note}
              folderName={folderName}
              paper={paper}
              stats={stats}
              onColor={(color) => updateNote.mutate({ id: note.id, input: { color } })}
              onPaper={(value) => updateNote.mutate({ id: note.id, input: { paper: value } })}
              onType={(noteType) => updateNote.mutate({ id: note.id, input: { noteType } })}
              onTags={(tagNames) => setTags.mutate({ noteId: note.id, tagNames })}
              onFolder={() => setSheet('folder')}
              onReminder={() => setSheet('reminder')}
              onHistory={() => {
                void flush();
                setSheet('history');
              }}
            />
          </Animated.View>
        ) : null}
      </ScrollView>

      {showToolbar ? (
        <View
          style={[
            styles.toolbar,
            { backgroundColor: theme.colors.backgroundElevated, borderTopColor: theme.colors.border, paddingBottom: Platform.OS === 'ios' ? 0 : 4 },
          ]}
        >
          <EditorToolbar
            body={body}
            selection={selection}
            onEdit={handleToolbar}
            canUndo={historyState.canUndo}
            canRedo={historyState.canRedo}
            onUndo={undo}
            onRedo={redo}
            onDone={() => bodyRef.current?.blur()}
          />
        </View>
      ) : null}
      {!keyboardVisible ? <View style={{ height: insets.bottom }} /> : null}

      <NoteActions
        note={sheet === 'actions' ? { ...note, excerpt: body, checklist: stats.checklist } : null}
        onClose={() => setSheet(null)}
        onLeave={() => router.back()}
      />
      <FolderPickerSheet
        visible={sheet === 'folder'}
        currentFolderId={note.folderId}
        onClose={() => setSheet(null)}
        onPick={(folderId) => updateNote.mutate({ id: note.id, input: { folderId } })}
      />
      <ReminderSheet
        visible={sheet === 'reminder'}
        current={note.reminderAt}
        onClose={() => setSheet(null)}
        onPick={async (date) => {
          const ok = await setReminder.mutateAsync({ id: note.id, at: date }).catch(() => true);
          if (!ok) Alert.alert('Notifications are off', 'Allow notifications for ClayHabbit in system settings to get reminders.');
        }}
      />
      <NoteHistorySheet noteId={note.id} visible={sheet === 'history'} onClose={() => setSheet(null)} onRestored={onReload} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    padding: 20,
    paddingTop: 80,
    gap: 16,
  },
  missing: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 6,
    gap: 4,
  },
  saveState: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 22,
    paddingBottom: 60,
    gap: 16,
  },
  titleBlock: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  title: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: 30,
    lineHeight: 37,
    letterSpacing: -0.4,
    padding: 0,
  },
  progress: {
    gap: 6,
  },
  body: {
    fontFamily: fontFamily.regular,
    minHeight: 260,
    padding: 0,
  },
  emptyBody: {
    minHeight: 200,
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  toolbar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
  },
});
