import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Card, ProgressBar, Text } from '@/components/ui';
import type { GoalWithProgress } from '@/domain/entities/goal';

interface GoalCardProps {
  goal: GoalWithProgress;
}

export function GoalCard({ goal }: GoalCardProps) {
  const router = useRouter();
  const progress = goal.taskCount === 0 ? 0 : goal.completedTaskCount / goal.taskCount;

  return (
    <Card onPress={() => router.push(`/goal/${goal.id}`)} accessibilityLabel={goal.title} style={styles.card}>
      <Text variant="titleMedium" numberOfLines={1}>
        {goal.title}
      </Text>
      <ProgressBar progress={progress} />
      <View style={styles.footer}>
        <Text variant="bodySmall" color="textSecondary">
          {Math.round(progress * 100)}% · {goal.completedTaskCount}/{goal.taskCount} tasks
        </Text>
        {goal.deadline && (
          <Text variant="bodySmall" color="textTertiary">
            Due {goal.deadline}
          </Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
