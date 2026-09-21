import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Chip, EmptyState, ProgressRing, Text } from '@/components/ui';
import { useAppTheme } from '@/theme';

import { useFinishFocusSession, useRecentFocusSessions, useStartFocusSession, useTodayFocusMinutes } from './hooks';

const PRESETS = [25, 50, 90];

interface ActiveSession {
  id: string;
  totalSeconds: number;
  endAt: number;
}

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function FocusScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const startSession = useStartFocusSession();
  const finishSession = useFinishFocusSession();
  const { data: recentSessions } = useRecentFocusSessions();
  const { data: todayMinutes } = useTodayFocusMinutes();

  const [plannedMinutes, setPlannedMinutes] = useState(25);
  const [customInput, setCustomInput] = useState(false);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const pausedRemainingRef = useRef(0);

  useEffect(() => {
    if (!session || isPaused) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.round((session.endAt - Date.now()) / 1000));
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        const minutes = Math.round(session.totalSeconds / 60);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        finishSession.mutate({ id: session.id, actualMinutes: minutes, isCompleted: true });
        Alert.alert('Focus session complete', `Nice work — ${minutes} min focused.`);
        setSession(null);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [session, isPaused, finishSession]);

  const handleStart = async () => {
    const totalSeconds = plannedMinutes * 60;
    const created = await startSession.mutateAsync({ plannedMinutes, taskId: null });
    setSession({ id: created.id, totalSeconds, endAt: Date.now() + totalSeconds * 1000 });
    setRemainingSeconds(totalSeconds);
    setIsPaused(false);
  };

  const handlePause = () => {
    pausedRemainingRef.current = remainingSeconds;
    setIsPaused(true);
  };

  const handleResume = () => {
    if (!session) return;
    setSession({ ...session, endAt: Date.now() + pausedRemainingRef.current * 1000 });
    setIsPaused(false);
  };

  const handleStop = () => {
    if (!session) return;
    const elapsedMinutes = Math.round((session.totalSeconds - remainingSeconds) / 60);
    finishSession.mutate({ id: session.id, actualMinutes: elapsedMinutes, isCompleted: false });
    setSession(null);
    setRemainingSeconds(0);
  };

  const progress = session ? 1 - remainingSeconds / session.totalSeconds : 0;

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.huge },
      ]}
    >
      <Text variant="displayMedium">Focus</Text>
      <Text variant="bodyMedium" color="textSecondary">
        {typeof todayMinutes === 'number' ? `${todayMinutes} min focused today` : 'Start a session to focus'}
      </Text>

      <Card style={styles.timerCard}>
        <ProgressRing progress={session ? progress : 0} size={200} strokeWidth={14}>
          <Text variant="displayLarge">{formatClock(session ? remainingSeconds : plannedMinutes * 60)}</Text>
        </ProgressRing>

        {!session && (
          <View style={styles.chipRow}>
            {PRESETS.map((minutes) => (
              <Chip
                key={minutes}
                label={`${minutes}m`}
                selected={!customInput && plannedMinutes === minutes}
                onPress={() => {
                  setCustomInput(false);
                  setPlannedMinutes(minutes);
                }}
              />
            ))}
            <Chip
              label={customInput ? `${plannedMinutes}m (custom)` : 'Custom'}
              selected={customInput}
              onPress={() => setCustomInput(true)}
            />
          </View>
        )}

        {customInput && !session && (
          <View style={styles.chipRow}>
            {[10, 15, 45, 60, 120].map((minutes) => (
              <Chip
                key={minutes}
                label={`${minutes}m`}
                selected={plannedMinutes === minutes}
                onPress={() => setPlannedMinutes(minutes)}
              />
            ))}
          </View>
        )}

        <View style={styles.controlsRow}>
          {!session ? (
            <Button label="Start Focus" icon="play" onPress={handleStart} fullWidth />
          ) : isPaused ? (
            <>
              <Button label="Resume" icon="play" onPress={handleResume} />
              <Button label="Stop" variant="outline" icon="square" onPress={handleStop} />
            </>
          ) : (
            <>
              <Button label="Pause" icon="pause" variant="outline" onPress={handlePause} />
              <Button label="Stop" variant="ghost" icon="square" onPress={handleStop} />
            </>
          )}
        </View>
      </Card>

      <View style={{ gap: 10 }}>
        <Text variant="labelLarge" color="textSecondary">
          RECENT SESSIONS
        </Text>
        {(recentSessions?.length ?? 0) === 0 ? (
          <EmptyState icon="clock" title="No focus sessions yet" />
        ) : (
          recentSessions!.map((focusSession) => (
            <Card key={focusSession.id} style={styles.sessionRow}>
              <Text variant="bodyLarge">{focusSession.actualMinutes ?? focusSession.plannedMinutes} min</Text>
              <Text variant="bodySmall" color="textSecondary">
                {focusSession.isCompleted ? 'Completed' : 'Stopped early'} ·{' '}
                {new Date(focusSession.startedAt).toLocaleDateString()}
              </Text>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    gap: 24,
  },
  timerCard: {
    alignItems: 'center',
    gap: 20,
    paddingVertical: 32,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  sessionRow: {
    gap: 2,
  },
});
