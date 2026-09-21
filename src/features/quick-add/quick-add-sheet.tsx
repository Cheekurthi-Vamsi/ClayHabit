import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BottomSheet, Icon, type IconName, Text } from '@/components/ui';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useAppTheme, type GradientStops, type ThemeGradients } from '@/theme';

import { useCreateNote } from '../notes/hooks';

interface Tile {
  key: string;
  label: string;
  hint: string;
  icon: IconName;
  gradient: keyof ThemeGradients;
}

const TILES: Tile[] = [
  { key: 'task', label: 'Task', hint: 'To-do with a due date', icon: 'check-circle', gradient: 'primary' },
  { key: 'habit', label: 'Habit', hint: 'Something you repeat', icon: 'repeat', gradient: 'pinkPurple' },
  { key: 'note', label: 'Note', hint: 'Capture a thought', icon: 'edit-3', gradient: 'lavenderPink' },
  { key: 'reminder', label: 'Reminder', hint: 'Task with an alert', icon: 'bell', gradient: 'secondary' },
  { key: 'goal', label: 'Goal', hint: 'A bigger outcome', icon: 'target', gradient: 'mintCyan' },
  { key: 'focus', label: 'Focus', hint: 'Start 25 minutes', icon: 'zap', gradient: 'aurora' },
];

function TileButton({
  tile,
  gradient,
  index,
  onPress,
}: {
  tile: Tile;
  gradient: GradientStops;
  index: number;
  onPress: () => void;
}) {
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
        accessibilityLabel={`New ${tile.label}`}
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
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconBadge}>
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

export function QuickAddSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useAppTheme();
  const router = useRouter();
  const createNote = useCreateNote();

  const open = (key: string) => {
    switch (key) {
      case 'task':
        router.push('/modal/new-task');
        break;
      case 'habit':
        router.push('/modal/new-habit');
        break;
      case 'reminder':
        router.push({ pathname: '/modal/new-task', params: { reminder: '1' } });
        break;
      case 'goal':
        router.push('/modal/new-goal');
        break;
      case 'focus':
        router.push({ pathname: '/focus', params: { autostart: '25' } });
        break;
      case 'note':
        createNote.mutate(undefined, { onSuccess: (note) => router.push(`/note/${note.id}`) });
        break;
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Create something" subtitle="What do you want to add?">
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
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
});
