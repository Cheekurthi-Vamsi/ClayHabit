import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HabitForm } from '@/features/habits/habit-form';
import { useCreateHabit } from '@/features/habits/hooks';
import { useAppTheme } from '@/theme';

export default function NewHabitModal() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const createHabit = useCreateHabit();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + theme.spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <HabitForm
          submitLabel="Create Habit"
          showTemplates
          submitting={createHabit.isPending}
          onSubmit={(input) => createHabit.mutate(input, { onSuccess: () => router.back() })}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
});
