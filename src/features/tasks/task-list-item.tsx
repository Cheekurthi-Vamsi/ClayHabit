import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Swipeable, {
  SwipeDirection,
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ActionSheet, Card, Icon, SwipeAction, Text, type SheetAction } from '@/components/ui';
import type { Task } from '@/domain/entities/task';
import { useAppTheme, type ColorToken, type GradientStops } from '@/theme';
import { formatTime12h, todayIso } from '@/utils/date';

import { useSeriesStreak } from '../streaks/hooks';
import { useArchiveTask, useDeleteTask, useSnoozeTask } from './hooks';

export const PRIORITY_LABEL: Record<Task['priority'], string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const PRIORITY_COLOR: Record<Task['priority'], ColorToken> = {
  low: 'textTertiary',
  medium: 'accentBlue',
  high: 'warning',
  urgent: 'error',
};

interface TaskListItemProps {
  task: Task;
  onToggle: (task: Task) => void;
  /** `card`: standalone card. `grouped`: bare row for stacking inside one shared card. */
  variant?: 'card' | 'grouped';
}

function AnimatedCheckbox({ checked }: { checked: boolean }) {
  const theme = useAppTheme();
  const progress = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(checked ? 1 : 0, theme.motion.springs.bouncy);
  }, [checked, progress, theme.motion.springs.bouncy]);

  const fillStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.4 + progress.value * 0.6 }],
  }));

  return (
    <View style={[styles.checkbox, { borderColor: checked ? 'transparent' : theme.colors.borderStrong }]}>
      <Animated.View style={[StyleSheet.absoluteFill, fillStyle]}>
        <LinearGradient
          colors={theme.gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.checkboxFill}
        >
          <Icon name="check" size={14} color="#FFFFFF" />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

function CompletePanel({ completed }: { completed: boolean }) {
  const theme = useAppTheme();
  const colors: GradientStops = completed
    ? [theme.colors.textTertiary, theme.colors.textSecondary]
    : theme.gradients.mintCyan;
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.completePanel, { borderRadius: theme.radii.lg }]}
    >
      <Icon name={completed ? 'rotate-ccw' : 'check'} size={20} color="#FFFFFF" />
      <Text variant="labelLarge" style={styles.white}>
        {completed ? 'Undo' : 'Done'}
      </Text>
    </LinearGradient>
  );
}

export function TaskListItem({ task, onToggle, variant = 'card' }: TaskListItemProps) {
  const theme = useAppTheme();
  const router = useRouter();
  const archiveTask = useArchiveTask();
  const deleteTask = useDeleteTask();
  const snoozeTask = useSnoozeTask();
  const { data: streak } = useSeriesStreak(task.seriesId, task.repeatRule);
  const swipeRef = useRef<SwipeableMethods>(null);
  const [actionsOpen, setActionsOpen] = useState(false);

  const time = formatTime12h(task.dueTime);
  const today = todayIso();
  const openDetail = () => router.push(`/task/${task.id}`);

  const toggle = () => {
    if (task.isCompleted) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onToggle(task);
  };

  const confirmDelete = () =>
    Alert.alert('Delete task?', `"${task.title}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel', onPress: () => swipeRef.current?.close() },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTask.mutate(task.id) },
    ]);

  const quickActions: SheetAction[] = [
    { label: task.isCompleted ? 'Mark as not done' : 'Mark as done', icon: task.isCompleted ? 'rotate-ccw' : 'check-circle', onPress: toggle },
    { label: 'Snooze to tomorrow', icon: 'clock', onPress: () => snoozeTask.mutate(task.id) },
    { label: 'Edit', icon: 'edit-2', onPress: openDetail },
    { label: 'Archive', icon: 'archive', onPress: () => archiveTask.mutate({ id: task.id, isArchived: true }) },
    { label: 'Delete', icon: 'trash-2', destructive: true, onPress: confirmDelete },
  ];

  const rowOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(task.isCompleted ? 0.5 : 1, { duration: theme.motion.duration.base }),
  }));

  const dueLabel = task.dueDate === today ? 'Today' : task.dueDate;
  const meta = [
    task.isCompleted ? 'Done' : PRIORITY_LABEL[task.priority],
    time ?? (task.dueDate && task.dueDate !== today ? dueLabel : null),
    task.repeatRule && streak && streak.current > 0 ? `🔥 ${streak.current}d` : null,
  ].filter(Boolean);

  const row = (
    <View style={styles.row}>
      <Pressable
        onPress={toggle}
        accessibilityRole="checkbox"
        accessibilityLabel={`Complete ${task.title}`}
        accessibilityState={{ checked: task.isCompleted }}
        hitSlop={10}
      >
        <AnimatedCheckbox checked={task.isCompleted} />
      </Pressable>

      <Animated.View style={[styles.body, rowOpacity]}>
        <Text variant="titleMedium" style={task.isCompleted ? styles.strikethrough : undefined} numberOfLines={2}>
          {task.title}
        </Text>
        <View style={styles.metaRow}>
          {!task.isCompleted ? (
            <View style={[styles.priorityDot, { backgroundColor: theme.colors[PRIORITY_COLOR[task.priority]] }]} />
          ) : null}
          <Text variant="bodySmall" color="textSecondary" numberOfLines={1}>
            {meta.join(' · ')}
          </Text>
        </View>
      </Animated.View>
    </View>
  );

  const pressHandlers = {
    onPress: openDetail,
    onLongPress: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setActionsOpen(true);
    },
    delayLongPress: 350,
  };

  return (
    <>
      <Swipeable
        ref={swipeRef}
        friction={1.6}
        leftThreshold={70}
        rightThreshold={50}
        overshootLeft={false}
        containerStyle={variant === 'card' ? styles.cardSpacing : undefined}
        onSwipeableOpen={(direction) => {
          // RIGHT = the row slid right, i.e. the left "Done" panel is fully revealed.
          if (direction === SwipeDirection.RIGHT) {
            toggle();
            swipeRef.current?.close();
          }
        }}
        renderLeftActions={() => <CompletePanel completed={task.isCompleted} />}
        renderRightActions={() => (
          <View style={styles.swipeActions}>
            <SwipeAction
              icon="clock"
              color="warning"
              label="Snooze to tomorrow"
              onPress={() => {
                swipeRef.current?.close();
                snoozeTask.mutate(task.id);
              }}
            />
            <SwipeAction
              icon="edit-2"
              color="primary"
              label="Edit task"
              onPress={() => {
                swipeRef.current?.close();
                openDetail();
              }}
            />
            <SwipeAction icon="trash-2" color="error" label="Delete task" onPress={confirmDelete} />
          </View>
        )}
      >
        {variant === 'card' ? (
          <Card {...pressHandlers} accessibilityLabel={task.title}>
            {row}
          </Card>
        ) : (
          <Pressable
            {...pressHandlers}
            accessibilityRole="button"
            accessibilityLabel={task.title}
            accessibilityHint="Opens task details. Long press for quick actions."
            style={({ pressed }) => [
              styles.grouped,
              { backgroundColor: pressed ? theme.colors.surfacePressed : theme.colors.surface },
            ]}
          >
            {row}
          </Pressable>
        )}
      </Swipeable>

      <ActionSheet
        visible={actionsOpen}
        onClose={() => setActionsOpen(false)}
        title={task.title}
        subtitle={meta.join(' · ')}
        actions={quickActions}
      />
    </>
  );
}

const styles = StyleSheet.create({
  cardSpacing: {
    marginBottom: 10,
  },
  grouped: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    overflow: 'hidden',
  },
  checkboxFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  priorityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  completePanel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    marginRight: 8,
  },
  white: {
    color: '#FFFFFF',
  },
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
    marginLeft: 8,
  },
});
