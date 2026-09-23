import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BottomSheet, Icon, Text } from '@/components/ui';
import { useAppTheme } from '@/theme';
import { bodyPreview, displayTitle } from '@/utils/markdown';

import { useNoteRevisions, useRestoreRevision } from '../hooks';

function when(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (date.toDateString() === today.toDateString()) return `Today · ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday · ${time}`;
  return `${date.toLocaleDateString([], { day: 'numeric', month: 'short' })} · ${time}`;
}

interface NoteHistorySheetProps {
  noteId: string;
  visible: boolean;
  onClose: () => void;
  /** Called after a version is put back, so the editor can reload its text. */
  onRestored: () => void;
}

/**
 * Earlier versions of a note, snapshotted on meaningful edits (at most one
 * every 10 minutes, newest 30 kept). Restoring keeps the current text as a
 * version too, so it's never a one-way door.
 */
export function NoteHistorySheet({ noteId, visible, onClose, onRestored }: NoteHistorySheetProps) {
  const theme = useAppTheme();
  const { data: revisions, isLoading } = useNoteRevisions(noteId, visible);
  const restore = useRestoreRevision();

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Note history" subtitle="Tap a version to put it back.">
      {(close) =>
        isLoading ? null : (revisions?.length ?? 0) === 0 ? (
          <Text variant="bodyMedium" color="textSecondary">
            No earlier versions yet. ClayHabbit keeps one as you make changes, at most every 10 minutes.
          </Text>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.list}>
            {revisions!.map((revision) => (
              <Pressable
                key={revision.id}
                onPress={() =>
                  Alert.alert('Restore this version?', 'The current text is saved in history first, so you can switch back.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Restore',
                      onPress: () =>
                        restore.mutate(revision.id, {
                          onSuccess: () => close(onRestored),
                        }),
                    },
                  ])
                }
                accessibilityRole="button"
                accessibilityLabel={`Version from ${when(revision.createdAt)}`}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: pressed ? theme.colors.surfacePressed : theme.colors.surfaceMuted,
                    borderRadius: theme.radii.md,
                  },
                ]}
              >
                <Icon name="clock" size={16} color={theme.colors.primary} />
                <View style={styles.flex}>
                  <Text variant="labelLarge">{when(revision.createdAt)}</Text>
                  <Text variant="bodySmall" color="textSecondary" numberOfLines={2}>
                    {displayTitle(revision)} — {bodyPreview(revision.body, { maxLength: 90 }) || 'empty'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )
      }
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxHeight: 420,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  flex: {
    flex: 1,
  },
});
