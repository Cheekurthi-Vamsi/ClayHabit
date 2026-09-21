import { useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Card, Icon, SwipeAction, Text } from '@/components/ui';
import { useAppTheme, type ColorToken } from '@/theme';
import type { Task } from '@/domain/entities/task';
import { formatTime12h, todayIso } from '@/utils/date';

import { useSeriesStreak } from '../streaks/hooks';
import { useArchiveTask, useDeleteTask } from './hooks';

interface TaskListItemProps {
  task: Task;
  onToggle: (task: Task) => void;
}

const priorityColor: Record<Task['priority'], ColorToken> = {
  low: 'textTertiary',
  medium: 'secondary',
  high: 'warning',
  urgent: 'error',
};

function AnimatedCheckbox({ checked }: { checked: boolean }) {
  const theme = useAppTheme();
  const progress = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(checked ? 1 : 0, theme.motion.springs.bouncy);
  }, [checked, progress, theme.motion.springs.bouncy]);

  const circleStyle = useAnimatedStyle(() => ({
    backgroundColor: checked ? theme.colors.primary : 'transparent',
    borderColor: checked ? theme.colors.primary : theme.colors.borderStrong,
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.6 + progress.value * 0.4 }],
  }));

  return (
    <Animated.View style={[styles.checkbox, { borderRadius: theme.radii.full }, circleStyle]}>
      <Animated.View style={checkStyle}>
        <Icon name="check" size={14} color={theme.colors.onPrimary} />
      </Animated.View>
    </Animated.View>
  );
}

export function TaskListItem({ task, onToggle }: TaskListItemProps) {
  const theme = useAppTheme();
  const router = useRouter();
  const archiveTask = useArchiveTask();
  const deleteTask = useDeleteTask();
  const { data: streak } = useSeriesStreak(task.seriesId, task.repeatRule);
  const time = formatTime12h(task.dueTime);

  const handleToggle = () => {
    if (task.isCompleted) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onToggle(task);
  };

  const rowOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(task.isCompleted ? 0.55 : 1, { duration: theme.motion.duration.fast }),
  }));

  return (
    <Swipeable
      containerStyle={styles.swipeContainer}
      renderRightActions={() => (
        <View style={styles.swipeActions}>
          <SwipeAction
            icon="archive"
            color="warning"
            label="Archive task"
            onPress={() => archiveTask.mutate({ id: task.id, isArchived: true })}
          />
          <SwipeAction
            icon="trash-2"
            color="error"
            label="Delete task"
            onPress={() => deleteTask.mutate(task.id)}
          />
        </View>
      )}
    >
      <Card style={styles.card} onPress={() => router.push(`/task/${task.id}`)} accessibilityLabel={task.title}>
        <View style={styles.row}>
          <Pressable
            onPress={handleToggle}
            accessibilityRole="checkbox"
            accessibilityLabel={task.title}
            accessibilityState={{ checked: task.isCompleted }}
            hitSlop={8}
          >
            <AnimatedCheckbox checked={task.isCompleted} />
          </Pressable>

          <Animated.View style={[styles.body, rowOpacity]}>
            <Text
              variant="titleMedium"
              style={task.isCompleted ? styles.strikethrough : undefined}
              numberOfLines={2}
            >
              {task.title}
            </Text>
            {(task.dueDate || time || (task.repeatRule && streak && streak.current > 0)) && (
              <Text variant="bodySmall" color="textSecondary">
                {task.dueDate === todayIso() ? 'Today' : task.dueDate}
                {time ? ` · ${time}` : ''}
                {task.repeatRule && streak && streak.current > 0 ? ` · 🔥 ${streak.current}d` : ''}
              </Text>
            )}
          </Animated.View>

          <View
            style={[
              styles.priorityDot,
              { backgroundColor: theme.colors[priorityColor[task.priority]] },
            ]}
          />
        </View>
      </Card>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    marginBottom: 10,
  },
  card: {
    marginBottom: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    marginLeft: 8,
  },
});
