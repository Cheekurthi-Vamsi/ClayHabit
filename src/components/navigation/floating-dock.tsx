import { useEffect, useState } from 'react';
import * as Haptics from '@/lib/haptics';
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

export const DOCK_HEIGHT = 64;
const DOCK_GAP = 10;
const DOCK_PAD = 8;
const ITEM_HEIGHT = DOCK_HEIGHT - DOCK_PAD * 2;
const MAX_DOCK_WIDTH = 440;

export type DockTabMeta = Record<string, { label: string; icon: IconName }>;

const PRODUCTIVITY_TABS: DockTabMeta = {
  index: { label: 'Home', icon: 'home' },
  tasks: { label: 'Tasks', icon: 'check-square' },
  notes: { label: 'Notes', icon: 'file-text' },
  stats: { label: 'Stats', icon: 'bar-chart-2' },
};

/** Bottom padding a tab screen's scroll content needs to clear the floating dock. */
export function useDockSpace(): number {
  const insets = useSafeAreaInsets();
  return insets.bottom + DOCK_GAP + DOCK_HEIGHT + 24;
}

function CreateButton({ open, onPress, accessibilityHint }: { open: boolean; onPress: () => void; accessibilityHint: string }) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  const rotation = useSharedValue(0);
  const { animatedStyle: pressStyle, onPressIn, onPressOut } = usePressScale({ scaleTo: 0.9 });

  useEffect(() => {
    rotation.value = reduceMotion ? (open ? 45 : 0) : withSpring(open ? 45 : 0, theme.motion.springs.press);
  }, [open, reduceMotion, rotation, theme.motion.springs.press]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <Animated.View style={[styles.create, { backgroundColor: theme.colors.panel }, pressStyle]}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPress();
        }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel="Create"
        accessibilityHint={accessibilityHint}
        accessibilityState={{ expanded: open }}
        style={styles.createPressable}
      >
        <Animated.View style={iconStyle}>
          <Icon name="plus" size={26} color={theme.colors.highlight} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

interface FloatingDockProps extends BottomTabBarProps {
  onCreate: () => void;
  createOpen: boolean;
  /** Label and icon per route name. Defaults to the productivity tabs. */
  tabs?: DockTabMeta;
  createHint?: string;
}

/**
 * The pill navigation bar (images/navigation bar.jpg): a dark bar with every
 * tab in a fixed slot (icon over label) and a lime pill that slides behind the
 * active one, plus a round create button beside it. Hides while the keyboard is up.
 */
export function FloatingDock({
  state,
  navigation,
  onCreate,
  createOpen,
  tabs: tabMeta = PRODUCTIVITY_TABS,
  createHint = 'Opens options to add a task, habit, note, reminder, goal, or focus session',
}: FloatingDockProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const keyboardVisible = useKeyboardVisible();
  const visibility = useSharedValue(1);
  const [barWidth, setBarWidth] = useState(0);

  const slotWidth = barWidth > 0 ? (barWidth - DOCK_PAD * 2) / state.routes.length : 0;
  const indicatorX = useSharedValue(0);

  // Only the lime highlight moves; icons and labels keep fixed slots.
  useEffect(() => {
    if (!slotWidth) return;
    const x = state.index * slotWidth;
    indicatorX.value = reduceMotion ? x : withSpring(x, { damping: 20, stiffness: 240, mass: 0.6 });
  }, [indicatorX, reduceMotion, slotWidth, state.index]);

  useEffect(() => {
    visibility.value = withTiming(keyboardVisible ? 0 : 1, { duration: 160 });
  }, [keyboardVisible, visibility]);

  const dockStyle = useAnimatedStyle(() => ({
    opacity: visibility.value,
    transform: [{ translateY: (1 - visibility.value) * 40 }],
  }));
  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: indicatorX.value }] }));

  return (
    <Animated.View
      pointerEvents={keyboardVisible ? 'none' : 'box-none'}
      style={[styles.container, { bottom: insets.bottom + DOCK_GAP }, dockStyle]}
    >
      <View style={styles.row}>
        <View
          accessibilityRole="tablist"
          onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
          style={[
            styles.bar,
            {
              backgroundColor: theme.colors.panel,
              shadowColor: theme.scheme === 'dark' ? '#000000' : theme.colors.panel,
            },
          ]}
        >
          {slotWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.indicator, { width: slotWidth, backgroundColor: theme.colors.highlight }, indicatorStyle]}
            />
          ) : null}
          {state.routes.map((route, index) => {
            const meta = tabMeta[route.name] ?? { label: route.name, icon: 'circle' as IconName };
            const focused = state.index === index;
            const color = focused ? theme.colors.onHighlight : theme.colors.onPanelMuted;

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
                <Icon name={meta.icon} size={20} color={color} />
                <Text variant="caption" style={[styles.label, { color }]} numberOfLines={1}>
                  {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <CreateButton open={createOpen} onPress={onCreate} accessibilityHint={createHint} />
      </View>
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
  row: {
    width: '100%',
    maxWidth: MAX_DOCK_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bar: {
    flex: 1,
    height: DOCK_HEIGHT,
    borderRadius: DOCK_HEIGHT / 2,
    paddingHorizontal: DOCK_PAD,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 12,
  },
  indicator: {
    position: 'absolute',
    left: DOCK_PAD,
    top: DOCK_PAD,
    height: ITEM_HEIGHT,
    borderRadius: ITEM_HEIGHT / 2,
  },
  slot: {
    flex: 1,
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontFamily: 'Manrope_700Bold',
  },
  create: {
    width: DOCK_HEIGHT,
    height: DOCK_HEIGHT,
    borderRadius: DOCK_HEIGHT / 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 12,
  },
  createPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
