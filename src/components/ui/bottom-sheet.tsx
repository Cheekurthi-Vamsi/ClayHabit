import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useAppTheme } from '@/theme';

import { Text } from './text';

const EXIT_MS = 200;
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 900;

/** Closes the sheet with its exit animation, then runs `then` once it's gone. */
export type CloseSheet = (then?: () => void) => void;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode | ((close: CloseSheet) => React.ReactNode);
}

export function BottomSheet({ visible, onClose, title, subtitle, children }: BottomSheetProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { height: screenHeight } = useWindowDimensions();

  const translateY = useSharedValue(screenHeight);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    translateY.value = screenHeight;
    backdrop.value = 0;
    translateY.value = reduceMotion
      ? 0
      : withSpring(0, { damping: 22, stiffness: 210, mass: 0.8 });
    backdrop.value = withTiming(1, { duration: 220 });
  }, [visible, reduceMotion, screenHeight, translateY, backdrop]);

  const close: CloseSheet = (then) => {
    translateY.value = withTiming(screenHeight, { duration: EXIT_MS });
    backdrop.value = withTiming(0, { duration: EXIT_MS });
    setTimeout(() => {
      onClose();
      then?.();
    }, EXIT_MS);
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetY(8)
    .onUpdate((event) => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY) {
        close();
      } else {
        translateY.value = withSpring(0, theme.motion.springs.gentle);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => close()}
    >
      {/* Modals mount in their own native root, so gestures need their own handler root. */}
      <GestureHandlerRootView style={styles.root}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.overlay }, backdropStyle]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => close()}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        </Animated.View>

        <GestureDetector gesture={pan}>
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.backgroundElevated,
                borderTopLeftRadius: theme.radii.xl,
                borderTopRightRadius: theme.radii.xl,
                paddingBottom: insets.bottom + theme.spacing.xxl,
                shadowColor: theme.colors.shadow,
              },
              sheetStyle,
            ]}
            accessibilityViewIsModal
          >
            <View style={[styles.handle, { backgroundColor: theme.colors.borderStrong }]} />
            {title ? (
              <View style={styles.header}>
                <Text variant="headlineMedium">{title}</Text>
                {subtitle ? (
                  <Text variant="bodyMedium" color="textSecondary">
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            ) : null}
            {typeof children === 'function' ? children(close) : children}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: 14,
  },
  header: {
    gap: 4,
    marginBottom: 18,
  },
});
