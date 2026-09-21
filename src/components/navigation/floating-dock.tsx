import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName, Text } from '@/components/ui';
import { usePressScale } from '@/hooks/use-press-scale';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useAppTheme } from '@/theme';

export const DOCK_HEIGHT = 66;
const DOCK_GAP = 10;
const SLOTS = 5;
const PILL_WIDTH = 48;
const PILL_HEIGHT = 32;
const CREATE_SIZE = 60;

const TAB_META: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Home', icon: 'home' },
  tasks: { label: 'Tasks', icon: 'check-square' },
  notes: { label: 'Notes', icon: 'file-text' },
  stats: { label: 'Stats', icon: 'bar-chart-2' },
};

/** Bottom padding a tab screen's scroll content needs to clear the floating dock. */
export function useDockSpace(): number {
  const insets = useSafeAreaInsets();
  return insets.bottom + DOCK_GAP + DOCK_HEIGHT + 32;
}

/** Tabs sit in slots 0,1,3,4 — slot 2 is reserved for the raised create button. */
function slotFor(tabIndex: number): number {
  return tabIndex < 2 ? tabIndex : tabIndex + 1;
}

function CreateButton({ open, onPress }: { open: boolean; onPress: () => void }) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  const rotation = useSharedValue(0);
  const { animatedStyle: pressStyle, onPressIn, onPressOut } = usePressScale({ scaleTo: 0.9 });

  useEffect(() => {
    rotation.value = reduceMotion ? (open ? 45 : 0) : withSpring(open ? 45 : 0, theme.motion.springs.press);
  }, [open, reduceMotion, rotation, theme.motion.springs.press]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <Animated.View
      style={[
        styles.createWrap,
        {
          borderColor: theme.colors.background,
          backgroundColor: theme.colors.background,
          shadowColor: theme.gradients.aurora[1],
        },
        pressStyle,
      ]}
    >
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPress();
        }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel="Create"
        accessibilityHint="Opens options to add a task, habit, note, reminder, goal, or focus session"
        style={styles.createPressable}
      >
        <LinearGradient
          colors={theme.gradients.aurora}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.createFill}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.6 }}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View style={iconStyle}>
            <Icon name="plus" size={28} color="#FFFFFF" />
          </Animated.View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

interface FloatingDockProps extends BottomTabBarProps {
  onCreate: () => void;
  createOpen: boolean;
}

export function FloatingDock({ state, navigation, onCreate, createOpen }: FloatingDockProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const keyboardVisible = useKeyboardVisible();
  const [width, setWidth] = useState(0);

  const slotWidth = width / SLOTS;
  const indicatorX = useSharedValue(0);
  const visibility = useSharedValue(1);

  useEffect(() => {
    if (!slotWidth) return;
    const x = slotFor(state.index) * slotWidth + (slotWidth - PILL_WIDTH) / 2;
    indicatorX.value = reduceMotion ? x : withSpring(x, { damping: 18, stiffness: 220, mass: 0.6 });
  }, [state.index, slotWidth, reduceMotion, indicatorX]);

  useEffect(() => {
    visibility.value = withTiming(keyboardVisible ? 0 : 1, { duration: 160 });
  }, [keyboardVisible, visibility]);

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: indicatorX.value }] }));
  const dockStyle = useAnimatedStyle(() => ({
    opacity: visibility.value,
    transform: [{ translateY: (1 - visibility.value) * 40 }],
  }));

  const tabs = state.routes.map((route, index) => {
    const meta = TAB_META[route.name] ?? { label: route.name, icon: 'circle' as IconName };
    const focused = state.index === index;

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) {
        Haptics.selectionAsync();
        navigation.navigate(route.name, route.params);
      }
    };

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={meta.label}
        style={styles.slot}
      >
        <View style={styles.iconBox}>
          <Icon
            name={meta.icon}
            size={20}
            color={focused ? '#FFFFFF' : theme.colors.textTertiary}
          />
        </View>
        <Text
          variant="caption"
          style={{ color: focused ? theme.colors.primary : theme.colors.textTertiary }}
        >
          {meta.label}
        </Text>
      </Pressable>
    );
  });

  return (
    <Animated.View
      pointerEvents={keyboardVisible ? 'none' : 'box-none'}
      style={[styles.container, { bottom: insets.bottom + DOCK_GAP }, dockStyle]}
    >
      <View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={[
          styles.dock,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            shadowColor: theme.scheme === 'dark' ? '#000000' : theme.colors.primary,
          },
        ]}
      >
        {width > 0 ? (
          <Animated.View style={[styles.indicator, indicatorStyle]}>
            <LinearGradient
              colors={theme.gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.indicatorFill}
            />
          </Animated.View>
        ) : null}
        {tabs.slice(0, 2)}
        <View style={styles.slot} />
        {tabs.slice(2)}
      </View>
      <CreateButton open={createOpen} onPress={onCreate} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  dock: {
    alignSelf: 'stretch',
    height: DOCK_HEIGHT,
    borderRadius: DOCK_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 12,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    height: '100%',
  },
  iconBox: {
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: (DOCK_HEIGHT - PILL_HEIGHT) / 2 - 8,
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
  },
  indicatorFill: {
    flex: 1,
    borderRadius: PILL_HEIGHT / 2,
  },
  createWrap: {
    position: 'absolute',
    top: -CREATE_SIZE / 2 + 2,
    width: CREATE_SIZE + 10,
    height: CREATE_SIZE + 10,
    borderRadius: (CREATE_SIZE + 10) / 2,
    borderWidth: 5,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 14,
  },
  createPressable: {
    flex: 1,
    borderRadius: CREATE_SIZE / 2,
    overflow: 'hidden',
  },
  createFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
