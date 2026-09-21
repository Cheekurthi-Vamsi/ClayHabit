import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BottomSheet, Icon, Text, type IconName } from '@/components/ui';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useAppTheme, type GradientStops, type ThemeGradients } from '@/theme';

import { useSavingsPlans } from './hooks';

interface Tile {
  key: 'expense' | 'income' | 'save' | 'budget' | 'goal';
  label: string;
  hint: string;
  icon: IconName;
  gradient: keyof ThemeGradients;
}

const TILES: Tile[] = [
  { key: 'expense', label: 'Expense', hint: 'Money you spent', icon: 'arrow-up-right', gradient: 'finance' },
  { key: 'income', label: 'Income', hint: 'Money you received', icon: 'arrow-down-left', gradient: 'mintCyan' },
  { key: 'save', label: 'Savings', hint: 'Set money aside', icon: 'shield', gradient: 'secondary' },
  { key: 'budget', label: 'Budget', hint: 'A monthly limit', icon: 'sliders', gradient: 'primary' },
  { key: 'goal', label: 'Goal', hint: 'Something to save for', icon: 'target', gradient: 'lavenderPink' },
];

function TileButton({ tile, gradient, index, onPress }: { tile: Tile; gradient: GradientStops; index: number; onPress: () => void }) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.delay(60 + index * 40).springify().damping(18)}
      style={styles.tileWrap}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Add ${tile.label}`}
        accessibilityHint={tile.hint}
        style={({ pressed }) => [
          styles.tile,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.lg,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          },
        ]}
      >
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge}>
          <Icon name={tile.icon} size={20} color="#FFFFFF" />
        </LinearGradient>
        <Text variant="titleMedium">{tile.label}</Text>
        <Text variant="caption" color="textTertiary" numberOfLines={1}>
          {tile.hint}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/** The finance "+": everything you can add, one tap each. */
export function FinanceQuickAddSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useAppTheme();
  const router = useRouter();
  const { data: plans } = useSavingsPlans();

  const open = (key: Tile['key']) => {
    switch (key) {
      case 'expense':
        router.push('/modal/transaction');
        break;
      case 'income':
        router.push({ pathname: '/modal/transaction', params: { type: 'income' } });
        break;
      case 'save':
        // With no plan yet, saving starts by creating one.
        if ((plans ?? []).length > 0) router.push('/modal/savings-entry');
        else router.push('/modal/savings-plan');
        break;
      case 'budget':
        router.push('/fm/budgets');
        break;
      case 'goal':
        router.push('/modal/savings-plan');
        break;
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Add" subtitle="What would you like to record?">
      {(close) => (
        <View style={styles.grid}>
          {TILES.map((tile, index) => (
            <TileButton
              key={tile.key}
              tile={tile}
              index={index}
              gradient={theme.gradients[tile.gradient]}
              onPress={() => close(() => open(tile.key))}
            />
          ))}
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tileWrap: {
    width: '48%',
    flexGrow: 1,
  },
  tile: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 6,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
});
