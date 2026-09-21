import { Easing } from 'react-native-reanimated';

export const duration = {
  fast: 150,
  base: 250,
  slow: 400,
  celebration: 600,
} as const;

export const easing = {
  standard: Easing.bezier(0.2, 0, 0, 1),
  decelerate: Easing.bezier(0, 0, 0, 1),
  accelerate: Easing.bezier(0.3, 0, 1, 1),
} as const;

export const springs = {
  press: { damping: 16, stiffness: 220, mass: 0.5 },
  gentle: { damping: 18, stiffness: 140, mass: 0.6 },
  bouncy: { damping: 10, stiffness: 160, mass: 0.7 },
} as const;
