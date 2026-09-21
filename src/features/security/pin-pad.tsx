import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { Icon, Text } from '@/components/ui';
import { useAppTheme } from '@/theme';

const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'backspace'];

interface PinPadProps {
  onComplete: (pin: string) => void;
  error?: boolean;
  subtitle?: string;
}

export function PinPad({ onComplete, error, subtitle }: PinPadProps) {
  const theme = useAppTheme();
  const [pin, setPin] = useState('');
  const shake = useSharedValue(0);

  useEffect(() => {
    if (error) {
      shake.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    }
  }, [error, shake]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const handleKey = (key: string) => {
    if (key === '') return;

    if (key === 'backspace') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = pin.length < PIN_LENGTH ? pin + key : pin;
    setPin(next);

    if (next.length === PIN_LENGTH) {
      onComplete(next);
      setPin('');
    }
  };

  return (
    <View style={styles.container}>
      {subtitle && (
        <Text variant="bodyMedium" color="textSecondary" style={styles.subtitle}>
          {subtitle}
        </Text>
      )}

      <Animated.View style={[styles.dotsRow, shakeStyle]}>
        {Array.from({ length: PIN_LENGTH }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                borderRadius: theme.radii.full,
                backgroundColor:
                  index < pin.length
                    ? error
                      ? theme.colors.error
                      : theme.colors.primary
                    : theme.colors.surfaceMuted,
              },
            ]}
          />
        ))}
      </Animated.View>

      <View style={styles.keypad}>
        {KEYS.map((key, index) => (
          <Pressable
            key={index}
            disabled={key === ''}
            onPress={() => handleKey(key)}
            accessibilityRole={key ? 'button' : undefined}
            accessibilityLabel={key === 'backspace' ? 'Delete' : key}
            style={[styles.key, { borderRadius: theme.radii.full }]}
          >
            {key === 'backspace' ? (
              <Icon name="delete" size={22} color={theme.colors.textPrimary} />
            ) : (
              <Text variant="headlineMedium">{key}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 32,
  },
  subtitle: {
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  dot: {
    width: 16,
    height: 16,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 260,
    justifyContent: 'center',
  },
  key: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
