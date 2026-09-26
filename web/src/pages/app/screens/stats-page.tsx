import { useState, type CSSProperties } from 'react';

import { useActivity } from '@/features/dashboard/hooks';
import { useCompletionHours, useFocusByDay, usePriorityBreakdown } from '@/features/stats/hooks';
import { useOverallStreak } from '@/features/streaks/hooks';
import { buildCalendarColumns, relativeLevel } from '@/domain/services/heatmap';
import { addDaysIso, todayIso } from '@/utils/date';

import { Heatmap, HeatmapLegend } from '../../../components/heatmap';
import { Card, Segmented } from '../../../components/ui';
import { useDocumentTitle } from '../../../lib/use-document-title';

type Range = '7' | '30' | '90';
const RANGES = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
] as const;

const PRIORITY_COLORS = { urgent: 'var(--color-error)', high: 'var(--color-warning)', medium: 'var(--color-accent-lavender)', low: 'var(--color-text-tertiary)' };

function Bars({ values, labels, highlight }: { values: number[]; labels: string[]; highlight?: number }) {
  const max = Math.max(1, ...values);
  return (
    <div className="bars">
      {values.map((value, index) => (
        <div key={index} className="bars__col" title={`${labels[index]}: ${value}`}>
          <div className="bars__track">
            <span className={`bars__fill${index === highlight ? ' bars__fill--hi' : ''}`} style={{ '--value': value / max } as CSSProperties} />
          </div>
          <span className="bars__label">{labels[index]}</span>
        </div>
      ))}
    </div>
  );
}

export function StatsPage() {
  useDocumentTitle('Stats — ClayHabbit');
  const [range, setRange] = useState<Range>('30');
  const today = todayIso();
  const days = Number(range);
  const since = addDaysIso(today, -(days - 1));

  const streak = useOverallStreak();
  const activity = useActivity(since, today);
  const priority = usePriorityBreakdown(since);
  const hours = useCompletionHours(since);
  const focus = useFocusByDay(since, today);

  const total = activity.data?.total ?? {};
  const tasksDone = Object.values(activity.data?.tasks ?? {}).reduce((sum, value) => sum + value, 0);
  const habitsDone = Object.values(activity.data?.habits ?? {}).reduce((sum, value) => sum + value, 0);
  const focusMinutes = Object.values(focus.data ?? {}).reduce((sum, value) => sum + value, 0);
  const activeDays = Object.values(total).filter((value) => value > 0).length;

  // The year as the phone's Stats heatmap: 53 Monday-first weeks, levels relative to the busiest day.
  const yearColumns = buildCalendarColumns(53, today);
  const year = useActivity(yearColumns[0]![0]!.date, today);
  const yearMax = Math.max(0, ...Object.values(year.data?.total ?? {}));

  // Weekday rhythm over the range.
  const byWeekday = [0, 0, 0, 0, 0, 0, 0];
  for (const [iso, value] of Object.entries(total)) {
    const index = (new Date(`${iso}T00:00:00`).getDay() + 6) % 7;
    byWeekday[index]! += value;
  }
  const hourValues = hours.data ?? Array.from({ length: 24 }, () => 0);
  const blocks = [0, 4, 8, 12, 16, 20].map((start) => hourValues.slice(start, start + 4).reduce((a, b) => a + b, 0));

  const priorityTotal = Object.values(priority.data ?? {}).reduce((sum, value) => sum + value, 0);

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="serif">Stats</h1>
        <Segmented label="Range" options={RANGES} value={range} onChange={setRange} />
      </div>

      <div className="grid-4">
        <Card tone="lime" style={{ minHeight: 140 }}>
          <div className="stat">
            <span className="stat__label">Current streak</span>
            <span className="stat__value">{streak.data?.current ?? 0}</span>
            <span className="stat__hint">Best {streak.data?.best ?? 0} days</span>
          </div>
        </Card>
        <Card style={{ minHeight: 140 }}>
          <div className="stat">
            <span className="stat__label c-secondary">Tasks done</span>
            <span className="stat__value">{tasksDone}</span>
            <span className="stat__hint c-secondary">in {days} days</span>
          </div>
        </Card>
        <Card style={{ minHeight: 140 }}>
          <div className="stat">
            <span className="stat__label c-secondary">Habit check-ins</span>
            <span className="stat__value">{habitsDone}</span>
            <span className="stat__hint c-secondary">
              {activeDays} active day{activeDays === 1 ? '' : 's'}
            </span>
          </div>
        </Card>
        <Card tone="panel" style={{ minHeight: 140 }}>
          <div className="stat">
            <span className="stat__label">Focus</span>
            <span className="stat__value">
              {Math.floor(focusMinutes / 60)}
              <span style={{ fontSize: 18 }}>h</span> {focusMinutes % 60}
              <span style={{ fontSize: 18 }}>m</span>
            </span>
            <span className="stat__hint">in {days} days</span>
          </div>
        </Card>
      </div>

      <Card>
        <div className="section-head">
          <h2>Your year</h2>
          <span className="t-label-md c-tertiary">Tasks and habits completed each day</span>
        </div>
        <Heatmap
          columns={yearColumns}
          levelFor={(date) => relativeLevel(year.data?.total[date] ?? 0, yearMax)}
          color="var(--color-primary)"
          cellSize={13}
          gap={4}
          showMonthLabels
          showWeekdayLabels
          scrollable
          titleFor={(date) => `${date}: ${year.data?.total[date] ?? 0} completed`}
          label="Activity over the last year"
        />
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
          <HeatmapLegend color="var(--color-primary)" />
        </div>
      </Card>

      <div className="grid-3">
        <Card>
          <div className="section-head">
            <h2>Weekly rhythm</h2>
          </div>
          <Bars values={byWeekday} labels={['M', 'T', 'W', 'T', 'F', 'S', 'S']} highlight={byWeekday.indexOf(Math.max(...byWeekday))} />
        </Card>
        <Card>
          <div className="section-head">
            <h2>Time of day</h2>
          </div>
          <Bars values={blocks} labels={['12a', '4a', '8a', '12p', '4p', '8p']} highlight={blocks.indexOf(Math.max(...blocks))} />
        </Card>
        <Card>
          <div className="section-head">
            <h2>By priority</h2>
          </div>
          <div className="stack-sm">
            {(['urgent', 'high', 'medium', 'low'] as const).map((key) => {
              const value = priority.data?.[key] ?? 0;
              return (
                <div key={key} style={{ display: 'grid', gap: 6 }}>
                  <div className="row row--between">
                    <span className="t-label-lg" style={{ textTransform: 'capitalize' }}>
                      {key}
                    </span>
                    <span className="t-label-md c-secondary num">{value}</span>
                  </div>
                  <div className="bar">
                    <span style={{ '--value': priorityTotal ? value / priorityTotal : 0, background: PRIORITY_COLORS[key] } as CSSProperties} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
