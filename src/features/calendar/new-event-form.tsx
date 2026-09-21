import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';

import { Button, Chip, Text } from '@/components/ui';
import { useAppTheme } from '@/theme';
import { todayIso } from '@/utils/date';

import { useCreateEvent } from './hooks';

const COLOR_OPTIONS = ['primary', 'secondary', 'accentMint', 'warning', 'error'] as const;

export function NewEventForm() {
  const theme = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const createEvent = useCreateEvent();

  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [color, setColor] = useState<(typeof COLOR_OPTIONS)[number]>('primary');

  const date = params.date ?? todayIso();
  const canSubmit = title.trim().length > 0 && !createEvent.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    createEvent.mutate(
      {
        title,
        date,
        startTime: startTime || null,
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
            {date.toUpperCase()} · TIME (OPTIONAL, HH:MM)
          </Text>
          <TextInput
            value={startTime}
            onChangeText={setStartTime}
            placeholder="09:30"
            placeholderTextColor={theme.colors.textTertiary}
            style={[
              styles.input,
              { color: theme.colors.textPrimary, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md },
            ]}
          />
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="labelLarge" color="textSecondary">
            COLOR
          </Text>
          <View style={styles.chipRow}>
            {COLOR_OPTIONS.map((option) => (
              <Chip key={option} label={option} selected={color === option} onPress={() => setColor(option)} />
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
