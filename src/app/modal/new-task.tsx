import { StyleSheet, View } from 'react-native';

import { NewTaskForm } from '@/features/tasks/new-task-form';
import { useAppTheme } from '@/theme';

export default function NewTaskModal() {
  const theme = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <NewTaskForm />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
});
