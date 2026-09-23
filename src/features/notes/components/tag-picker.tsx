import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import type { Tag } from '@/domain/entities/tag';
import { useAppTheme } from '@/theme';

import { useNoteTags } from '../hooks';

interface TagPickerProps {
  tags: Tag[];
  onChange: (names: string[]) => void;
}

/** A single tag: #name, tinted by its colour, with an optional remove button. */
export function TagChip({ tag, onRemove, onPress }: { tag: Tag; onRemove?: () => void; onPress?: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`Tag ${tag.name}`}
      style={[styles.chip, { backgroundColor: `${tag.color}1A`, borderColor: `${tag.color}40` }]}
    >
      <Text variant="labelMedium" style={{ color: tag.color }}>
        #{tag.name}
      </Text>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove tag ${tag.name}`}>
          <Icon name="x" size={12} color={theme.colors.textSecondary} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

/**
 * Tags on a note: the current ones (removable), a field to add one, and
 * suggestions from tags already used elsewhere so they stay reusable.
 */
export function TagPicker({ tags, onChange }: TagPickerProps) {
  const theme = useAppTheme();
  const { data: known } = useNoteTags();
  const [draft, setDraft] = useState('');

  const names = tags.map((tag) => tag.name);
  const suggestions = useMemo(() => {
    const query = draft.trim().replace(/^#/, '').toLowerCase();
    return (known ?? [])
      .filter((tag) => !names.includes(tag.name))
      .filter((tag) => !query || tag.name.toLowerCase().includes(query))
      .slice(0, 6);
  }, [draft, known, names]);

  const add = (name: string) => {
    const clean = name.trim().replace(/^#/, '');
    if (!clean || names.includes(clean)) return;
    onChange([...names, clean]);
    setDraft('');
  };

  return (
    <View style={styles.stack}>
      <View style={styles.row}>
        {tags.map((tag) => (
          <TagChip key={tag.id} tag={tag} onRemove={() => onChange(names.filter((name) => name !== tag.name))} />
        ))}
        <View style={[styles.input, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.full }]}>
          <Text variant="labelMedium" color="textTertiary">
            #
          </Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="add tag"
            placeholderTextColor={theme.colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => add(draft)}
            accessibilityLabel="Add a tag"
            style={[styles.inputText, { color: theme.colors.textPrimary }]}
          />
        </View>
      </View>
      {suggestions.length > 0 ? (
        <View style={styles.row}>
          {suggestions.map((tag) => (
            <TagChip key={tag.id} tag={tag} onPress={() => add(tag.name)} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 6,
    minWidth: 110,
  },
  inputText: {
    fontSize: 13,
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 80,
  },
});
