import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppleCalendarPicker, Button, Chip, Text } from '@/components/ui';
import type { TaskPriority } from '@/domain/entities/task';
import { notificationsUnsupported } from '@/lib/notifications/expo-go-guard';
import { useAppTheme } from '@/theme';
import { addDaysIso, combineDateAndTime, formatTime12h, todayIso, toTimeString } from '@/utils/date';

import { currentTimeHHmm } from '../dashboard/progress';
import { useCreateTask, useSetReminder } from './hooks';

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const TIME_PRESETS = ['09:00', '12:00', '15:00', '18:00', '21:00'];

type Schedule = 'today' | 'tomorrow' | 'someday';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text variant="labelLarge" color="textSecondary">
        {label}
      </Text>
      {children}
    </View>
  );
}

export function NewTaskForm() {
  const theme = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ reminder?: string }>();
  const createTask = useCreateTask();
  const setReminder = useSetReminder();
  const wantsReminder = params.reminder === '1';

  const now = currentTimeHHmm();
  const firstFutureToday = TIME_PRESETS.find((time) => time > now);

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [schedule, setSchedule] = useState<Schedule>(
    wantsReminder && !firstFutureToday ? 'tomorrow' : 'today',
  );
  const [time, setTime] = useState<string | null>(
    wantsReminder ? (firstFutureToday ?? TIME_PRESETS[0]) : null,
  );
  const [remind, setRemind] = useState(wantsReminder);
  const [pickingTime, setPickingTime] = useState(false);

  const dueDate = schedule === 'today' ? todayIso() : schedule === 'tomorrow' ? addDaysIso(todayIso(), 1) : null;
  // Only offer times that haven't already passed if the task is for today.
  const timeOptions = schedule === 'today' ? TIME_PRESETS.filter((preset) => preset > now) : TIME_PRESETS;
  const customTime = time !== null && !TIME_PRESETS.includes(time);
  const canRemind = Boolean(dueDate && time);
  const submitting = createTask.isPending || setReminder.isPending;
  const canSubmit = title.trim().length > 0 && !submitting;

  const chooseSchedule = (next: Schedule) => {
    setSchedule(next);
    if (next === 'someday') {
      setTime(null);
      setRemind(false);
    } else if (next === 'today' && time && time <= now) {
      setTime(null);
      setRemind(false);
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    createTask.mutate(
      { title, priority, dueDate, dueTime: dueDate ? time : null },
      {
        onSuccess: (task) => {
          if (!(remind && canRemind && time)) {
            router.back();
            return;
          }
          setReminder.mutate(
            { task, enabled: true, time },
            {
              onSettled: () => router.back(),
              onError: () =>
                Alert.alert(
                  'Task added without a reminder',
                  notificationsUnsupported
                    ? 'Reminders need a development build on Android — Expo Go can’t schedule them.'
                    : 'Allow notifications in Settings to get reminders.',
                ),
            },
          );
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Field label="TITLE">
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={wantsReminder ? 'What should we remind you about?' : 'What do you need to do?'}
            placeholderTextColor={theme.colors.textTertiary}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            accessibilityLabel="Task title"
            style={[
              styles.input,
              theme.typography.bodyLarge,
              { color: theme.colors.textPrimary, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md },
            ]}
          />
        </Field>

        <Field label="PRIORITY">
          <View style={styles.chipRow}>
            {PRIORITIES.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                selected={priority === item.value}
                onPress={() => setPriority(item.value)}
              />
            ))}
          </View>
        </Field>

        <Field label="WHEN">
          <View style={styles.chipRow}>
            <Chip label="Today" icon="sun" selected={schedule === 'today'} onPress={() => chooseSchedule('today')} />
            <Chip
              label="Tomorrow"
              icon="sunrise"
              selected={schedule === 'tomorrow'}
              onPress={() => chooseSchedule('tomorrow')}
            />
            <Chip label="Someday" icon="inbox" selected={schedule === 'someday'} onPress={() => chooseSchedule('someday')} />
          </View>
        </Field>

        {dueDate ? (
          <Field label="TIME">
            <View style={styles.chipRow}>
              <Chip
                label="Any time"
                selected={time === null}
                onPress={() => {
                  setTime(null);
                  setRemind(false);
                }}
              />
              {timeOptions.map((preset) => (
                <Chip
                  key={preset}
                  label={formatTime12h(preset) ?? preset}
                  selected={time === preset}
                  onPress={() => setTime(preset)}
                />
              ))}
              <Chip
                label={customTime ? (formatTime12h(time) ?? 'Custom') : 'Custom time…'}
                icon="clock"
                selected={customTime}
                onPress={() => setPickingTime(true)}
              />
            </View>
            <AppleCalendarPicker
              visible={pickingTime}
              mode="time"
              title="Pick a time"
              initialValue={time ? combineDateAndTime(dueDate, time) : undefined}
              minimum={schedule === 'today' ? new Date() : undefined}
              onClose={() => setPickingTime(false)}
              onConfirm={(value) => setTime(toTimeString(value))}
            />
          </Field>
        ) : null}

        {canRemind ? (
          <Field label="REMINDER">
            <View style={styles.chipRow}>
              <Chip label="No reminder" selected={!remind} onPress={() => setRemind(false)} />
              <Chip
                label={`Remind at ${formatTime12h(time)}`}
                icon="bell"
                selected={remind}
                onPress={() => setRemind(true)}
              />
            </View>
          </Field>
        ) : null}

        <Button
          label={remind && canRemind ? 'Add Task & Remind Me' : 'Add Task'}
          icon={remind && canRemind ? 'bell' : 'check'}
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={submitting}
          fullWidth
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    gap: 22,
    paddingBottom: 24,
  },
  field: {
    gap: 10,
  },
  input: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
