import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';

import { AppleCalendarPicker, Button, Chip, Text } from '@/components/ui';
import { useAppTheme } from '@/theme';
import { combineDateAndTime, formatTime12h, todayIso, toTimeString } from '@/utils/date';

import { useCreateEvent } from './hooks';

const COLOR_OPTIONS = ['primary', 'secondary', 'accentMint', 'warning', 'error'] as const;
const COLOR_LABELS: Record<(typeof COLOR_OPTIONS)[number], string> = {
  primary: 'Navy',
  secondary: 'Steel',
  accentMint: 'Teal',
  warning: 'Lime',
  error: 'Red',
};
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function NewEventForm() {
  const theme = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const createEvent = useCreateEvent();

  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState<string | null>(null);
  const [pickingTime, setPickingTime] = useState(false);
  const [color, setColor] = useState<(typeof COLOR_OPTIONS)[number]>('primary');

  // The date can arrive in a deep link, so only a real YYYY-MM-DD is trusted.
  const date =
    params.date && ISO_DATE.test(params.date) && !Number.isNaN(new Date(`${params.date}T00:00:00`).getTime())
      ? params.date
      : todayIso();
  const canSubmit = title.trim().length > 0 && !createEvent.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    createEvent.mutate(
      {
        title,
        date,
        startTime,
        color: theme.colors[color],
      },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={{ gap: theme.spacing.xl }}>
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="labelLarge" color="textSecondary">
            TITLE
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Team meeting"
            placeholderTextColor={theme.colors.textTertiary}
            autoFocus
            style={[
              styles.input,
              { color: theme.colors.textPrimary, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md },
            ]}
          />
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="labelLarge" color="textSecondary">
            {new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()} · TIME
          </Text>
          <View style={styles.chipRow}>
            <Chip label="All day" selected={startTime === null} onPress={() => setStartTime(null)} />
            <Chip
              label={startTime ? (formatTime12h(startTime) ?? startTime) : 'Pick a time…'}
              icon="clock"
              selected={startTime !== null}
              onPress={() => setPickingTime(true)}
            />
          </View>
          <AppleCalendarPicker
            visible={pickingTime}
            mode="time"
            title="Starts at"
            initialValue={combineDateAndTime(date, startTime ?? '09:00')}
            onClose={() => setPickingTime(false)}
            onConfirm={(value) => setStartTime(toTimeString(value))}
          />
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="labelLarge" color="textSecondary">
            COLOR
          </Text>
          <View style={styles.chipRow}>
            {COLOR_OPTIONS.map((option) => (
              <Chip key={option} label={COLOR_LABELS[option]} selected={color === option} onPress={() => setColor(option)} />
            ))}
          </View>
        </View>

        <Button
          label={createEvent.isPending ? 'Adding…' : 'Add Event'}
          icon="calendar"
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={createEvent.isPending}
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
