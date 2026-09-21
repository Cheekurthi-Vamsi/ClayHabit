import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Chip, Text } from '@/components/ui';
import { useAppTheme } from '@/theme';
import type { TaskPriority } from '@/domain/entities/task';
import { todayIso } from '@/utils/date';

import { useCreateTask } from './hooks';

const priorities: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function NewTaskForm() {
  const theme = useAppTheme();
  const router = useRouter();
  const createTask = useCreateTask();

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueToday, setDueToday] = useState(true);

  const canSubmit = title.trim().length > 0 && !createTask.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    createTask.mutate(
      {
        title,
        priority,
        dueDate: dueToday ? todayIso() : null,
      },
      {
        onSuccess: () => router.back(),
      },
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={{ gap: theme.spacing.xl }}>
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="labelLarge" color="textSecondary">
            TITLE
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What do you need to do?"
            placeholderTextColor={theme.colors.textTertiary}
            autoFocus
            style={[
              styles.input,
              {
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.surfaceMuted,
                borderRadius: theme.radii.md,
              },
            ]}
          />
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="labelLarge" color="textSecondary">
            PRIORITY
          </Text>
          <View style={styles.chipRow}>
            {priorities.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                selected={priority === item.value}
                onPress={() => setPriority(item.value)}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="labelLarge" color="textSecondary">
            SCHEDULE
          </Text>
          <View style={styles.chipRow}>
            <Chip label="Today" selected={dueToday} onPress={() => setDueToday(true)} />
            <Chip label="Someday" selected={!dueToday} onPress={() => setDueToday(false)} />
          </View>
        </View>

        <Button
          label={createTask.isPending ? 'Adding…' : 'Add Task'}
          icon="check"
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={createTask.isPending}
          fullWidth
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  input: {
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
