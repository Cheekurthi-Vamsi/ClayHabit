import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text, type IconName } from '@/components/ui';
import { NOTE_COLORS, NOTE_PAPERS, NOTE_TYPES, type NoteColor, type NotePaper, type NoteType, type NoteWithTags } from '@/domain/entities/note';
import { NOTE_TYPE_META } from '@/domain/notes/templates';
import * as Haptics from '@/lib/haptics';
import { useAppTheme } from '@/theme';
import { notePalette } from '@/theme/note-palette';

import { TagPicker } from '../components/tag-picker';

const PAPER_ICONS: Record<NotePaper, IconName> = { grid: 'grid', lines: 'align-justify', dots: 'more-horizontal', plain: 'square' };

function Label({ children }: { children: string }) {
  return (
    <Text variant="labelMedium" color="textSecondary">
      {children.toUpperCase()}
    </Text>
  );
}

function Row({ icon, label, value, onPress }: { icon: IconName; label: string; value: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.colors.surfacePressed : theme.colors.surfaceMuted, borderRadius: theme.radii.md },
      ]}
    >
      <Icon name={icon} size={16} color={theme.colors.primary} />
      <Text variant="labelLarge" style={styles.flex}>
        {label}
      </Text>
      <Text variant="bodySmall" color="textSecondary" numberOfLines={1} style={styles.value}>
        {value}
      </Text>
      <Icon name="chevron-right" size={16} color={theme.colors.textTertiary} />
    </Pressable>
  );
}

interface NoteDetailsProps {
  note: NoteWithTags;
  folderName: string | null;
  paper: NotePaper;
  stats: { words: number; readingMinutes: number };
  onColor: (color: NoteColor) => void;
  onPaper: (paper: NotePaper) => void;
  onType: (type: NoteType) => void;
  onTags: (names: string[]) => void;
  onFolder: () => void;
  onReminder: () => void;
  onHistory: () => void;
}

/** Everything about a note that isn't its text: organisation, look, reminder, history and stats. */
export function NoteDetails({
  note,
  folderName,
  paper,
  stats,
  onColor,
  onPaper,
  onType,
  onTags,
  onFolder,
  onReminder,
  onHistory,
}: NoteDetailsProps) {
  const theme = useAppTheme();
  const palette = notePalette[theme.scheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.lg }]}>
      <View style={styles.section}>
        <Row icon="folder" label="Folder" value={folderName ?? 'None'} onPress={onFolder} />
        <Row
          icon="bell"
          label="Reminder"
          value={note.reminderAt ? new Date(note.reminderAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Off'}
          onPress={onReminder}
        />
        <Row icon="clock" label="History" value="Earlier versions" onPress={onHistory} />
      </View>

      <View style={styles.section}>
        <Label>Tags</Label>
        <TagPicker tags={note.tags} onChange={onTags} />
      </View>

      <View style={styles.section}>
        <Label>Colour</Label>
        <View style={styles.wrap}>
          {NOTE_COLORS.map((color) => {
            const selected = note.color === color;
            return (
              <Pressable
                key={color}
                onPress={() => {
                  Haptics.selectionAsync();
                  onColor(color);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={palette[color].label}
                style={[
                  styles.swatch,
                  {
                    backgroundColor: palette[color].paper,
                    borderColor: selected ? palette[color].accent : theme.colors.border,
                    borderWidth: selected ? 2.5 : 1,
                  },
                ]}
              >
                {selected ? <Icon name="check" size={14} color={palette[color].accent} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Label>Paper</Label>
        <View style={styles.wrap}>
          {NOTE_PAPERS.map((value) => {
            const selected = paper === value;
            return (
              <Pressable
                key={value}
                onPress={() => onPaper(value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${value} paper`}
                style={[
                  styles.option,
                  {
                    backgroundColor: selected ? theme.colors.primaryMuted : theme.colors.surfaceMuted,
                    borderColor: selected ? theme.colors.primary : 'transparent',
                  },
                ]}
              >
                <Icon name={PAPER_ICONS[value]} size={14} color={selected ? theme.colors.primary : theme.colors.textSecondary} />
                <Text variant="labelMedium" style={{ color: selected ? theme.colors.primary : theme.colors.textSecondary }}>
                  {value[0].toUpperCase() + value.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Label>Type</Label>
        <View style={styles.wrap}>
          {NOTE_TYPES.map((type) => {
            const selected = note.noteType === type;
            const meta = NOTE_TYPE_META[type];
            return (
              <Pressable
                key={type}
                onPress={() => onType(type)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={meta.label}
                style={[
                  styles.option,
                  {
                    backgroundColor: selected ? theme.colors.primaryMuted : theme.colors.surfaceMuted,
                    borderColor: selected ? theme.colors.primary : 'transparent',
                  },
                ]}
              >
                <Icon name={meta.icon} size={14} color={selected ? theme.colors.primary : theme.colors.textSecondary} />
                <Text variant="labelMedium" style={{ color: selected ? theme.colors.primary : theme.colors.textSecondary }}>
                  {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text variant="caption" color="textTertiary">
        {stats.words} {stats.words === 1 ? 'word' : 'words'}
        {stats.readingMinutes > 0 ? ` · ${stats.readingMinutes} min read` : ''} · Created{' '}
        {new Date(note.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })} · Edited{' '}
        {new Date(note.updatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 18,
    borderWidth: 1,
  },
  section: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  flex: {
    flex: 1,
  },
  value: {
    maxWidth: '50%',
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
  },
});
