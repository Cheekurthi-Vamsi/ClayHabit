import { useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Card, Icon, Text } from '@/components/ui';
import { useAppTheme, type ColorToken } from '@/theme';
import type { Task } from '@/domain/entities/task';
import { formatTime12h } from '@/utils/date';

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
    <Card style={styles.card}>
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
          {(task.dueDate || time) && (
            <Text variant="bodySmall" color="textSecondary">
              {task.dueDate === new Date().toISOString().slice(0, 10) ? 'Today' : task.dueDate}
              {time ? ` · ${time}` : ''}
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
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
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
});
