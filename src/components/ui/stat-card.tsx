import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useCountUp } from '@/hooks/use-count-up';
import type { GradientStops } from '@/theme';

import type { OrbPattern } from './decorative-orbs';
import { GradientCard } from './gradient-card';
import { Icon } from './icon';
import { Text } from './text';

interface StatCardProps {
  title: string;
  value: number;
  format?: (value: number) => string;
  /** Percent change vs the comparison period; omitted when there's nothing to compare. */
  delta?: number | null;
  /** When lower is better (e.g. time to finish), a drop reads as good news. */
  invertDelta?: boolean;
  footer?: string;
  gradient: GradientStops;
  orbs?: OrbPattern;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Gradient KPI tile: title, animated value, change badge, and a comparison footer. */
export function StatCard({
  title,
  value,
  format = (v) => Math.round(v).toLocaleString(),
  delta,
  invertDelta = false,
  footer,
  gradient,
  orbs = 'bubbles',
  onPress,
  style,
}: StatCardProps) {
  const animated = useCountUp(value);
  const hasDelta = typeof delta === 'number' && Number.isFinite(delta);
  const up = hasDelta && delta >= 0;
  const good = hasDelta && (invertDelta ? !up : up);

  return (
    <GradientCard
      gradient={gradient}
      orbs={orbs}
      onPress={onPress}
      style={style}
      contentStyle={styles.content}
      accessibilityLabel={`${title}: ${format(value)}${hasDelta ? `, ${up ? 'up' : 'down'} ${Math.abs(Math.round(delta))} percent` : ''}`}
    >
      <Text variant="labelMedium" style={styles.title}>
        {title.toUpperCase()}
      </Text>
      <View style={styles.valueRow}>
        <Text variant="headlineLarge" style={styles.value}>
          {format(animated)}
        </Text>
        {hasDelta ? (
          <View style={[styles.badge, !good && styles.badgeMuted]}>
            <Icon name={up ? 'arrow-up' : 'arrow-down'} size={11} color="#FFFFFF" />
            <Text variant="caption" style={styles.badgeText}>
              {Math.abs(Math.round(delta))}%
            </Text>
          </View>
        ) : null}
      </View>
      {footer ? (
        <View style={styles.footer}>
          <Text variant="caption" style={styles.footerText} numberOfLines={1}>
            {footer}
          </Text>
        </View>
      ) : null}
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 10,
  },
  title: {
    color: 'rgba(255,255,255,0.88)',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  value: {
    color: '#FFFFFF',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  badgeMuted: {
    backgroundColor: 'rgba(0,0,0,0.16)',
  },
  badgeText: {
    color: '#FFFFFF',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.3)',
    paddingTop: 8,
  },
  footerText: {
    color: 'rgba(255,255,255,0.85)',
  },
});
