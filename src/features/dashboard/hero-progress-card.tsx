import { StyleSheet, View } from 'react-native';

import { GradientCard, Icon, ProgressBar, Skeleton, Text } from '@/components/ui';
import { useCountUp } from '@/hooks/use-count-up';
import { useAppTheme } from '@/theme';

interface HeroProgressCardProps {
  done: number;
  total: number;
  ratio: number;
  delta: number | null;
  loading: boolean;
}

export function HeroProgressCard({ done, total, ratio, delta, loading }: HeroProgressCardProps) {
  const theme = useAppTheme();
  const percent = Math.round(ratio * 100);
  const animatedPercent = useCountUp(loading ? 0 : percent, 1100);

  const summary =
    total === 0
      ? 'Nothing planned yet — add a task or habit to start your day.'
      : done === total
        ? `All ${total} done. Beautiful day.`
        : `${done} of ${total} completed`;

  return (
    <GradientCard
      gradient={theme.gradients.heroSoft}
      orbs="glow"
      glow={false}
      contentStyle={styles.content}
      accessibilityLabel={`Today's progress: ${percent} percent. ${summary}`}
    >
      <View style={styles.labelRow}>
        <Text variant="labelMedium" color="textSecondary">
          TODAY&apos;S PROGRESS
        </Text>
        {delta !== null && total > 0 ? (
          <View
            style={[
              styles.delta,
              { backgroundColor: delta >= 0 ? theme.colors.successMuted : theme.colors.errorMuted },
            ]}
          >
            <Icon
              name={delta >= 0 ? 'trending-up' : 'trending-down'}
              size={12}
              color={delta >= 0 ? theme.colors.success : theme.colors.error}
            />
            <Text
              variant="caption"
              style={{ color: delta >= 0 ? theme.colors.success : theme.colors.error }}
            >
              {delta >= 0 ? '+' : ''}
              {delta}% vs yesterday
            </Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <Skeleton height={64} width={140} radius={12} />
      ) : (
        <View style={styles.percentRow}>
          <Text style={[styles.percent, { color: theme.colors.textPrimary }]}>{Math.round(animatedPercent)}</Text>
          <Text style={[styles.percentSign, { color: theme.colors.primary }]}>%</Text>
        </View>
      )}

      <Text variant="bodyMedium" color="textSecondary">
        {summary}
      </Text>

      <ProgressBar progress={ratio} gradient={theme.gradients.aurora} height={10} duration={1100} />
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 10,
    padding: 22,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  delta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  percentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  percent: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 64,
    lineHeight: 70,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  percentSign: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 28,
    lineHeight: 40,
    marginLeft: 2,
  },
});
