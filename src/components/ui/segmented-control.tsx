import { useEffect, useState } from 'react';
import * as Haptics from '@/lib/haptics';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useAppTheme } from '@/theme';

import { Text } from './text';

const PAD = 3;

interface SegmentedControlProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  accessibilityLabel?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  const segment = width > 0 ? (width - PAD * 2) / options.length : 0;
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.value = reduceMotion ? index * segment : withSpring(index * segment, { damping: 20, stiffness: 220 });
  }, [index, segment, reduceMotion, offset]);

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const height = size === 'sm' ? 32 : 38;

  return (
    <View
      onLayout={onLayout}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, { height, backgroundColor: theme.colors.surfaceMuted, borderRadius: height / 2 }]}
    >
      {segment > 0 ? (
        <Animated.View
          style={[
            styles.indicator,
            {
              width: segment,
              borderRadius: (height - PAD * 2) / 2,
              backgroundColor: theme.colors.surface,
              shadowColor: theme.colors.shadow,
            },
            indicatorStyle,
          ]}
        />
      ) : null}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (selected) return;
              Haptics.selectionAsync();
              onChange(option.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            style={styles.segment}
          >
            <Text
              variant={size === 'sm' ? 'labelMedium' : 'labelLarge'}
              style={{ color: selected ? theme.colors.textPrimary : theme.colors.textSecondary }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: PAD,
  },
  indicator: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
