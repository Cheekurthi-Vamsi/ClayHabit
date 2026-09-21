import { Fragment, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryGlyph } from '@/components/finance/category-glyph';
import { FinanceScreenHeader } from '@/components/finance/screen-header';
import { Button, Card, Icon, IconButton, SegmentedControl, Skeleton, Text } from '@/components/ui';
import type { CategoryKind } from '@/domain/finance/entities';
import { useAppTheme } from '@/theme';

import { useCategories, useCategoryMutations } from '../hooks';

const KINDS = [
  { value: 'expense', label: 'Spending' },
  { value: 'income', label: 'Income' },
] as const;

/** Rename, re-icon, recolour, reorder and add categories. */
export function CategoriesScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState<CategoryKind>('expense');
  const { data: categories, isLoading } = useCategories(kind);
  const { move } = useCategoryMutations();
  const list = categories ?? [];

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <FinanceScreenHeader title="Categories" subtitle="How your spending and income are grouped." />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <SegmentedControl options={KINDS} value={kind} onChange={setKind} accessibilityLabel="Category type" />

        {isLoading ? (
          <Skeleton height={300} radius={theme.radii.lg} />
        ) : (
          <Card style={styles.list}>
            {list.map((category, index) => (
              <Fragment key={category.id}>
                {index > 0 ? <View style={[styles.separator, { backgroundColor: theme.colors.border }]} /> : null}
                <View style={styles.row}>
                  <Pressable
                    onPress={() => router.push({ pathname: '/modal/category', params: { id: category.id } })}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${category.name}`}
                    style={styles.main}
                  >
                    <CategoryGlyph emoji={category.emoji} color={category.color} size={36} />
                    <Text variant="titleMedium" numberOfLines={1} style={styles.flex}>
                      {category.name}
                    </Text>
                    <Icon name="chevron-right" size={16} color={theme.colors.textTertiary} />
                  </Pressable>
                  <IconButton
                    name="chevron-up"
                    variant="ghost"
                    size={34}
                    disabled={index === 0 || move.isPending}
                    accessibilityLabel={`Move ${category.name} up`}
                    onPress={() => move.mutate({ id: category.id, direction: 'up' })}
                  />
                  <IconButton
                    name="chevron-down"
                    variant="ghost"
                    size={34}
                    disabled={index === list.length - 1 || move.isPending}
                    accessibilityLabel={`Move ${category.name} down`}
                    onPress={() => move.mutate({ id: category.id, direction: 'down' })}
                  />
                </View>
              </Fragment>
            ))}
          </Card>
        )}

        <Button
          label={kind === 'expense' ? 'Add a spending category' : 'Add an income category'}
          icon="plus"
          variant="outline"
          onPress={() => router.push({ pathname: '/modal/category', params: { kind } })}
        />
        <Text variant="caption" color="textTertiary" style={styles.center}>
          Removing a category keeps its past transactions exactly as they were.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    gap: 16,
  },
  list: {
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48,
  },
  center: {
    textAlign: 'center',
  },
});
