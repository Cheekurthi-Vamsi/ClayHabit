import { StyleSheet, View } from 'react-native';

import { NewEventForm } from '@/features/calendar/new-event-form';
import { useAppTheme } from '@/theme';

export default function NewEventModal() {
  const theme = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <NewEventForm />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
});
