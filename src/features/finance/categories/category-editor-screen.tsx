import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text as RNText, TextInput, View } from 'react-native';

import { Button, Icon, Skeleton, Text } from '@/components/ui';
import type { CategoryColor, CategoryKind, FinCategory } from '@/domain/finance/entities';
import { HABIT_COLORS, habitPalette, useAppTheme } from '@/theme';

import { useCategory, useCategoryMutations } from '../hooks';

const EMOJIS: Record<CategoryKind, readonly string[]> = {
  expense: ['🍔', '☕', '🛒', '🏠', '🚕', '⛽', '💡', '📱', '🏥', '💊', '🎓', '💻', '🎮', '🎬', '✈️', '👕', '💇', '🐶', '👶', '🎁', '🏋️', '📚', '🧾', '📦'],
  income: ['💼', '🧑‍💻', '🏪', '📈', '💵', '🎁', '🏠', '🪙', '💳', '🏦', '🤝', '⭐'],
};

function Editor({ existing, kind }: { existing?: FinCategory; kind: CategoryKind }) {
  const theme = useAppTheme();
  const router = useRouter();
  const { create, update, archive } = useCategoryMutations();
  const [name, setName] = useState(existing?.name ?? '');
  const [emoji, setEmoji] = useState(existing?.emoji ?? EMOJIS[kind][0]);
  const [color, setColor] = useState<CategoryColor>(existing?.color ?? 'purple');
  const [error, setError] = useState<string | null>(null);

  const done = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };
  const failed = (cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause));

  const save = () => {
    const input = { name, emoji, color };
    if (existing) update.mutate({ id: existing.id, input }, { onSuccess: done, onError: failed });
    else create.mutate({ kind, input }, { onSuccess: done, onError: failed });
  };

  const confirmArchive = () => {
    if (!existing) return;
    Alert.alert(
      `Remove "${existing.name}"?`,
      'It won’t be offered for new transactions. Past transactions keep it, so your history stays accurate.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => archive.mutate(existing.id, { onSuccess: done, onError: failed }) },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: existing ? 'Edit category' : kind === 'expense' ? 'New spending category' : 'New income category' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.nameRow}>
          <View style={[styles.tile, { backgroundColor: `${habitPalette[color].base}1F`, borderRadius: theme.radii.md }]}>
            <RNText style={styles.emoji}>{emoji}</RNText>
          </View>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Category name"
            placeholderTextColor={theme.colors.textTertiary}
            maxLength={30}
            autoFocus={!existing}
            accessibilityLabel="Category name"
            style={[
              styles.input,
              theme.typography.bodyLarge,
              { color: theme.colors.textPrimary, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md },
            ]}
          />
        </View>

        <View style={styles.field}>
          <Text variant="labelMedium" color="textSecondary">
            ICON
          </Text>
          <View style={styles.wrap}>
            {EMOJIS[kind].map((option) => (
              <Pressable
                key={option}
                onPress={() => setEmoji(option)}
                accessibilityRole="radio"
                accessibilityState={{ selected: option === emoji }}
                accessibilityLabel={`Icon ${option}`}
                style={[
                  styles.emojiOption,
                  {
                    borderRadius: theme.radii.sm,
                    backgroundColor: option === emoji ? `${habitPalette[color].base}24` : theme.colors.surfaceMuted,
                  },
                ]}
              >
                <RNText style={styles.emojiSmall}>{option}</RNText>
              </Pressable>
            ))}
            <TextInput
              value={EMOJIS[kind].includes(emoji) ? '' : emoji}
              onChangeText={(text) => {
                const trimmed = text.trim();
                if (trimmed) setEmoji(trimmed);
              }}
              placeholder="🙂"
              maxLength={8}
              accessibilityLabel="Custom emoji"
              style={[styles.emojiOption, styles.customEmoji, { borderRadius: theme.radii.sm, backgroundColor: theme.colors.surfaceMuted }]}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text variant="labelMedium" color="textSecondary">
            COLOR
          </Text>
          <View style={styles.wrap}>
            {HABIT_COLORS.map((key) => (
              <Pressable
                key={key}
                onPress={() => setColor(key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: key === color }}
                accessibilityLabel={`${key} color`}
                style={[styles.swatchRing, { borderColor: key === color ? habitPalette[key].base : 'transparent' }]}
              >
                <LinearGradient colors={habitPalette[key].gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.swatch}>
                  {key === color ? <Icon name="check" size={14} color="#FFFFFF" /> : null}
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </View>

        {error ? (
          <Text variant="bodySmall" color="error" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <Button
          label={existing ? 'Save changes' : 'Add category'}
          icon="check"
          fullWidth
          gradient={theme.gradients.finance}
          disabled={!name.trim()}
          loading={create.isPending || update.isPending}
          onPress={save}
        />
        {existing ? <Button label="Remove category" icon="archive" variant="ghost" onPress={confirmArchive} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Edit (`?id=`) or add (`?kind=expense|income`) a category. */
export function CategoryEditorScreen() {
  const theme = useAppTheme();
  const { id, kind } = useLocalSearchParams<{ id?: string; kind?: string }>();
  const { data: existing, isLoading } = useCategory(id);

  if (id && isLoading) {
    return (
      <View style={[styles.screen, styles.content, { backgroundColor: theme.colors.background }]}>
        <Skeleton height={60} radius={theme.radii.md} />
      </View>
    );
  }
  const resolvedKind: CategoryKind = existing?.kind ?? (kind === 'income' ? 'income' : 'expense');
  return <Editor key={existing?.id ?? 'new'} existing={existing ?? undefined} kind={resolvedKind} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tile: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 26,
    lineHeight: 32,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  field: {
    gap: 8,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiOption: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiSmall: {
    fontSize: 20,
    lineHeight: 26,
  },
  customEmoji: {
    fontSize: 20,
    textAlign: 'center',
    padding: 0,
  },
  swatchRing: {
    padding: 3,
    borderRadius: 22,
    borderWidth: 2,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
