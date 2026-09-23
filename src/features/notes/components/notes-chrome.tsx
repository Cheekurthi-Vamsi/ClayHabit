import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { CartoonPress, Icon, Text, type IconName } from '@/components/ui';
import type { NoteFilter } from '@/data/repositories/note-repository';
import type { FolderWithCount } from '@/domain/entities/folder';
import type { TagWithCount } from '@/data/repositories/tag-repository';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import * as Haptics from '@/lib/haptics';
import { useAppTheme } from '@/theme';

// ---- Search ----------------------------------------------------------------------------------

export function NoteSearchField({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.search,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.full },
      ]}
    >
      <Icon name="search" size={18} color={theme.colors.textTertiary} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search notes, tags, folders…"
        placeholderTextColor={theme.colors.textTertiary}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel="Search notes"
        style={[styles.searchInput, theme.typography.bodyLarge, { color: theme.colors.textPrimary }]}
      />
      {value ? (
        <Pressable onPress={() => onChange('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
          <Icon name="x-circle" size={18} color={theme.colors.textTertiary} />
        </Pressable>
      ) : null}
    </View>
  );
}

// ---- Filter pills ----------------------------------------------------------------------------

export const FILTERS: { key: NoteFilter; label: string; icon: IconName }[] = [
  { key: 'all', label: 'All', icon: 'grid' },
  { key: 'pinned', label: 'Pinned', icon: 'bookmark' },
  { key: 'favorites', label: 'Favourites', icon: 'star' },
  { key: 'recent', label: 'Recent', icon: 'clock' },
  { key: 'checklists', label: 'Checklists', icon: 'check-square' },
  { key: 'code', label: 'Code', icon: 'code' },
  { key: 'reminders', label: 'Reminders', icon: 'bell' },
  { key: 'locked', label: 'Locked', icon: 'lock' },
];

function Pill({ label, icon, selected, onPress }: { label: string; icon?: IconName; selected: boolean; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: selected ? theme.colors.textPrimary : theme.colors.surface,
          borderColor: selected ? theme.colors.textPrimary : theme.colors.border,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
      ]}
    >
      {icon ? <Icon name={icon} size={14} color={selected ? theme.colors.background : theme.colors.textSecondary} /> : null}
      <Text variant="labelLarge" style={{ color: selected ? theme.colors.background : theme.colors.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function NoteFilterBar({
  filter,
  onFilter,
  tagsOpen,
  onToggleTags,
}: {
  filter: NoteFilter;
  onFilter: (filter: NoteFilter) => void;
  tagsOpen: boolean;
  onToggleTags: () => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
      {FILTERS.map((item) => (
        <Pill key={item.key} label={item.label} icon={item.icon} selected={filter === item.key} onPress={() => onFilter(item.key)} />
      ))}
      <Pill label="Tags" icon="hash" selected={tagsOpen} onPress={onToggleTags} />
    </ScrollView>
  );
}

export function TagFilterRow({
  tags,
  activeTagId,
  onPick,
}: {
  tags: TagWithCount[];
  activeTagId: string | null;
  onPick: (tagId: string | null) => void;
}) {
  const theme = useAppTheme();
  if (tags.length === 0) {
    return (
      <Text variant="bodySmall" color="textTertiary" style={styles.hint}>
        No tags yet — add #tags to a note from its editor.
      </Text>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
      {tags.map((tag) => {
        const selected = tag.id === activeTagId;
        return (
          <Pressable
            key={tag.id}
            onPress={() => onPick(selected ? null : tag.id)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`Tag ${tag.name}, ${tag.noteCount} notes`}
            style={[
              styles.tagPill,
              { backgroundColor: selected ? tag.color : `${tag.color}14`, borderColor: `${tag.color}55` },
            ]}
          >
            <Text variant="labelLarge" style={{ color: selected ? '#FFFFFF' : tag.color }}>
              #{tag.name}
            </Text>
            <Text variant="caption" style={{ color: selected ? '#FFFFFF' : theme.colors.textTertiary }}>
              {tag.noteCount}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ---- Folders ---------------------------------------------------------------------------------

export function FolderStrip({
  folders,
  activeFolderId,
  onPick,
  onEdit,
  onCreate,
}: {
  folders: FolderWithCount[];
  activeFolderId: string | null;
  onPick: (folderId: string | null) => void;
  onEdit: (folder: FolderWithCount) => void;
  onCreate: () => void;
}) {
  const theme = useAppTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folders}>
      {folders.map((folder) => {
        const selected = folder.id === activeFolderId;
        return (
          <Pressable
            key={folder.id}
            onPress={() => {
              Haptics.selectionAsync();
              onPick(selected ? null : folder.id);
            }}
            onLongPress={() => onEdit(folder)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${folder.name}, ${folder.noteCount} notes`}
            accessibilityHint="Long press to rename, recolour or delete."
            style={({ pressed }) => [
              styles.folder,
              {
                backgroundColor: selected ? `${folder.color}1F` : theme.colors.surface,
                borderColor: selected ? folder.color : theme.colors.border,
                borderRadius: theme.radii.lg,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              },
            ]}
          >
            <View style={[styles.folderIcon, { backgroundColor: `${folder.color}22` }]}>
              <Icon name={(folder.icon ?? 'folder') as IconName} size={16} color={folder.color} />
            </View>
            <Text variant="titleMedium" numberOfLines={1}>
              {folder.name}
            </Text>
            <Text variant="caption" color="textTertiary">
              {folder.noteCount} {folder.noteCount === 1 ? 'note' : 'notes'}
            </Text>
          </Pressable>
        );
      })}
      <Pressable
        onPress={onCreate}
        accessibilityRole="button"
        accessibilityLabel="New folder"
        style={({ pressed }) => [
          styles.folder,
          styles.newFolder,
          { borderColor: theme.colors.borderStrong, borderRadius: theme.radii.lg, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Icon name="folder-plus" size={20} color={theme.colors.primary} />
        <Text variant="labelLarge" color="primary">
          New folder
        </Text>
      </Pressable>
    </ScrollView>
  );
}

// ---- Section title, empty state, create button -------------------------------------------------

export function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <View style={styles.section}>
      <Text variant="headlineMedium">{title}</Text>
      {count !== undefined ? (
        <Text variant="labelLarge" color="textTertiary">
          {count}
        </Text>
      ) : null}
    </View>
  );
}

export function NotesEmptyState({ filtered, onCreate }: { filtered: boolean; onCreate: () => void }) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  return (
    <Animated.View entering={reduceMotion ? undefined : FadeInDown.springify().damping(16)} style={styles.empty}>
      <View style={[styles.emptyArt, { backgroundColor: theme.colors.primaryMuted }]}>
        <Icon name={filtered ? 'filter' : 'feather'} size={30} color={theme.colors.primary} />
      </View>
      <Text variant="headlineLarge" style={styles.center}>
        {filtered ? 'Nothing here yet' : 'Your ideas start here.'}
      </Text>
      <Text variant="bodyLarge" color="textSecondary" style={styles.center}>
        {filtered
          ? 'No notes match this view. Try another filter, or write one now.'
          : 'Capture a thought, plan a project, or write something worth remembering.'}
      </Text>
      <CartoonPress
        onPress={onCreate}
        radius={999}
        fill={theme.gradients.primary}
        haptic="medium"
        faceStyle={styles.emptyButton}
        accessibilityLabel="Create note"
      >
        <Icon name="plus" size={18} color="#FFFFFF" />
        <Text variant="titleMedium" style={styles.white}>
          Create note
        </Text>
      </CartoonPress>
    </Animated.View>
  );
}

/** The floating "+" — springs in, presses down like every ClayHabbit button. */
export function QuickNoteButton({ bottom, onPress }: { bottom: number; onPress: () => void }) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (!reduceMotion) scale.value = withDelay(250, withSpring(1, { damping: 11, stiffness: 180 }));
  }, [reduceMotion, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.fab, { bottom }, style]}>
      <CartoonPress
        onPress={onPress}
        radius={999}
        fill={theme.gradients.primary}
        haptic="medium"
        faceStyle={styles.fabFace}
        accessibilityLabel="New note"
        accessibilityHint="Choose a blank note, checklist, quick note, code note or template."
      >
        <Icon name="edit-3" size={20} color="#FFFFFF" />
        <Text variant="titleMedium" style={styles.white}>
          New note
        </Text>
      </CartoonPress>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    minHeight: 50,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
  },
  pills: {
    gap: 8,
    paddingRight: 20,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  hint: {
    paddingVertical: 4,
  },
  folders: {
    gap: 10,
    paddingRight: 20,
  },
  folder: {
    width: 128,
    padding: 12,
    gap: 6,
    borderWidth: 1,
  },
  newFolder: {
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  empty: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 36,
    paddingHorizontal: 12,
  },
  emptyArt: {
    width: 76,
    height: 76,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    minHeight: 50,
  },
  center: {
    textAlign: 'center',
  },
  white: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
  },
  fab: {
    position: 'absolute',
    right: 20,
  },
  fabFace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    minHeight: 54,
  },
});
