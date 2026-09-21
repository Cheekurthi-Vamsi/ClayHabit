import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Alert, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Chip, Icon, IconButton, Skeleton, Text } from '@/components/ui';
import type { RepeatRule, TaskPriority, TaskWithDetails } from '@/domain/entities/task';
import { useAppTheme } from '@/theme';
import { formatTime12h, todayIso } from '@/utils/date';

import { useGoals } from '../goals/hooks';
import { useContributionGrid, useSeriesStreak } from '../streaks/hooks';
import { StreakGrid } from '../streaks/streak-grid';
import {
  useAddSubtask,
  useArchiveTask,
  useCreateProject,
  useDeleteTask,
  useProjects,
  useRemoveSubtask,
  useSetReminder,
  useSetTaskTags,
  useTaskDetails,
  useToggleSubtask,
  useToggleTask,
  useUpdateTask,
} from './hooks';

const priorities: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const repeatOptions: { value: RepeatRule | null; label: string }[] = [
  { value: null, label: 'None' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text variant="labelLarge" color="textSecondary">
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

function StreakSection({ seriesId, rule }: { seriesId: string; rule: RepeatRule }) {
  const theme = useAppTheme();
  const { data: streak } = useSeriesStreak(seriesId, rule);
  const { data: grid } = useContributionGrid(seriesId);

  return (
    <Section title="Streak">
      <Card>
        <View style={styles.streakStatsRow}>
          <View>
            <Text variant="headlineLarge">{streak?.current ?? 0}</Text>
            <Text variant="bodySmall" color="textSecondary">
              Current 🔥
            </Text>
          </View>
          <View>
            <Text variant="headlineLarge">{streak?.best ?? 0}</Text>
            <Text variant="bodySmall" color="textSecondary">
              Best
            </Text>
          </View>
          <View>
            <Text variant="headlineLarge">{streak?.totalCompletions ?? 0}</Text>
            <Text variant="bodySmall" color="textSecondary">
              Completed
            </Text>
          </View>
        </View>
        {grid && (
          <View style={{ marginTop: theme.spacing.md }}>
            <StreakGrid columns={grid} />
          </View>
        )}
      </Card>
    </Section>
  );
}

function timeStringToDate(time: string): Date {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

function dateToTimeString(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function ReminderSection({ task }: { task: TaskWithDetails }) {
  const setReminder = useSetReminder();
  const [showPicker, setShowPicker] = useState(false);

  if (!task.dueDate) {
    return (
      <Section title="Reminder">
        <Text variant="bodySmall" color="textTertiary">
          Set a due date to enable a reminder.
        </Text>
      </Section>
    );
  }

  const currentTime = task.reminderTime ?? '09:00';

  const commit = (time: string) => {
    setReminder.mutate(
      { task, enabled: true, time },
      {
        onError: () =>
          Alert.alert('Notifications disabled', 'Enable notifications in Settings to use reminders.'),
      },
    );
  };

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        mode: 'time',
        value: timeStringToDate(currentTime),
        onChange: (event, date) => {
          if (event.type === 'set' && date) commit(dateToTimeString(date));
        },
      });
      return;
    }
    setShowPicker(true);
  };

  return (
    <Section title="Reminder">
      <View style={styles.chipRow}>
        <Chip
          label="Off"
          selected={!task.reminderEnabled}
          onPress={() => setReminder.mutate({ task, enabled: false, time: null })}
        />
        <Chip
          label={task.reminderEnabled ? `On · ${formatTime12h(currentTime)}` : 'On'}
          selected={task.reminderEnabled}
          icon="bell"
          onPress={openPicker}
        />
      </View>

      {Platform.OS === 'ios' && showPicker && (
        <View style={{ gap: 8 }}>
          <DateTimePicker
            mode="time"
            display="spinner"
            value={timeStringToDate(currentTime)}
            onChange={(_event, date) => {
              if (date) commit(dateToTimeString(date));
            }}
          />
          <Button label="Done" variant="outline" onPress={() => setShowPicker(false)} />
        </View>
      )}
    </Section>
  );
}

export function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const { data: task, isLoading } = useTaskDetails(id);

  if (isLoading || !task) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, padding: 20 }]}>
        <Skeleton height={32} radius={8} />
        <View style={{ height: 16 }} />
        <Skeleton height={120} radius={theme.radii.lg} />
      </View>
    );
  }

  return <TaskDetailBody key={task.id} task={task} />;
}

function TaskDetailBody({ task }: { task: TaskWithDetails }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: projects } = useProjects();
  const { data: goals } = useGoals();
  const updateTask = useUpdateTask();
  const toggleTask = useToggleTask();
  const archiveTask = useArchiveTask();
  const deleteTask = useDeleteTask();
  const setTags = useSetTaskTags();
  const createProject = useCreateProject();
  const addSubtask = useAddSubtask();
  const toggleSubtask = useToggleSubtask(task.id);
  const removeSubtask = useRemoveSubtask(task.id);

  // Seeded once from the loaded task; TaskDetailScreen remounts this (via
  // `key={task.id}`) whenever the underlying task identity changes.
  const [title, setTitle] = useState(task.title);
  const [newSubtask, setNewSubtask] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [addingProject, setAddingProject] = useState(false);

  const commitTitle = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) {
      updateTask.mutate({ id: task.id, input: { title: trimmed } });
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete task?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteTask.mutate(task.id, { onSuccess: () => router.back() });
        },
      },
    ]);
  };

  const dueOption: 'today' | 'someday' = task.dueDate === todayIso() ? 'today' : 'someday';

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.huge },
      ]}
    >
      <View style={styles.headerRow}>
        <IconButton name="arrow-left" variant="ghost" accessibilityLabel="Back" onPress={() => router.back()} />
        <IconButton
          name={task.isCompleted ? 'rotate-ccw' : 'check'}
          variant={task.isCompleted ? 'muted' : 'filled'}
          accessibilityLabel={task.isCompleted ? 'Mark incomplete' : 'Mark complete'}
          onPress={() => toggleTask.mutate({ id: task.id, isCompleted: !task.isCompleted })}
        />
      </View>

      <TextInput
        value={title}
        onChangeText={setTitle}
        onBlur={commitTitle}
        multiline
        style={[theme.typography.displayMedium, { color: theme.colors.textPrimary }]}
        placeholder="Task title"
        placeholderTextColor={theme.colors.textTertiary}
      />

      <Section title="Priority">
        <View style={styles.chipRow}>
          {priorities.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              selected={task.priority === item.value}
              onPress={() => updateTask.mutate({ id: task.id, input: { priority: item.value } })}
            />
          ))}
        </View>
      </Section>

      <Section title="Schedule">
        <View style={styles.chipRow}>
          <Chip
            label="Today"
            selected={dueOption === 'today'}
            onPress={() => updateTask.mutate({ id: task.id, input: { dueDate: todayIso() } })}
          />
          <Chip
            label="Someday"
            selected={dueOption === 'someday'}
            onPress={() => updateTask.mutate({ id: task.id, input: { dueDate: null } })}
          />
        </View>
      </Section>

      <ReminderSection task={task} />

      <Section title="Repeat">
        <View style={styles.chipRow}>
          {repeatOptions.map((option) => (
            <Chip
              key={option.label}
              label={option.label}
              selected={task.repeatRule === option.value}
              onPress={() => updateTask.mutate({ id: task.id, input: { repeatRule: option.value } })}
            />
          ))}
        </View>
      </Section>

      {task.repeatRule && <StreakSection seriesId={task.seriesId} rule={task.repeatRule} />}

      <Section title="Project">
        <View style={styles.chipRow}>
          <Chip
            label="None"
            selected={!task.projectId}
            onPress={() => updateTask.mutate({ id: task.id, input: { projectId: null } })}
          />
          {(projects ?? []).map((project) => (
            <Chip
              key={project.id}
              label={project.name}
              selected={task.projectId === project.id}
              onPress={() => updateTask.mutate({ id: task.id, input: { projectId: project.id } })}
            />
          ))}
          {addingProject ? (
            <TextInput
              value={newProjectName}
              onChangeText={setNewProjectName}
              placeholder="Project name"
              placeholderTextColor={theme.colors.textTertiary}
              autoFocus
              onSubmitEditing={() => {
                if (!newProjectName.trim()) return;
                createProject.mutate(
                  { name: newProjectName, color: theme.colors.primary },
                  {
                    onSuccess: (project) => {
                      updateTask.mutate({ id: task.id, input: { projectId: project.id } });
                      setNewProjectName('');
                      setAddingProject(false);
                    },
                  },
                );
              }}
              style={[
                styles.inlineInput,
                {
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.surfaceMuted,
                  borderRadius: theme.radii.full,
                },
              ]}
            />
          ) : (
            <Chip label="+ New" onPress={() => setAddingProject(true)} />
          )}
        </View>
      </Section>

      <Section title="Goal">
        <View style={styles.chipRow}>
          <Chip
            label="None"
            selected={!task.goalId}
            onPress={() => updateTask.mutate({ id: task.id, input: { goalId: null } })}
          />
          {(goals ?? []).map((goal) => (
            <Chip
              key={goal.id}
              label={goal.title}
              selected={task.goalId === goal.id}
              onPress={() => updateTask.mutate({ id: task.id, input: { goalId: goal.id } })}
            />
          ))}
        </View>
      </Section>

      <Section title="Tags">
        <View style={styles.chipRow}>
          {task.tags.map((tag) => (
            <Chip key={tag.id} label={tag.name} selected />
          ))}
          <TextInput
            value={newTag}
            onChangeText={setNewTag}
            placeholder="Add tag"
            placeholderTextColor={theme.colors.textTertiary}
            onSubmitEditing={() => {
              if (!newTag.trim()) return;
              const names = [...task.tags.map((t) => t.name), newTag.trim()];
              setTags.mutate({ taskId: task.id, tagNames: names });
              setNewTag('');
            }}
            style={[
              styles.inlineInput,
              {
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.surfaceMuted,
                borderRadius: theme.radii.full,
              },
            ]}
          />
        </View>
      </Section>

      <Section title="Subtasks">
        <Card>
          <View style={{ gap: 10 }}>
            {task.subtasks.map((subtask) => (
              <View key={subtask.id} style={styles.subtaskRow}>
                <IconButton
                  name={subtask.isCompleted ? 'check-square' : 'square'}
                  variant="ghost"
                  size={28}
                  accessibilityLabel={subtask.title}
                  onPress={() =>
                    toggleSubtask.mutate({ id: subtask.id, isCompleted: !subtask.isCompleted })
                  }
                />
                <Text
                  variant="bodyLarge"
                  style={[styles.subtaskText, subtask.isCompleted ? styles.strikethrough : undefined]}
                >
                  {subtask.title}
                </Text>
                <IconButton
                  name="x"
                  variant="ghost"
                  size={28}
                  accessibilityLabel="Remove subtask"
                  onPress={() => removeSubtask.mutate(subtask.id)}
                />
              </View>
            ))}

            <View style={styles.subtaskRow}>
              <Icon name="plus" size={18} color={theme.colors.textTertiary} />
              <TextInput
                value={newSubtask}
                onChangeText={setNewSubtask}
                placeholder="Add subtask"
                placeholderTextColor={theme.colors.textTertiary}
                onSubmitEditing={() => {
                  if (!newSubtask.trim()) return;
                  addSubtask.mutate({ taskId: task.id, title: newSubtask });
                  setNewSubtask('');
                }}
                style={[styles.subtaskText, { color: theme.colors.textPrimary }]}
              />
            </View>
          </View>
        </Card>
      </Section>

      <View style={styles.dangerRow}>
        <Button
          label={task.isArchived ? 'Unarchive' : 'Archive'}
          variant="outline"
          icon="archive"
          onPress={() => archiveTask.mutate({ id: task.id, isArchived: !task.isArchived })}
        />
        <Button label="Delete" variant="ghost" icon="trash-2" onPress={handleDelete} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    gap: 22,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  inlineInput: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    fontSize: 13,
    minWidth: 100,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subtaskText: {
    flex: 1,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  dangerRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: 12,
  },
  streakStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
