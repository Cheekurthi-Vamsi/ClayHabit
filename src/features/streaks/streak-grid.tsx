import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useAppTheme } from '@/theme';
import type { ContributionDay } from '@/domain/services/streak-engine';

interface StreakGridProps {
  columns: ContributionDay[][];
}

const CELL_SIZE = 13;
const CELL_GAP = 4;

export function StreakGrid({ columns }: StreakGridProps) {
  const theme = useAppTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      {columns.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.column}>
          {week.map((day) => (
            <Animated.View
              key={day.date}
              entering={FadeIn.delay(weekIndex * 12).duration(theme.motion.duration.fast)}
              style={[
                styles.cell,
                {
                  backgroundColor: day.isFuture
                    ? 'transparent'
                    : day.completed
                      ? theme.colors.primary
                      : theme.colors.surfaceMuted,
                  borderWidth: day.isToday ? 1.5 : 0,
                  borderColor: theme.colors.primary,
                },
              ]}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: CELL_GAP,
    paddingVertical: 4,
  },
  column: {
    gap: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 4,
  },
});
