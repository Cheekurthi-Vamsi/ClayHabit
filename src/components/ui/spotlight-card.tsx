import * as Haptics from '@/lib/haptics';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useAppTheme } from '@/theme';

import { Icon } from './icon';
import { Text } from './text';

export type SpotlightTone = 'highlight' | 'panel';

interface SpotlightCardProps {
  title: string;
  body?: string;
  /** Big figure under the title, e.g. a count. */
  value?: string;
  tone?: SpotlightTone;
  onPress: () => void;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

const RINGS = [34, 58, 82, 106, 130];

/**
 * The lime / ink feature card from images/Dashboard design 3.jpg: bold title,
 * optional big figure, fine concentric rings in the corner and a round arrow.
 */
export function SpotlightCard({ title, body, value, tone = 'highlight', onPress, accessibilityHint, style }: SpotlightCardProps) {
  const theme = useAppTheme();
  const lime = tone === 'highlight';
  const background = lime ? theme.colors.highlight : theme.colors.panel;
  const ink = lime ? theme.colors.onHighlight : theme.colors.onPanel;
  const muted = lime ? 'rgba(20, 21, 18, 0.66)' : theme.colors.onPanelMuted;
  const ring = lime ? 'rgba(20, 21, 18, 0.16)' : 'rgba(189, 216, 233, 0.16)';

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={[title, value, body].filter(Boolean).join('. ')}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.card, { backgroundColor: background, opacity: pressed ? 0.9 : 1 }, style]}
    >
      <Svg width={170} height={170} style={styles.rings} pointerEvents="none">
        {RINGS.map((r) => (
          <Circle key={r} cx={150} cy={150} r={r} stroke={ring} strokeWidth={1.2} fill="none" />
        ))}
      </Svg>
      <Text variant="titleLarge" style={{ color: ink }}>
        {title}
      </Text>
      {value ? <Text style={[styles.value, { color: ink }]}>{value}</Text> : null}
      <View style={styles.footer}>
        {body ? (
          <Text variant="bodySmall" style={[styles.body, { color: muted }]}>
            {body}
          </Text>
        ) : (
          <View style={styles.body} />
        )}
        <View style={[styles.arrow, { backgroundColor: lime ? theme.colors.onHighlight : theme.colors.highlight }]}>
          <Icon name="arrow-up-right" size={18} color={lime ? theme.colors.highlight : theme.colors.onHighlight} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 20,
    gap: 10,
    overflow: 'hidden',
  },
  rings: {
    position: 'absolute',
    right: -40,
    bottom: -40,
  },
  value: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  body: {
    flex: 1,
  },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
