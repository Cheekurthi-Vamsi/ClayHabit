import { useCallback } from 'react';
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { springs } from '@/theme/motion';

import { useReduceMotion } from './use-reduce-motion';

interface PressScaleOptions {
  scaleTo?: number;
}

export function usePressScale({ scaleTo = 0.96 }: PressScaleOptions = {}) {
  const scale = useSharedValue(1);
  const reduceMotion = useReduceMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = useCallback(() => {
    scale.value = reduceMotion ? scaleTo : withSpring(scaleTo, springs.press);
  }, [reduceMotion, scale, scaleTo]);

  const onPressOut = useCallback(() => {
    scale.value = reduceMotion ? 1 : withSpring(1, springs.press);
  }, [reduceMotion, scale]);

  return { animatedStyle, onPressIn, onPressOut };
}
