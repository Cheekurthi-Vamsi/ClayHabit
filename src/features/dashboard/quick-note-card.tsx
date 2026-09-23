import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Card, Icon, Text } from '@/components/ui';
import type { NoteSummary } from '@/domain/entities/note';
import { useAppTheme } from '@/theme';
import { formatRelativeTime } from '@/utils/date';
import { displayTitle } from '@/utils/markdown';

import { useCreateNote } from '../notes/hooks';

export function QuickNoteCard({ note }: { note: NoteSummary | null }) {
  const theme = useAppTheme();
  const router = useRouter();
  const createNote = useCreateNote();

  const open = () => {
    if (note) router.push(`/note/${note.id}`);
    else createNote.mutate(undefined, { onSuccess: (created) => router.push(`/note/${created.id}`) });
  };

  const title = note ? displayTitle({ title: note.title, body: note.excerpt }) : 'Capture a thought';
  const preview = note
    ? note.isLocked
      ? 'Locked note'
      : note.excerpt || 'No additional text'
    : 'Tap to start a new note.';

  return (
    <Card onPress={open} accessibilityLabel={note ? `Open note ${title}` : 'Write a new note'} style={styles.card}>
      <LinearGradient
        colors={theme.gradients.lavenderPink}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.icon}
      >
        <Icon name={note ? (note.isLocked ? 'lock' : 'file-text') : 'edit-3'} size={18} color="#FFFFFF" />
      </LinearGradient>
      <View style={styles.body}>
        <Text variant="titleMedium" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="bodySmall" color="textSecondary" numberOfLines={2}>
          {preview}
        </Text>
        {note ? (
          <Text variant="caption" color="textTertiary">
            Updated {formatRelativeTime(note.updatedAt).toLowerCase()}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 14,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 3,
  },
});
