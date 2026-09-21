import { BarChart, Text } from '@/components/ui';
import { useAppTheme } from '@/theme';
import { todayIso } from '@/utils/date';

import { ChartCard } from './chart-card';
import { average, indexOfMax, weekdayAverages, WEEKDAY_NAMES } from './insights';

const WEEKS = 12;
const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Which weekdays you actually get things done, averaged over the last 12 weeks. */
export function WeeklyRhythmCard({ totals }: { totals: Record<string, number> }) {
  const theme = useAppTheme();
  const averages = weekdayAverages(totals, todayIso(), WEEKS);
  const best = indexOfMax(averages);
  const mean = average(averages);

  const insight =
    best === null
      ? 'Finish a few tasks or habits and your weekly rhythm shows up here.'
      : mean > 0 && averages[best] > mean * 1.05
        ? `${WEEKDAY_NAMES[best]}s are your power day, ${Math.round((averages[best] / mean - 1) * 100)}% above your average.`
        : 'You spread your work evenly across the week.';

  return (
    <ChartCard title="Weekly rhythm" subtitle={`Average per weekday · last ${WEEKS} weeks`}>
      <BarChart
        values={averages}
        labels={LETTERS}
        gradient={theme.gradients.lavenderPink}
        highlightIndex={best}
        formatValue={(value) => value.toFixed(1)}
        showAverage
        accessibilityLabel={`Average per weekday: ${averages
          .map((value, index) => `${WEEKDAY_NAMES[index]} ${value.toFixed(1)}`)
          .join(', ')}`}
      />
      <Text variant="bodySmall" color="textSecondary">
        {insight}
      </Text>
    </ChartCard>
  );
}
