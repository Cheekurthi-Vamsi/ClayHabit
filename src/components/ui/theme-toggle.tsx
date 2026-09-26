import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import * as Haptics from '@/lib/haptics';
import { useSettingsStore } from '@/store/settings-store';
import { useAppTheme } from '@/theme';

import { Icon, type IconName } from './icon';

const SIZE = 34;
const PAD = 3;

/**
 * Sun / moon switch for light and dark mode. Picking one sets the theme
 * outright (leaving "System"), the same as choosing it in Settings.
 */
export function ThemeToggle() {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  const setThemePreference = useSettingsStore((state) => state.setThemePreference);
  const dark = theme.scheme === 'dark';
  const x = useSharedValue(dark ? 1 : 0);

  useEffect(() => {
    x.value = reduceMotion ? (dark ? 1 : 0) : withSpring(dark ? 1 : 0, { damping: 16, stiffness: 220 });
  }, [dark, reduceMotion, x]);

  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * SIZE }] }));

  const option = (scheme: 'light' | 'dark', icon: IconName, label: string) => {
    const selected = theme.scheme === scheme;
    return (
      <Pressable
        onPress={() => {
          if (selected) return;
          Haptics.selectionAsync();
          setThemePreference(scheme);
        }}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
        hitSlop={4}
        style={styles.option}
      >
        <Icon name={icon} size={16} color={selected ? theme.colors.onHighlight : theme.colors.textSecondary} />
      </Pressable>
    );
  };

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Appearance"
      style={[styles.track, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
    >
      <Animated.View style={[styles.knob, { backgroundColor: theme.colors.highlight }, knobStyle]} />
      {option('light', 'sun', 'Light mode')}
      {option('dark', 'moon', 'Dark mode')}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: PAD,
    borderRadius: 999,
    borderWidth: 1,
  },
  knob: {
    position: 'absolute',
    top: PAD,
    left: PAD,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
  },
  option: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
