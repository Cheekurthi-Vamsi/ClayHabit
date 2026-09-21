import { useState } from 'react';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { useAppTheme } from '@/theme';

import { useCreateGoal } from './hooks';

export function NewGoalForm() {
  const theme = useAppTheme();
  const router = useRouter();
  const createGoal = useCreateGoal();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');

  const canSubmit = title.trim().length > 0 && !createGoal.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    createGoal.mutate(
      { title, description: description || null, deadline: deadline || null },
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
            placeholder="e.g. Become job-ready in cybersecurity"
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
            DESCRIPTION (OPTIONAL)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What does success look like?"
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            style={[
              styles.input,
              { color: theme.colors.textPrimary, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md, minHeight: 80 },
            ]}
          />
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="labelLarge" color="textSecondary">
            DEADLINE (OPTIONAL, YYYY-MM-DD)
          </Text>
          <TextInput
            value={deadline}
            onChangeText={setDeadline}
            placeholder="2026-12-31"
            placeholderTextColor={theme.colors.textTertiary}
            style={[
              styles.input,
              { color: theme.colors.textPrimary, backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md },
            ]}
          />
        </View>

        <Button
          label={createGoal.isPending ? 'Creating…' : 'Create Goal'}
          icon="target"
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={createGoal.isPending}
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
});
