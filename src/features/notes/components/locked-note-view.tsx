import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, Icon, Text } from '@/components/ui';
import { PinPad } from '@/features/security/pin-pad';
import { checkPin } from '@/lib/security/app-lock-service';
import { useAppTheme } from '@/theme';

import { authenticateForNote, noteLockMethod, NO_LOCK_METHOD_MESSAGE, type NoteLockMethod } from '../services/note-lock';

interface LockedNoteViewProps {
  title: string;
  onUnlocked: () => void;
}

/**
 * What a locked note shows before it's opened: nothing of its content, just
 * a lock and the way in. Asks the phone for authentication right away.
 */
export function LockedNoteView({ title, onUnlocked }: LockedNoteViewProps) {
  const theme = useAppTheme();
  const [method, setMethod] = useState<NoteLockMethod | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pinError, setPinError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const promptDevice = async () => {
    setMessage(null);
    const ok = await authenticateForNote(`Unlock "${title}"`);
    if (ok) onUnlocked();
    else setMessage("Couldn't confirm it's you. Try again.");
  };

  useEffect(() => {
    let cancelled = false;
    noteLockMethod().then((found) => {
      if (cancelled) return;
      setMethod(found);
      if (found === 'device') {
        authenticateForNote(`Unlock "${title}"`).then((ok) => {
          if (!cancelled && ok) onUnlocked();
        });
      }
    });
    return () => {
      cancelled = true;
    };
    // Prompt once when the note opens; the button asks again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.container}>
      <View style={[styles.lock, { backgroundColor: theme.colors.primaryMuted }]}>
        <Icon name="lock" size={30} color={theme.colors.primary} />
      </View>
      <Text variant="headlineLarge" style={styles.center} numberOfLines={2}>
        {title}
      </Text>
      <Text variant="bodyMedium" color="textSecondary" style={styles.center}>
        This note is locked. Its content stays hidden until you confirm it&apos;s you.
      </Text>

      {method === 'device' ? (
        <Button label="Unlock note" icon="unlock" onPress={promptDevice} />
      ) : method === 'pin' ? (
        <PinPad
          key={attempt}
          error={pinError}
          subtitle="Enter your App Lock PIN"
          onComplete={async (pin) => {
            const result = await checkPin(pin);
            if (result.ok) {
              onUnlocked();
              return;
            }
            setPinError(true);
            setAttempt((value) => value + 1);
            setTimeout(() => setPinError(false), 400);
            setMessage(
              result.waitMs > 0
                ? `Too many wrong PINs. Try again in ${Math.ceil(result.waitMs / 1000)}s.`
                : 'Wrong PIN.',
            );
          }}
        />
      ) : method === 'none' ? (
        <Text variant="bodySmall" color="textSecondary" style={styles.center}>
          {NO_LOCK_METHOD_MESSAGE}
        </Text>
      ) : null}

      {message ? (
        <Text variant="bodySmall" style={[styles.center, { color: theme.colors.error }]}>
          {message}
        </Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 28,
  },
  lock: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
  },
});
