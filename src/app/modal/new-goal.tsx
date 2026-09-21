import { StyleSheet, View } from 'react-native';

import { NewGoalForm } from '@/features/goals/new-goal-form';
import { useAppTheme } from '@/theme';

export default function NewGoalModal() {
  const theme = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <NewGoalForm />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
});
