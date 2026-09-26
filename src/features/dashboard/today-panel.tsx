import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';

import { Icon, Skeleton, Text } from '@/components/ui';
import { useCountUp } from '@/hooks/use-count-up';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { fontFamily, useAppTheme } from '@/theme';

import { useTodayProgress } from './hooks';

const TRACK = 52;
const KNOB = 42;
/** Wide enough for "3 of 5 done" to sit on the lime fill; narrower fills put it on the hatching. */
const LABEL_ON_FILL = 150;

/**
 * Today's target as a lime track: the fill is what's done, the hatching what's
 * left. It always says what it shows — "3 of 5 done" and the percentage on a
 * dark knob — so a finished day never reads as an empty bar.
 */
function TargetTrack({ done, total, ratio }: { done: number; total: number; ratio: number }) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(0);
  const fill = useSharedValue(0);
  const percent = Math.round(ratio * 100);

  const target = width ? TRACK + (width - TRACK) * Math.min(1, Math.max(0, ratio)) : 0;
  useEffect(() => {
    if (!target) return;
    fill.value = reduceMotion ? target : withTiming(target, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [fill, reduceMotion, target]);

  const fillStyle = useAnimatedStyle(() => ({ width: fill.value }));
  const labelOnFill = target >= LABEL_ON_FILL;
  const label = `${done} of ${total} done`;

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: theme.colors.panelMuted }]}
    >
      {width > 0 ? (
        <Svg width={width} height={TRACK} style={StyleSheet.absoluteFill}>
          <Defs>
            <Pattern id="target-hatch" width={9} height={9} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <Line x1={0} y1={0} x2={0} y2={9} stroke={theme.colors.onPanelMuted} strokeOpacity={0.2} strokeWidth={3} />
            </Pattern>
          </Defs>
          <Rect width={width} height={TRACK} rx={TRACK / 2} fill="url(#target-hatch)" />
        </Svg>
      ) : null}

      {!labelOnFill ? (
        <Text variant="labelLarge" style={[styles.trackLabel, { left: target + 12, color: theme.colors.onPanel }]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}

      <Animated.View style={[styles.fill, { backgroundColor: theme.colors.highlight }, fillStyle]}>
        {labelOnFill ? (
          <Text variant="labelLarge" style={[styles.fillLabel, { color: theme.colors.onHighlight }]} numberOfLines={1}>
            {label}
          </Text>
        ) : null}
        <View style={[styles.knob, { backgroundColor: theme.colors.panel }]}>
          {percent >= 100 ? (
            <Icon name="check" size={20} color={theme.colors.highlight} />
          ) : (
            <Text style={[styles.knobText, { color: theme.colors.highlight }]}>{percent}%</Text>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

/**
 * The dark panel under the hero (images/Dashboard design 3.jpg, "Your Sales
 * Targets"): today's tasks and habits as one target.
 */
export function TodayPanel({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useAppTheme();
  const router = useRouter();
  const progress = useTodayProgress();
  const done = useCountUp(progress.isLoading ? 0 : progress.done, 900);

  const left = progress.total - progress.done;
  const caption =
    left === 0
      ? 'Everything done. Beautiful day.'
      : `${left} still to go${
          progress.delta !== null ? ` · ${progress.delta >= 0 ? '+' : ''}${progress.delta}% vs yesterday` : ''
        }`;

  return (
    <View style={[styles.panel, { backgroundColor: theme.colors.panel }, style]}>
      <View style={styles.titleRow}>
        <Text variant="labelLarge" style={{ color: theme.colors.onPanelMuted }}>
          Today&apos;s target
        </Text>
        <Text variant="caption" style={{ color: theme.colors.onPanelMuted }}>
          Tasks + habits due today
        </Text>
      </View>

      {progress.isLoading ? (
        <Skeleton height={TRACK} radius={TRACK / 2} />
      ) : progress.total === 0 ? (
        <Pressable
          onPress={() => router.push('/modal/new-task')}
          accessibilityRole="button"
          accessibilityLabel="No target yet. Add a task for today"
          style={({ pressed }) => [
            styles.emptyTrack,
            { borderColor: theme.colors.onPanelMuted, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Icon name="plus-circle" size={18} color={theme.colors.highlight} />
          <Text variant="labelLarge" style={{ color: theme.colors.onPanel }}>
            No target yet · add a task for today
          </Text>
        </Pressable>
      ) : (
        <>
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`Today's target: ${progress.done} of ${progress.total} done`}
            accessibilityValue={{ min: 0, max: progress.total, now: progress.done }}
          >
            <TargetTrack done={progress.done} total={progress.total} ratio={progress.ratio} />
          </View>
          <View style={styles.summary}>
            <Text style={[styles.big, { color: theme.colors.onPanel }]}>
              {Math.round(done)}
              <Text style={[styles.bigOf, { color: theme.colors.onPanelMuted }]}> / {progress.total}</Text>
            </Text>
            <Text variant="bodySmall" style={[styles.caption, { color: theme.colors.onPanelMuted }]}>
              {caption}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 14,
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  track: {
    height: TRACK,
    borderRadius: TRACK / 2,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  trackLabel: {
    position: 'absolute',
    right: 12,
  },
  fill: {
    height: TRACK,
    borderRadius: TRACK / 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 18,
    paddingRight: (TRACK - KNOB) / 2,
    gap: 8,
  },
  fillLabel: {
    flexShrink: 1,
  },
  knob: {
    marginLeft: 'auto',
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobText: {
    fontFamily: fontFamily.extraBold,
    fontSize: 12,
    lineHeight: 16,
    fontVariant: ['tabular-nums'],
  },
  emptyTrack: {
    height: TRACK,
    borderRadius: TRACK / 2,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  big: {
    fontFamily: fontFamily.extraBold,
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  bigOf: {
    fontFamily: fontFamily.semiBold,
    fontSize: 20,
    letterSpacing: 0,
  },
  caption: {
    flex: 1,
  },
});
