import './dashboard.css';

import { useUser } from '@clerk/react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronRight,
  Clock,
  FileText,
  Flame,
  Lock,
  PenLine,
  PiggyBank,
  Play,
  PlusCircle,
  Target,
  Timer,
} from 'lucide-react';
import { useMemo, type CSSProperties } from 'react';
import { useNavigate } from 'react-router';

import type { NoteSummary } from '@/domain/entities/note';
import type { TaskPriority } from '@/domain/entities/task';
import { isScheduledOn } from '@/domain/services/habit-engine';
import { buildCalendarColumns, relativeLevel } from '@/domain/services/heatmap';
import { rankLevels } from '@/domain/finance/analytics';
import { formatMoney } from '@/domain/finance/currency';
import { useActivity, useTodayProgress, useWeekComparison } from '@/features/dashboard/hooks';
import { useCurrency, useFinanceOverview, useFinanceStats } from '@/features/finance/hooks';
import { useFocusByDay } from '@/features/stats/hooks';
import { currentTimeHHmm, pickNextUp } from '@/features/dashboard/progress';
import { useRecentFocusSessions, useTodayFocusMinutes } from '@/features/focus/hooks';
import { useHabits } from '@/features/habits/hooks';
import { useCreateNote, useNotes } from '@/features/notes/hooks';
import { useOverallStreak } from '@/features/streaks/hooks';
import { useCreateTask, useProjects, useTodayTasks } from '@/features/tasks/hooks';
import { addDaysIso, formatRelativeTime, greetingForHour, todayIso } from '@/utils/date';

import { Heatmap, HeatmapLegend } from '../../../components/heatmap';
import { Button, IconButton, Skeleton } from '../../../components/ui';
import { useDocumentTitle } from '../../../lib/use-document-title';
import { EmptyState, HabitRow, QuickAdd, TaskRow, timeLabel } from '../app-components';
import { usePhonePrefs } from '../session-context';

/*
 * The phone's dashboard (src/features/dashboard), laid out for a wide screen:
 * the soft hero sheet with the greeting, the lime streak card and the dark
 * focus card; the dark "Today's target" panel; the week in columns; then
 * the day's tasks, habits and latest note, and the year's activity grid.
 */

/** Dark ink on the lime card, as on the phone. */
const INK = '#141512';
/** The phone's StreakCard cell opacities (level 0 → 4). */
const STREAK_CELL_OPACITY = [0.1, 0.3, 0.5, 0.72, 1];
const PRIORITY_LABEL: Record<TaskPriority, string> = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const YEAR_WEEKS = 53;
/** The Money and Focus cards' grids: about four months, like the phone's habit card. */
const CARD_WEEKS = 17;

// ---- Hero: header, streak, focus ----------------------------------------------------------------

function StreakCard({ onOpen }: { onOpen: () => void }) {
  const today = todayIso();
  const columns = useMemo(() => buildCalendarColumns(4, today), [today]);
  const { data: streak } = useOverallStreak();
  const { data: activity } = useActivity(columns[0]![0]!.date, today);
  const current = streak?.current ?? 0;
  const max = Math.max(0, ...Object.values(activity?.total ?? {}));

  return (
    <button type="button" className="dash-streak" onClick={onOpen} aria-label={`Current streak: ${current} days. Best: ${streak?.best ?? 0}. Opens your stats.`}>
      <span className="dash-card-label">🔥 Streak</span>
      <span>
        <span className="dash-streak__number num">{current}</span>
        <span className="dash-card-label">
          {current === 1 ? 'Day' : 'Days'} · Best {streak?.best ?? 0}
        </span>
      </span>
      <span className="dash-streak__grid" aria-hidden>
        {columns.map((week) => (
          <span key={week[0]!.date} className="dash-streak__row">
            {week.map((cell) => (
              <span
                key={cell.date}
                className="dash-streak__cell"
                style={{
                  background: INK,
                  opacity: cell.isFuture ? 0.04 : STREAK_CELL_OPACITY[relativeLevel(activity?.total[cell.date] ?? 0, max)],
                  boxShadow: cell.isToday ? `0 0 0 1.5px ${INK}` : undefined,
                }}
              />
            ))}
          </span>
        ))}
      </span>
    </button>
  );
}

function FocusNowCard({ onStart }: { onStart: () => void }) {
  const prefs = usePhonePrefs();
  const minutes = typeof prefs.defaultFocusMinutes === 'number' ? prefs.defaultFocusMinutes : 25;
  const { data: focused } = useTodayFocusMinutes();
  return (
    <div className="dash-focus">
      <span className="dash-card-label" style={{ color: 'var(--color-on-panel-muted)' }}>
        ⚡ Focus
      </span>
      <span>
        <span className="dash-focus__clock num">{String(minutes).padStart(2, '0')}:00</span>
        <span className="t-caption" style={{ color: 'var(--color-on-panel-muted)', display: 'block' }}>
          {focused ? `${focused} min today` : 'Ready to focus?'}
        </span>
      </span>
      <Button variant="glass" size="sm" fullWidth icon={<Play size={16} />} onClick={onStart}>
        Start
      </Button>
    </div>
  );
}

// ---- Today's target (the dark panel) ---------------------------------------------------------------

function TodayPanel({ onAdd }: { onAdd: () => void }) {
  const progress = useTodayProgress();
  const percent = Math.round(progress.ratio * 100);
  const left = progress.total - progress.done;
  const caption =
    left === 0
      ? 'Everything done. Beautiful day.'
      : `${left} still to go${progress.delta !== null ? ` · ${progress.delta >= 0 ? '+' : ''}${progress.delta}% vs yesterday` : ''}`;

  return (
    <section className="dash-panel" aria-labelledby="target-title">
      <div className="row row--between">
        <h2 id="target-title" className="t-label-lg" style={{ color: 'var(--color-on-panel-muted)' }}>
          Today’s target
        </h2>
        <span className="t-caption" style={{ color: 'var(--color-on-panel-muted)' }}>
          Tasks + habits due today
        </span>
      </div>
      {progress.isLoading ? (
        <Skeleton height={52} radius={26} />
      ) : progress.total === 0 ? (
        <button type="button" className="dash-target-empty" onClick={onAdd}>
          <PlusCircle size={18} color="var(--color-highlight)" />
          No target yet · add a task for today
        </button>
      ) : (
        <>
          <div
            className="dash-target"
            role="progressbar"
            aria-label={`Today's target: ${progress.done} of ${progress.total} done`}
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.done}
            style={{ '--ratio': Math.min(1, Math.max(0, progress.ratio)) } as CSSProperties}
          >
            <span className="dash-target__fill">
              <span className="dash-target__label">
                {progress.done} of {progress.total} done
              </span>
              <span className="dash-target__knob num">{percent >= 100 ? <Check size={20} strokeWidth={3} /> : `${percent}%`}</span>
            </span>
          </div>
          <div className="row" style={{ alignItems: 'baseline', gap: 14 }}>
            <span className="dash-panel__big num">
              {progress.done}
              <span style={{ color: 'var(--color-on-panel-muted)', fontSize: '0.55em' }}> / {progress.total}</span>
            </span>
            <span className="t-body-sm" style={{ color: 'var(--color-on-panel-muted)' }}>
              {caption}
            </span>
          </div>
        </>
      )}
    </section>
  );
}

// ---- The week as columns ---------------------------------------------------------------------------

function WeekColumns() {
  const week = useWeekComparison();
  const max = Math.max(1, ...week.values);
  return (
    <section className="dash-card" aria-labelledby="week-title">
      <div className="section-head" style={{ marginBottom: 8 }}>
        <h2 id="week-title">This week</h2>
        <span className="t-label-md c-tertiary num">
          {week.total} done{week.change === null ? '' : ` · ${week.change >= 0 ? '+' : ''}${week.change}`}
        </span>
      </div>
      <div className="week-cols" role="img" aria-label={`Completed this week: ${week.values.join(', ')}`}>
        {week.values.map((value, index) => {
          const future = week.todayIndex >= 0 && index > week.todayIndex;
          const ratio = future ? 0.16 : Math.max(0.16, value / max);
          const kind = index === week.todayIndex ? 'today' : future ? 'future' : 'past';
          return (
            <span key={index} className="week-cols__col">
              <span className={`week-cols__bar week-cols__bar--${kind}`} style={{ height: `${ratio * 100}%` }} title={`${value}`} />
            </span>
          );
        })}
      </div>
      <div className="week-cols__labels">
        {DAY_LETTERS.map((letter, index) => (
          <span key={index} className={index === week.todayIndex ? 'week-cols__label--today' : ''}>
            {letter}
          </span>
        ))}
      </div>
    </section>
  );
}

// ---- Money and Focus: the other two spaces, with their own heatmaps ------------------------------

function MoneyCard({ onOpen }: { onOpen: () => void }) {
  const today = todayIso();
  const currency = useCurrency();
  const { data: overview } = useFinanceOverview();
  const { data: stats } = useFinanceStats({ scope: 'year', year: new Date().getFullYear() });
  const columns = useMemo(() => buildCalendarColumns(CARD_WEEKS, today), [today]);
  const dailySpend = useMemo(() => stats?.dailySpend ?? {}, [stats]);
  // The phone's spending calendar: days ranked against each other, in the expense colour.
  const levelOf = useMemo(() => rankLevels(Object.values(dailySpend)), [dailySpend]);
  const money = (minor: number) => formatMoney(minor, currency);
  const budget = overview?.budgets.overall ?? overview?.budgets.lines[0] ?? null;

  return (
    <section className="dash-card dash-duo__card" aria-labelledby="money-title">
      <div className="section-head">
        <h2 id="money-title" className="row" style={{ gap: 8 }}>
          <span className="dash-duo__icon dash-duo__icon--money" aria-hidden>
            <PiggyBank size={17} />
          </span>
          Money
        </h2>
        <button type="button" className="link" onClick={onOpen}>
          Open Money
        </button>
      </div>

      <div className="dash-duo__figures">
        <div className="stat">
          <span className="stat__label c-secondary">Available</span>
          <span className="dash-duo__value num">{overview ? money(overview.available) : '—'}</span>
        </div>
        <div className="stat">
          <span className="stat__label c-secondary">
            <ArrowDownLeft size={13} style={{ verticalAlign: -2 }} /> In
          </span>
          <span className="dash-duo__value dash-duo__value--sm amount-in num">{overview ? money(overview.summary.income) : '—'}</span>
        </div>
        <div className="stat">
          <span className="stat__label c-secondary">
            <ArrowUpRight size={13} style={{ verticalAlign: -2 }} /> Out
          </span>
          <span className="dash-duo__value dash-duo__value--sm num">{overview ? money(overview.summary.expense) : '—'}</span>
        </div>
      </div>

      {/* One line kept for the budget either way, so the card's height never depends on it. */}
      <div className="dash-duo__line">
        {budget ? (
          <>
            <div className="row row--between">
              <span className="t-label-md">
                {budget.emoji} {budget.categoryId ? budget.name : 'Month budget'}
              </span>
              <span
                className="t-label-md num"
                style={{ color: budget.usage.remainingMinor < 0 ? 'var(--color-error)' : 'var(--color-text-secondary)' }}
              >
                {budget.usage.remainingMinor < 0 ? `${money(-budget.usage.remainingMinor)} over` : `${money(budget.usage.remainingMinor)} left`}
              </span>
            </div>
            <div className="bar">
              <span
                style={
                  {
                    '--value': Number.isFinite(budget.usage.ratio) ? Math.min(1, budget.usage.ratio) : 1,
                    background: budget.usage.remainingMinor < 0 ? 'var(--color-error)' : 'var(--color-finance)',
                  } as CSSProperties
                }
              />
            </div>
          </>
        ) : (
          <span className="t-body-sm c-tertiary">No budget yet. Set one in the phone app to see what’s left here.</span>
        )}
      </div>

      <div className="dash-duo__grid">
        <span className="t-label-md c-secondary">Spending by day</span>
        <Heatmap
          columns={columns}
          levelFor={(date) => levelOf(dailySpend[date] ?? 0)}
          color="var(--color-chart-expense)"
          cellSize={11}
          showMonthLabels
          scrollable
          titleFor={(date) => `${date}: ${dailySpend[date] ? money(dailySpend[date]) : 'nothing spent'}`}
          label="Spending per day"
        />
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <HeatmapLegend color="var(--color-chart-expense)" />
        </div>
      </div>
    </section>
  );
}

function FocusCard({ onOpen }: { onOpen: () => void }) {
  const today = todayIso();
  const prefs = usePhonePrefs();
  const length = typeof prefs.defaultFocusMinutes === 'number' ? prefs.defaultFocusMinutes : 25;
  const columns = useMemo(() => buildCalendarColumns(CARD_WEEKS, today), [today]);
  const { data: byDay } = useFocusByDay(columns[0]![0]!.date, today);
  const { data: todayMinutes } = useTodayFocusMinutes();
  const { data: recent } = useRecentFocusSessions();
  const minutes = byDay ?? {};
  const max = Math.max(0, ...Object.values(minutes));
  const weekStart = addDaysIso(today, -6);
  const weekMinutes = Object.entries(minutes)
    .filter(([date]) => date >= weekStart)
    .reduce((sum, [, value]) => sum + value, 0);
  const finished = (recent ?? []).filter((session) => session.isCompleted).length;

  return (
    <section className="dash-card dash-duo__card" aria-labelledby="focus-title">
      <div className="section-head">
        <h2 id="focus-title" className="row" style={{ gap: 8 }}>
          <span className="dash-duo__icon" aria-hidden>
            <Timer size={17} />
          </span>
          Focus
        </h2>
        <button type="button" className="link" onClick={onOpen}>
          Open Focus
        </button>
      </div>

      <div className="dash-duo__figures">
        <div className="stat">
          <span className="stat__label c-secondary">Today</span>
          <span className="dash-duo__value num">
            {todayMinutes ?? 0}
            <span className="dash-duo__unit">min</span>
          </span>
        </div>
        <div className="stat">
          <span className="stat__label c-secondary">Last 7 days</span>
          <span className="dash-duo__value dash-duo__value--sm num">
            {Math.floor(weekMinutes / 60)}h {weekMinutes % 60}m
          </span>
        </div>
        <div className="stat">
          <span className="stat__label c-secondary">Finished</span>
          <span className="dash-duo__value dash-duo__value--sm num">{finished} recent</span>
        </div>
      </div>

      <div className="dash-duo__line">
        <Button size="sm" icon={<Play size={16} />} onClick={onOpen} style={{ justifySelf: 'start' }}>
          Start {length} min
        </Button>
      </div>

      <div className="dash-duo__grid">
        <span className="t-label-md c-secondary">Minutes focused by day</span>
        <Heatmap
          columns={columns}
          levelFor={(date) => relativeLevel(minutes[date] ?? 0, max)}
          color="var(--color-secondary)"
          cellSize={11}
          showMonthLabels
          scrollable
          titleFor={(date) => `${date}: ${minutes[date] ?? 0} min`}
          label="Focus minutes per day"
        />
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <HeatmapLegend color="var(--color-secondary)" />
        </div>
      </div>
    </section>
  );
}

// ---- Page ----------------------------------------------------------------------------------------

export function DashboardPage() {
  useDocumentTitle('Today — ClayHabbit');
  const navigate = useNavigate();
  const prefs = usePhonePrefs();
  const { user } = useUser();
  const today = todayIso();

  const { data: tasks, isLoading } = useTodayTasks();
  const { data: habits } = useHabits();
  const { data: projects } = useProjects();
  const { data: notes } = useNotes('active');
  const createTask = useCreateTask();
  const createNote = useCreateNote();

  const yearColumns = useMemo(() => buildCalendarColumns(YEAR_WEEKS, today), [today]);
  const year = useActivity(yearColumns[0]![0]!.date, today);
  const yearMax = Math.max(0, ...Object.values(year.data?.total ?? {}));
  const yearTotal = Object.values(year.data?.total ?? {}).reduce((sum, value) => sum + value, 0);

  const localName = typeof prefs.displayName === 'string' ? prefs.displayName.trim() : '';
  const firstName = (localName || user?.firstName || user?.fullName || '').split(/\s+/)[0];
  const now = new Date();

  const nextUp = pickNextUp(tasks ?? [], currentTimeHHmm());
  const projectName = (id: string | null) => (id ? (projects?.find((project) => project.id === id)?.name ?? null) : null);
  const openTasks = (tasks ?? []).filter((task) => !task.isCompleted);
  const doneTasks = (tasks ?? []).filter((task) => task.isCompleted);
  const dashboardHabits = [...(habits ?? [])]
    .sort((a, b) => Number(isScheduledOn(b.daysOfWeek, today)) - Number(isScheduledOn(a.daysOfWeek, today)))
    .slice(0, 4);
  const latestNote = (notes ?? []).reduce<NoteSummary | null>((latest, note) => (!latest || note.updatedAt > latest.updatedAt ? note : latest), null);

  const focusQuickAdd = () => document.getElementById('quick-add')?.querySelector('input')?.focus();

  return (
    <div className="page dash">
      {/* The light hero sheet. */}
      <section className="dash-hero" aria-labelledby="dash-title">
        <div className="dash-hero__head">
          <div className="dash-hero__text">
            <h1 id="dash-title" className="dash-hero__title">
              {firstName ? `Hi ${firstName}, ` : 'Hi there, '}
              <em>here’s</em>
              <br />
              what’s on today.
            </h1>
            <p className="t-body-md c-secondary">
              {greetingForHour(now.getHours())} · {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="row" style={{ gap: 10, alignSelf: 'flex-start' }}>
            <IconButton label="Calendar" onClick={() => navigate('/app/calendar')}>
              <CalendarDays size={19} />
            </IconButton>
            <IconButton label="Goals" onClick={() => navigate('/app/goals')}>
              <Target size={19} />
            </IconButton>
          </div>
        </div>
        <div className="dash-hero__cards">
          <StreakCard onOpen={() => navigate('/app/stats')} />
          <FocusNowCard onStart={() => navigate('/app/focus')} />
          <div className="dash-hero__panel">
            <TodayPanel onAdd={focusQuickAdd} />
          </div>
        </div>
      </section>

      <div className="dash-grid">
        <div className="stack">
          {nextUp ? (
            <button type="button" className="dash-card dash-next" onClick={() => navigate('/app/tasks')}>
              <span className="dash-next__accent" aria-hidden />
              <span className="stack-sm" style={{ gap: 4, flex: 1, minWidth: 0 }}>
                <span className="row t-label-lg c-primary" style={{ gap: 6 }}>
                  <Clock size={14} />
                  Next up · {timeLabel(nextUp.dueTime)}
                </span>
                <span className="dash-next__title">{nextUp.title}</span>
                <span className="t-body-sm c-secondary">
                  {[projectName(nextUp.projectId), `${PRIORITY_LABEL[nextUp.priority]} priority`].filter(Boolean).join(' · ')}
                </span>
              </span>
              <ChevronRight size={20} className="c-tertiary" />
            </button>
          ) : null}

          <section className="dash-card dash-fill" aria-labelledby="today-title">
            <div className="section-head">
              <h2 id="today-title">Today</h2>
              <button type="button" className="link" onClick={() => navigate('/app/tasks')}>
                See all
              </button>
            </div>
            <div id="quick-add" style={{ marginBottom: 14 }}>
              <QuickAdd placeholder="Add a task for today" onAdd={(title) => createTask.mutateAsync({ title, dueDate: today })} />
            </div>
            {isLoading ? (
              <Skeleton height={180} />
            ) : openTasks.length + doneTasks.length === 0 ? (
              <EmptyState icon={CheckSquare} title="A clear day" body="Nothing is due today. Add one small step above." />
            ) : (
              <ul className="list">
                {[...openTasks, ...doneTasks].slice(0, 7).map((task) => (
                  <TaskRow key={task.id} task={task} projectName={projectName(task.projectId)} onOpen={() => navigate('/app/tasks')} />
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="stack">
          <WeekColumns />

          <section className="dash-card" aria-labelledby="habits-title">
            <div className="section-head">
              <h2 id="habits-title">Habits</h2>
              <button type="button" className="link" onClick={() => navigate('/app/habits')}>
                See all
              </button>
            </div>
            {dashboardHabits.length === 0 ? (
              <EmptyState
                icon={Flame}
                title="No habits yet"
                body="Start one small habit and watch the streak grow."
                action={
                  <Button size="sm" onClick={() => navigate('/app/habits')}>
                    Add a habit
                  </Button>
                }
              />
            ) : (
              <div className="stack-sm">
                {dashboardHabits.map((habit) => (
                  <HabitRow key={habit.id} habit={habit} showWeek={false} />
                ))}
              </div>
            )}
          </section>

          <button
            type="button"
            className="dash-card dash-note"
            onClick={() =>
              latestNote
                ? navigate(`/app/notes/${latestNote.id}`)
                : createNote.mutate(undefined, { onSuccess: (created) => navigate(`/app/notes/${created.id}`) })
            }
          >
            <span className="dash-note__icon" aria-hidden>
              {latestNote ? latestNote.isLocked ? <Lock size={18} /> : <FileText size={18} /> : <PenLine size={18} />}
            </span>
            <span className="stack-sm" style={{ gap: 3, minWidth: 0 }}>
              <span className="dash-note__title">{latestNote ? (latestNote.isLocked ? 'Locked note' : latestNote.title || 'Untitled') : 'Capture a thought'}</span>
              <span className="t-body-sm c-secondary dash-note__preview">
                {latestNote ? (latestNote.isLocked ? 'Opens on your phone' : latestNote.excerpt || 'No additional text') : 'Click to start a new note.'}
              </span>
              {latestNote ? <span className="t-caption c-tertiary">Updated {formatRelativeTime(latestNote.updatedAt).toLowerCase()}</span> : null}
            </span>
          </button>
        </div>
      </div>

      {/* Money and Focus side by side, the same height, so nothing is left empty. */}
      <div className="dash-duo">
        <MoneyCard onOpen={() => navigate('/app/money')} />
        <FocusCard onOpen={() => navigate('/app/focus')} />
      </div>

      {/* The year's activity: the phone's Stats heatmap. */}
      <section className="dash-card" aria-labelledby="year-title">
        <div className="section-head">
          <h2 id="year-title">Your year</h2>
          <span className="t-label-md c-tertiary num">{yearTotal} completed in the last 12 months</span>
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
          label="Tasks and habits completed each day over the last year"
        />
        <div className="row row--between" style={{ marginTop: 12 }}>
          <span className="t-caption c-tertiary">Tasks and habits completed each day</span>
          <HeatmapLegend color="var(--color-primary)" />
        </div>
      </section>
    </div>
  );
}
