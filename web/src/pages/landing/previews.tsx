import {
  BarChart3,
  CalendarDays,
  Check,
  CheckSquare,
  Flame,
  Home,
  NotebookPen,
  PiggyBank,
} from 'lucide-react';
import type { CSSProperties } from 'react';

import type { HeatmapLevel } from '@/domain/services/habit-engine';
import { buildCalendarColumns } from '@/domain/services/heatmap';
import { habitPalette } from '@/theme/habit-palette';
import { toLocalIsoDate } from '@/utils/date';

import { HabitGlyph } from '../../components/habit-glyph';
import { Heatmap, HeatmapLegend } from '../../components/heatmap';
import { Logo, ProgressRing } from '../../components/ui';

const HEATMAP_WEEKS = 34;

/*
 * Live previews for the landing page: real layouts drawn with demo data, not
 * screenshots, so they stay crisp, follow the theme and never load late.
 * Everything is deterministic (no random), so nothing changes between renders.
 */

/** A fixed pseudo-random sequence (so the heatmap looks lived-in but never changes). */
function seeded(count: number, seed = 7): number[] {
  const values: number[] = [];
  let state = seed;
  for (let i = 0; i < count; i++) {
    state = (state * 16807) % 2147483647;
    values.push(state / 2147483647);
  }
  return values;
}

// ---- Laptop: the web app's dashboard ------------------------------------------------------------

export function LaptopDashboard() {
  return (
    <div className="mini" aria-hidden>
      <div className="mini-app">
        <div className="mini-side">
          <div className="mini-side__brand">
            <Logo size={16} />
            ClayHabbit
          </div>
          {[
            { icon: Home, label: 'Today', active: true },
            { icon: CheckSquare, label: 'Tasks' },
            { icon: Flame, label: 'Habits' },
            { icon: NotebookPen, label: 'Notes' },
            { icon: CalendarDays, label: 'Calendar' },
            { icon: PiggyBank, label: 'Money' },
            { icon: BarChart3, label: 'Stats' },
          ].map(({ icon: Icon, label, active }) => (
            <div key={label} className={`mini-side__item${active ? ' mini-side__item--active' : ''}`}>
              <Icon size={11} strokeWidth={2.4} />
              {label}
            </div>
          ))}
        </div>
        <div className="mini-main">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--color-text-tertiary)' }}>SATURDAY, 26 SEPTEMBER</div>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em' }}>Good morning, Alex</div>
            </div>
            <span className="mini-card mini-card--lime" style={{ padding: '4px 8px', borderRadius: 999, fontWeight: 800, fontSize: 9 }}>
              Synced ✓
            </span>
          </div>
          <div className="mini-row" style={{ gridTemplateColumns: '1.2fr 1fr 1fr' }}>
            <div className="mini-card mini-card--lime">
              <div className="mini-label">Streak</div>
              <div className="mini-big">
                24 <span style={{ fontSize: 10, fontWeight: 700 }}>days</span>
              </div>
              <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
                {[1, 1, 1, 1, 1, 1, 0.35].map((o, i) => (
                  <span key={i} style={{ flex: 1, height: 16, borderRadius: 4, background: '#141512', opacity: o }} />
                ))}
              </div>
            </div>
            <div className="mini-card mini-card--panel">
              <div className="mini-label">Today</div>
              <div className="mini-big">
                5<span style={{ fontSize: 11, opacity: 0.6 }}>/7</span>
              </div>
              <div style={{ fontSize: 8.5, opacity: 0.7, marginTop: 4 }}>tasks done</div>
            </div>
            <div className="mini-card" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ProgressRing value={0.72} size={38} stroke={5}>
                <b style={{ fontSize: 9 }}>72%</b>
              </ProgressRing>
              <div>
                <div className="mini-label">Habits</div>
                <div style={{ fontWeight: 800, fontSize: 11 }}>On track</div>
              </div>
            </div>
          </div>
          <div className="mini-row" style={{ gridTemplateColumns: '1.3fr 1fr', minHeight: 0 }}>
            <div className="mini-card" style={{ display: 'grid', alignContent: 'start', gap: 2 }}>
              <div style={{ fontWeight: 800, fontSize: 11, marginBottom: 4 }}>Today</div>
              {[
                ['Morning run', true],
                ['Review pull request', true],
                ['Pay electricity bill', false],
                ['Call mom', false],
                ['Read 20 pages', false],
              ].map(([title, done]) => (
                <div key={title as string} className="mini-task">
                  <i className={done ? 'done' : ''} />
                  {done ? <s>{title as string}</s> : <span>{title as string}</span>}
                </div>
              ))}
            </div>
            <div className="mini-card" style={{ display: 'grid', alignContent: 'start', gap: 6 }}>
              <div style={{ fontWeight: 800, fontSize: 11 }}>This week</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 58 }}>
                {[0.45, 0.7, 0.55, 0.9, 0.62, 1, 0.3].map((h, i) => (
                  <span
                    key={i}
                    style={{
                      flex: 1,
                      height: `${h * 100}%`,
                      borderRadius: 5,
                      background: i === 5 ? 'var(--color-highlight)' : 'var(--color-primary)',
                      border: i === 5 ? '1.5px solid var(--ink)' : 0,
                      opacity: i === 5 ? 1 : 0.8,
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, fontWeight: 700, color: 'var(--color-text-tertiary)' }}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Phone: the habits screen --------------------------------------------------------------------

/** The app's own habit icons (the phone's catalog), not stand-ins. */
const PHONE_HABITS = [
  { name: 'Drink water', icon: 'line:droplet', color: 'cyan', done: true, days: [1, 1, 1, 1, 0, 1, 1] },
  { name: 'Workout', icon: 'line:barbell', color: 'pink', done: true, days: [1, 0, 1, 1, 1, 0, 1] },
  { name: 'Read', icon: 'line:book', color: 'blue', done: false, days: [1, 1, 1, 0, 1, 1, 0] },
  { name: 'Meditate', icon: 'emoji:person-in-lotus-position', color: 'purple', done: false, days: [0, 1, 1, 1, 0, 1, 0] },
] as const;

export function PhoneHabits() {
  return (
    <div className="mini" aria-hidden>
      <div className="mini-phone">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.03em' }}>Habits</div>
          <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--color-primary)' }}>2 / 4</span>
        </div>
        <div className="mini-card mini-card--lime" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ProgressRing value={0.5} size={30} stroke={4} color="#141512" track="rgba(20,21,18,0.15)" />
          <div>
            <div style={{ fontWeight: 800, fontSize: 10 }}>Halfway there</div>
            <div style={{ fontSize: 8.5, opacity: 0.7 }}>2 habits left today</div>
          </div>
        </div>
        {PHONE_HABITS.map(({ name, icon, color, done, days }) => (
          <div key={name} className="mini-habit">
            <HabitGlyph icon={icon} emoji="✨" color={color} size={22} />
            <div style={{ minWidth: 0 }}>
              {name}
              <div className="mini-dots">
                {days.map((on, i) => (
                  <span key={i} className={on ? 'on' : ''} />
                ))}
              </div>
            </div>
            <span className={`mini-habit__check${done ? ' done' : ''}`}>{done ? <Check size={10} strokeWidth={3.5} /> : null}</span>
          </div>
        ))}
      </div>
      <div className="mini-dock">
        <Home size={12} />
        <b>
          <Flame size={12} />
        </b>
        <CheckSquare size={12} />
        <NotebookPen size={12} />
      </div>
    </div>
  );
}

// ---- Feature tile visuals -------------------------------------------------------------------------

/** The landing's habit tile: the app's own Heatmap component (the phone's design), with demo check-ins. */
export function HeatmapVisual() {
  const today = toLocalIsoDate(new Date());
  const columns = buildCalendarColumns(HEATMAP_WEEKS, today);
  const noise = seeded(HEATMAP_WEEKS * 7, 11);
  const levels = new Map<string, HeatmapLevel>();
  columns.flat().forEach((cell, index) => {
    // Busier toward today, like a habit that's taking hold.
    const chance = (noise[index] ?? 0) * (0.5 + (index / (HEATMAP_WEEKS * 7)) * 0.7);
    levels.set(cell.date, (chance > 0.85 ? 4 : chance > 0.62 ? 3 : chance > 0.42 ? 2 : chance > 0.26 ? 1 : 0) as HeatmapLevel);
  });
  return (
    <div className="tile-heatmap" aria-hidden>
      <Heatmap columns={columns} levelFor={(date) => levels.get(date) ?? 0} color={habitPalette.purple.base} cellSize={11} gap={3} showMonthLabels showWeekdayLabels scrollable />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <HeatmapLegend color={habitPalette.purple.base} />
      </div>
    </div>
  );
}

export function TasksVisual() {
  return (
    <div className="task-list" aria-hidden>
      {[
        { title: 'Ship the landing page', meta: 'Today', done: true },
        { title: 'Plan the week', meta: '10:00', done: false },
        { title: 'Groceries for Sunday', meta: 'Tomorrow', done: false },
      ].map((task) => (
        <div key={task.title} className={`task-row${task.done ? ' task-row--done' : ''}`}>
          <span className="task-row__box">{task.done ? <Check size={13} strokeWidth={3.5} /> : null}</span>
          <span className="task-row__title">{task.title}</span>
          <span className="chip" style={{ height: 24, fontSize: 12 }}>
            {task.meta}
          </span>
        </div>
      ))}
    </div>
  );
}

export function NoteVisual() {
  return (
    <div className="note-paper" aria-hidden>
      <h4>Ideas for the trip</h4>
      <p>☐ Book the train tickets</p>
      <p>☑ Pack the good camera</p>
      <p>Sunrise hike on day two…</p>
    </div>
  );
}

export function CalendarVisual() {
  const days = Array.from({ length: 21 }, (_, i) => i + 14);
  const events = new Set([15, 17, 20, 22, 23, 27, 30, 31]);
  return (
    <div className="cal" aria-hidden>
      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
        <b key={i}>{d}</b>
      ))}
      {days.map((day) => (
        <span key={day} className={`${day === 26 ? 'today' : ''}${events.has(day) ? ' has' : ''}`}>
          {day > 30 ? day - 30 : day}
        </span>
      ))}
    </div>
  );
}

export function FocusVisual() {
  return (
    <div className="focus-ring" aria-hidden>
      <ProgressRing value={0.68} size={150} stroke={14} color="#141512" track="rgba(20,21,18,0.12)">
        <div style={{ textAlign: 'center' }}>
          <div className="num" style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>
            16:24
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>Deep work</div>
        </div>
      </ProgressRing>
    </div>
  );
}

export function MoneyVisual() {
  const budgets = [
    { name: 'Groceries', spent: 0.72, label: '₹7,200 / ₹10,000' },
    { name: 'Eating out', spent: 0.94, label: '₹4,700 / ₹5,000' },
    { name: 'Transport', spent: 0.38, label: '₹1,140 / ₹3,000' },
  ];
  const slices = [
    { value: 0.42, color: 'var(--color-primary)' },
    { value: 0.26, color: 'var(--color-finance)' },
    { value: 0.18, color: 'var(--color-accent-lavender)' },
    { value: 0.14, color: 'var(--color-highlight)' },
  ];
  const r = 56;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="money" aria-hidden>
      <div className="money__bars">
        {budgets.map((budget) => (
          <div key={budget.name} className="money__bar">
            <div className="money__bar-head">
              <span>{budget.name}</span>
              <span>{budget.label}</span>
            </div>
            <div className="bar">
              <span
                style={
                  {
                    '--value': budget.spent,
                    background: budget.spent > 0.9 ? 'var(--color-error)' : 'var(--color-finance)',
                  } as CSSProperties
                }
              />
            </div>
          </div>
        ))}
      </div>
      <svg width="150" height="150" viewBox="0 0 150 150">
        <g transform="rotate(-90 75 75)">
          {slices.map((slice, i) => {
            const length = slice.value * c;
            const circle = (
              <circle
                key={i}
                cx="75"
                cy="75"
                r={r}
                fill="none"
                stroke={slice.color}
                strokeWidth="18"
                strokeDasharray={`${length - 3} ${c - length + 3}`}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return circle;
          })}
        </g>
        <text x="75" y="72" textAnchor="middle" fontSize="20" fontWeight="800" fill="var(--color-text-primary)">
          ₹24k
        </text>
        <text x="75" y="92" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--color-text-secondary)">
          this month
        </text>
      </svg>
    </div>
  );
}
