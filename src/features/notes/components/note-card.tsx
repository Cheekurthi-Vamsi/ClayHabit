import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Icon, ProgressBar, SwipeAction, Text } from '@/components/ui';
import type { NoteSummary } from '@/domain/entities/note';
import { NOTE_TYPE_META } from '@/domain/notes/templates';
import { usePressScale } from '@/hooks/use-press-scale';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import * as Haptics from '@/lib/haptics';
import { useAppTheme } from '@/theme';
import { notePalette } from '@/theme/note-palette';
import { formatRelativeTime } from '@/utils/date';
import { displayTitle } from '@/utils/markdown';

export type NoteCardSize = 'wide' | 'half' | 'row';

interface NoteCardProps {
  note: NoteSummary;
  size?: NoteCardSize;
  folderName?: string | null;
  /** Privacy mode: blur bars instead of the text. */
  hidePreview?: boolean;
  onOpen: (note: NoteSummary) => void;
  onMenu: (note: NoteSummary) => void;
  /** Row layout only: swipe right to pin, left to trash. */
  onTogglePin?: (note: NoteSummary) => void;
  onTrash?: (note: NoteSummary) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Stand-in bars for hidden or locked previews — the shape of text without the words. */
function PrivacyBars({ lines, color }: { lines: number; color: string }) {
  const widths = ['92%', '78%', '60%', '84%'];
  return (
    <View style={styles.bars} accessibilityLabel="Preview hidden">
      {Array.from({ length: lines }, (_, index) => (
        <View
          key={index}
          style={[styles.bar, { width: widths[index % widths.length] as `${number}%`, backgroundColor: color }]}
        />
      ))}
    </View>
  );
}

function CardBody({ note, size, folderName, hidePreview, onOpen, onMenu }: NoteCardProps & { size: NoteCardSize }) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  const { animatedStyle, onPressIn, onPressOut } = usePressScale({ scaleTo: 0.97 });
  const swatch = notePalette[theme.scheme === 'dark' ? 'dark' : 'light'][note.color];
  const meta = NOTE_TYPE_META[note.noteType];
  const title = displayTitle({ title: note.title, body: note.excerpt });
  const { done, total } = note.checklist;
  const muted = theme.scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(27,33,64,0.08)';
  const previewLines = size === 'wide' ? 4 : size === 'half' ? 5 : 2;

  return (
    <AnimatedPressable
      entering={reduceMotion ? undefined : FadeIn.duration(220)}
      onPress={() => onOpen(note)}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onMenu(note);
      }}
      delayLongPress={320}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={`${title}${note.isLocked ? ', locked' : ''}${note.isPinned ? ', pinned' : ''}`}
      accessibilityHint="Opens the note. Long press for more actions."
      style={[
        styles.card,
        size === 'half' && styles.half,
        {
          backgroundColor: swatch.paper,
          borderColor: note.color === 'default' ? theme.colors.border : `${swatch.accent}33`,
          borderRadius: theme.radii.lg,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.typeChip, { backgroundColor: `${swatch.accent}1F` }]}>
          <Icon name={note.isLocked ? 'lock' : meta.icon} size={12} color={swatch.accent} />
          <Text variant="caption" style={{ color: swatch.accent }} numberOfLines={1}>
            {note.isLocked ? 'Locked' : (folderName ?? meta.label)}
          </Text>
        </View>
        <View style={styles.flags}>
          {note.reminderAt ? <Icon name="bell" size={13} color={theme.colors.textSecondary} /> : null}
          {note.isFavorite ? <Icon name="star" size={13} color={theme.colors.warning} /> : null}
          {note.isPinned ? <Icon name="bookmark" size={13} color={theme.colors.primary} /> : null}
          <Pressable
            onPress={() => onMenu(note)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`More actions for ${title}`}
          >
            <Icon name="more-horizontal" size={16} color={theme.colors.textTertiary} />
          </Pressable>
        </View>
      </View>

      <Text variant={size === 'row' ? 'titleMedium' : 'titleLarge'} numberOfLines={2}>
        {title}
      </Text>

      {note.isLocked || hidePreview ? (
        <PrivacyBars lines={size === 'row' ? 1 : 2} color={muted} />
      ) : note.excerpt && !(total > 0 && size === 'row') ? (
        <Text variant="bodySmall" color="textSecondary" numberOfLines={previewLines}>
          {note.excerpt}
        </Text>
      ) : null}

      {total > 0 && !note.isLocked ? (
        <View style={styles.progress}>
          <ProgressBar progress={done / total} color={swatch.accent} trackColor={muted} height={5} />
          <Text variant="caption" color="textSecondary">
            {done}/{total} done · {Math.round((done / total) * 100)}%
          </Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text variant="caption" color="textTertiary">
          {formatRelativeTime(note.updatedAt)}
        </Text>
        {note.tags.slice(0, size === 'wide' ? 3 : 2).map((tag) => (
          <Text key={tag.id} variant="caption" style={{ color: tag.color }} numberOfLines={1}>
            #{tag.name}
          </Text>
        ))}
        {note.tags.length > (size === 'wide' ? 3 : 2) ? (
          <Text variant="caption" color="textTertiary">
            +{note.tags.length - (size === 'wide' ? 3 : 2)}
          </Text>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

/**
 * One note in the Notes workspace. Pastel paper by colour, a small type
 * label, title, preview (blurred for locked notes or in privacy mode),
 * checklist progress, date and tags. Long press (or •••) opens its actions.
 */
export const NoteCard = memo(function NoteCard(props: NoteCardProps) {
  const size = props.size ?? 'half';
  if (size !== 'row' || !props.onTogglePin || !props.onTrash) return <CardBody {...props} size={size} />;

  const { note, onTogglePin, onTrash } = props;
  return (
    <Swipeable
      friction={2}
      leftThreshold={60}
      rightThreshold={60}
      renderLeftActions={() => (
        <View style={styles.swipeLeft}>
          <SwipeAction
            icon="bookmark"
            color="primary"
            label={note.isPinned ? 'Unpin' : 'Pin'}
            onPress={() => onTogglePin(note)}
          />
        </View>
      )}
      renderRightActions={() => (
        <View style={styles.swipeRight}>
          <SwipeAction icon="trash-2" color="error" label="Move to trash" onPress={() => onTrash(note)} />
        </View>
      )}
    >
      <CardBody {...props} size={size} />
    </Swipeable>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: 14,
    gap: 8,
    borderWidth: 1,
  },
  half: {
    flex: 1,
    minHeight: 150,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    flexShrink: 1,
  },
  flags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bars: {
    gap: 6,
    paddingVertical: 2,
  },
  bar: {
    height: 9,
    borderRadius: 5,
  },
  progress: {
    gap: 4,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 'auto',
  },
  swipeLeft: {
    marginRight: 8,
    flexDirection: 'row',
  },
  swipeRight: {
    marginLeft: 8,
    flexDirection: 'row',
  },
});
