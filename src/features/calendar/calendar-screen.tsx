import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, EmptyState, ErrorState, IconButton, Text } from '@/components/ui';
import { useAppTheme } from '@/theme';
import { formatTime12h, getMonthGridDates, todayIso } from '@/utils/date';

import { useEventsForRange, useTasksForRange } from './hooks';
import { MonthGrid } from './month-grid';

export function CalendarScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(todayIso());

  const gridDates = useMemo(() => getMonthGridDates(cursor.year, cursor.month), [cursor]);
  const rangeStart = gridDates[0];
  const rangeEnd = gridDates[gridDates.length - 1];

  const { data: tasks, isError: tasksError, refetch: refetchTasks } = useTasksForRange(rangeStart, rangeEnd);
  const { data: events, isError: eventsError, refetch: refetchEvents } = useEventsForRange(rangeStart, rangeEnd);

  const markedDates = useMemo(() => {
    const set = new Set<string>();
    (tasks ?? []).forEach((task) => task.dueDate && set.add(task.dueDate));
    (events ?? []).forEach((event) => set.add(event.date));
    return set;
  }, [tasks, events]);

  const dayTasks = (tasks ?? []).filter((task) => task.dueDate === selectedDate);
  const dayEvents = (events ?? []).filter((event) => event.date === selectedDate);

  const handleChangeMonth = (delta: number) => {
    setCursor((prev) => {
      const date = new Date(prev.year, prev.month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <View style={styles.titleRow}>
          <IconButton name="arrow-left" variant="ghost" accessibilityLabel="Back" onPress={() => router.back()} />
          <Text variant="displayMedium">Calendar</Text>
        </View>
        <IconButton
          name="plus"
          variant="filled"
          accessibilityLabel="New event"
          onPress={() => router.push({ pathname: '/modal/new-event', params: { date: selectedDate } })}
        />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + theme.spacing.huge }]}>
        <Card>
          <MonthGrid
            year={cursor.year}
            month={cursor.month}
            selectedDate={selectedDate}
            markedDates={markedDates}
            onSelectDate={setSelectedDate}
            onChangeMonth={handleChangeMonth}
          />
        </Card>

        <View style={{ gap: 10 }}>
          <Text variant="labelLarge" color="textSecondary">
            {selectedDate === todayIso() ? 'TODAY' : selectedDate.toUpperCase()}
          </Text>

          {(tasksError || eventsError) && (
            <ErrorState
              message="Couldn't load your calendar."
              onRetry={() => {
                refetchTasks();
                refetchEvents();
              }}
            />
          )}

          {dayEvents.map((event) => (
            <Card key={event.id} style={styles.eventCard}>
              <View style={[styles.eventDot, { backgroundColor: event.color }]} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyLarge">{event.title}</Text>
                {event.startTime && (
                  <Text variant="bodySmall" color="textSecondary">
                    {formatTime12h(event.startTime)}
                    {event.endTime ? ` – ${formatTime12h(event.endTime)}` : ''}
                  </Text>
                )}
              </View>
            </Card>
          ))}

          {dayTasks.map((task) => (
            <Card
              key={task.id}
              onPress={() => router.push(`/task/${task.id}`)}
              accessibilityLabel={task.title}
              style={styles.eventCard}
            >
              <View
                style={[
                  styles.eventDot,
                  { backgroundColor: task.isCompleted ? theme.colors.success : theme.colors.primary },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text
                  variant="bodyLarge"
                  style={task.isCompleted ? { textDecorationLine: 'line-through' } : undefined}
                >
                  {task.title}
                </Text>
                {task.dueTime && (
                  <Text variant="bodySmall" color="textSecondary">
                    {formatTime12h(task.dueTime)}
                  </Text>
                )}
              </View>
            </Card>
          ))}

          {!tasksError && !eventsError && dayTasks.length === 0 && dayEvents.length === 0 && (
            <EmptyState icon="calendar" title="Nothing scheduled" message="This day is wide open." />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -10,
  },
  content: {
    paddingHorizontal: 20,
    gap: 20,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
