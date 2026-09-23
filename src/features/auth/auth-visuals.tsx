import { useEffect } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { CartoonPress, Icon, Text, type IconName } from '@/components/ui';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { fontFamily, useAppTheme } from '@/theme';

/**
 * Artwork and moving parts for the welcome, storage-choice and Cloud
 * screens, following the brand art in images/: a soft light page with
 * pastel blobs, the rabbit logo, the rabbit-on-a-hill scene and a Google
 * button. Loops stop under Reduce Motion (system or Settings).
 */

export const LOGO_MARK = require('../../../assets/images/logo-mark.png');
const ILLUSTRATION = require('../../../assets/images/auth-illustration.png');
/** auth-illustration.png is 760 × 360. */
const ILLUSTRATION_RATIO = 760 / 360;

// ---- Backdrop ------------------------------------------------------------------------------

function Blob({ color, size, opacity }: { color: string; size: number; opacity: number }) {
  const id = `blob-${color.replace('#', '')}`;
  return (
    <Svg width={size} height={size} pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="0.6" stopColor={color} stopOpacity={opacity * 0.45} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={size} height={size} fill={`url(#${id})`} />
    </Svg>
  );
}

function DriftingBlob({
  color,
  size,
  top,
  left,
  dx,
  dy,
  duration,
  opacity,
}: {
  color: string;
  size: number;
  top: number;
  left: number;
  dx: number;
  dy: number;
  duration: number;
  opacity: number;
}) {
  const reduceMotion = useReduceMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(t);
      t.value = 0;
      return;
    }
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(t);
  }, [duration, reduceMotion, t]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: t.value * dx }, { translateY: t.value * dy }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.abs, { top, left, width: size, height: size }, style]}>
      <Blob color={color} size={size} opacity={opacity} />
    </Animated.View>
  );
}

/** The page behind every pre-app screen: near-white (navy in dark mode) with slow pastel blobs. */
export function SoftBackdrop() {
  const theme = useAppTheme();
  const { width, height } = useWindowDimensions();
  const dark = theme.scheme === 'dark';
  const big = Math.max(width, 360) * 0.95;
  const strength = dark ? 0.35 : 0.55;

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background }]} pointerEvents="none">
      <DriftingBlob color="#A99BFF" size={big} top={-big * 0.5} left={-big * 0.45} dx={24} dy={30} duration={9000} opacity={strength} />
      <DriftingBlob color="#8CC4FF" size={big} top={height - big * 0.55} left={width - big * 0.5} dx={-26} dy={-20} duration={11000} opacity={strength} />
      <DriftingBlob color="#9BE7D2" size={big * 0.6} top={height * 0.42} left={-big * 0.35} dx={18} dy={-24} duration={13000} opacity={strength * 0.7} />
      <View style={[styles.dot, { top: height * 0.26, right: 22, width: 36, height: 36, backgroundColor: theme.colors.primaryMuted }]} />
      <View style={[styles.dot, { top: height * 0.34, left: 18, width: 46, height: 46, backgroundColor: theme.colors.secondaryMuted }]} />
    </View>
  );
}

// ---- Logo, wordmark and illustration ---------------------------------------------------------

/** The rabbit logo, floating gently. */
export function FloatingLogo({ size = 88 }: { size?: number }) {
  const reduceMotion = useReduceMotion();
  const float = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(float);
      float.value = 0;
      return;
    }
    float.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(float);
  }, [float, reduceMotion]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -5 * float.value }] }));

  return (
    <Animated.View entering={reduceMotion ? undefined : FadeInDown.springify().damping(13)}>
      <Animated.View style={[styles.logoShadow, { borderRadius: size * 0.28 }, style]}>
        <Image source={LOGO_MARK} style={{ width: size, height: size }} contentFit="contain" accessible={false} />
      </Animated.View>
    </Animated.View>
  );
}

/** "Clay" in brand violet, "Habbit" in ink — as in the logo. */
export function Wordmark({ size = 40 }: { size?: number }) {
  const theme = useAppTheme();
  return (
    <Text
      style={[styles.wordmark, { fontSize: size, lineHeight: size * 1.2, color: theme.colors.textPrimary }]}
      accessibilityRole="header"
      accessibilityLabel="ClayHabbit"
    >
      <Text style={[styles.wordmark, { fontSize: size, lineHeight: size * 1.2, color: theme.colors.primary }]}>Clay</Text>
      Habbit
    </Text>
  );
}

/** The rabbit-on-a-hill scene from the brand art, bobbing very slightly. */
export function WelcomeIllustration({ maxHeight }: { maxHeight: number }) {
  const { width } = useWindowDimensions();
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  const bob = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    bob.value = withRepeat(withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(bob);
  }, [bob, reduceMotion]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -3 * bob.value }] }));

  const w = Math.min(width - 24, maxHeight * ILLUSTRATION_RATIO, 520);
  return (
    <Animated.View style={[style, { opacity: theme.scheme === 'dark' ? 0.9 : 1 }]}>
      <Image
        source={ILLUSTRATION}
        style={{ width: w, height: w / ILLUSTRATION_RATIO }}
        contentFit="contain"
        accessibilityLabel="A white rabbit resting on a hill at sunrise"
      />
    </Animated.View>
  );
}

// ---- Google button ---------------------------------------------------------------------------

/** Google's "G" mark, drawn locally (brand asset, used as Google's sign-in guidelines allow). */
export function GoogleMark({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessible={false}>
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </Svg>
  );
}

/**
 * "Continue with Google" as the screen's hero button: a violet → blue cartoon
 * pill with Google's G on a white disc (as Google's branding asks) and an arrow.
 */
export function GoogleButton({
  label = 'Continue with Google',
  busyLabel = 'Opening Google…',
  busy,
  disabled,
  onPress,
}: {
  label?: string;
  busyLabel?: string;
  busy: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const inactive = busy || !!disabled;
  return (
    <CartoonPress
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
      haptic="medium"
      radius={theme.radii.full}
      fill={theme.gradients.aurora}
      style={styles.stretch}
      faceStyle={styles.googleFace}
      accessibilityLabel={label}
      accessibilityState={{ busy }}
    >
      <View style={styles.gDisc}>{busy ? <ActivityIndicator color={theme.colors.primary} /> : <GoogleMark />}</View>
      <Text style={styles.googleLabel} accessible={false} numberOfLines={1}>
        {busy ? busyLabel : label}
      </Text>
      <Icon name="arrow-right" size={20} color="#FFFFFF" />
    </CartoonPress>
  );
}

// ---- Small pieces ----------------------------------------------------------------------------

export function TrustChip({ icon, label, delay = 0 }: { icon: IconName; label: string; delay?: number }) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.delay(delay).springify().damping(16)}
      style={[styles.chip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
    >
      <Icon name={icon} size={13} color={theme.colors.primary} />
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </Animated.View>
  );
}

/** A springy entrance for one block of a screen, `order` steps after the first. */
export function Rise({ order, children, style }: { order: number; children: React.ReactNode; style?: object }) {
  const reduceMotion = useReduceMotion();
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.delay(100 + order * 100).springify().damping(16)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

/** Springs a value to 1 when `active` — for selection rings and checks. */
export function useSelectionSpring(active: boolean) {
  const value = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    value.value = withSpring(active ? 1 : 0, { damping: 14, stiffness: 180 });
  }, [active, value]);
  return value;
}

const styles = StyleSheet.create({
  abs: {
    position: 'absolute',
  },
  dot: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.9,
  },
  stretch: {
    alignSelf: 'stretch',
  },
  logoShadow: {
    shadowColor: '#4B3FD1',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  wordmark: {
    fontFamily: fontFamily.extraBold,
    letterSpacing: -1,
    textAlign: 'center',
  },
  googleFace: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 8,
    paddingRight: 20,
  },
  gDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 17,
    lineHeight: 22,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
});
