import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';

const STEP_MS = 60;

/** Fades a section up into place, `index` steps after the first — for top-to-bottom screen entrances. */
export function Stagger({
  index,
  children,
  style,
}: {
  index: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = useReduceMotion();
  return (
    <Animated.View
      entering={
        reduceMotion ? undefined : FadeInDown.delay(index * STEP_MS).duration(420).springify().damping(20)
      }
      style={style}
    >
      {children}
    </Animated.View>
  );
}
