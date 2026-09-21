import { StyleSheet, View } from 'react-native';

import { Card, Skeleton, Text, WeekBarChart } from '@/components/ui';
import { useAppTheme } from '@/theme';

import { useWeekActivity } from './hooks';

export function ProductivityCard({ onPress }: { onPress?: () => void }) {
  const theme = useAppTheme();
  const { values, todayIndex, isLoading } = useWeekActivity();
  const total = values.reduce((sum, value) => sum + value, 0);
  const activeDays = values.filter((value) => value > 0).length;

  return (
    <Card onPress={onPress} accessibilityHint={onPress ? 'Opens your stats' : undefined} style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text variant="labelMedium" color="textSecondary">
            PRODUCTIVITY THIS WEEK
          </Text>
          <Text variant="headlineMedium">
            {total}
            <Text variant="bodyMedium" color="textSecondary">
              {' '}
              done
            </Text>
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: theme.colors.primaryMuted }]}>
          <Text variant="caption" color="primary">
            {activeDays}/7 active days
          </Text>
        </View>
      </View>
      {isLoading ? (
        <Skeleton height={120} radius={theme.radii.md} />
      ) : (
        <WeekBarChart values={values} todayIndex={todayIndex} gradient={theme.gradients.primary} height={104} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
});
