import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Card, Icon, Text } from '@/components/ui';
import type { Task } from '@/domain/entities/task';
import { useAppTheme } from '@/theme';
import { formatTime12h } from '@/utils/date';

import { PRIORITY_COLOR, PRIORITY_LABEL } from '../tasks/task-list-item';

export function NextUpCard({ task, projectName }: { task: Task; projectName: string | null }) {
  const theme = useAppTheme();
  const router = useRouter();
  const time = formatTime12h(task.dueTime);
  const context = [projectName, `${PRIORITY_LABEL[task.priority]} priority`].filter(Boolean).join(' · ');

  return (
    <Card
      onPress={() => router.push(`/task/${task.id}`)}
      accessibilityLabel={`Next up at ${time}: ${task.title}. ${context}`}
      style={styles.card}
    >
      <LinearGradient
        colors={theme.gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.accent}
      />
      <View style={styles.body}>
        <View style={styles.timeRow}>
          <Icon name="clock" size={14} color={theme.colors.primary} />
          <Text variant="labelLarge" color="primary">
            {time}
          </Text>
        </View>
        <Text variant="titleLarge" numberOfLines={2}>
          {task.title}
        </Text>
        <View style={styles.contextRow}>
          <View style={[styles.dot, { backgroundColor: theme.colors[PRIORITY_COLOR[task.priority]] }]} />
          <Text variant="bodySmall" color="textSecondary" numberOfLines={1}>
            {context}
          </Text>
        </View>
      </View>
      <Icon name="chevron-right" size={20} color={theme.colors.textTertiary} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    overflow: 'hidden',
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
