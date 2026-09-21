import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Card, Icon, SwipeAction, Text } from '@/components/ui';
import type { Note } from '@/domain/entities/note';
import { useAppTheme } from '@/theme';
import { getPreviewText } from '@/utils/markdown';

import { useMoveNoteToTrash } from './hooks';

interface NoteCardProps {
  note: Note;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NoteCard({ note }: NoteCardProps) {
  const theme = useAppTheme();
  const router = useRouter();
  const moveToTrash = useMoveNoteToTrash();
  const preview = getPreviewText(note.body);
  const title = note.title.trim().length > 0 ? note.title : 'New Note';

  return (
    <Swipeable
      containerStyle={styles.swipeContainer}
      renderRightActions={() => (
        <View style={styles.swipeActions}>
          <SwipeAction
            icon="trash-2"
            color="error"
            label="Move to trash"
            onPress={() => moveToTrash.mutate(note.id)}
          />
        </View>
      )}
    >
      <Card style={styles.card} onPress={() => router.push(`/note/${note.id}`)} accessibilityLabel={title}>
        <View style={styles.header}>
          <Text variant="titleMedium" numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          {note.isPinned && <Icon name="star" size={14} color={theme.colors.primary} />}
        </View>
        {preview.length > 0 && (
          <Text variant="bodySmall" color="textSecondary" numberOfLines={2}>
            {preview}
          </Text>
        )}
        <Text variant="caption" color="textTertiary">
          {relativeTime(note.updatedAt)}
        </Text>
      </Card>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    marginBottom: 10,
  },
  card: {
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
  },
  swipeActions: {
    marginLeft: 8,
  },
});
