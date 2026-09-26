import { Bell, Calendar, Check, Clock, Plus, Repeat, Trash2, type LucideIcon } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';

import type { HabitWithLogs } from '@/domain/entities/habit';
import type { Task } from '@/domain/entities/task';
import { isScheduledOn, nextTapCount } from '@/domain/services/habit-engine';
import { useSetHabitCount } from '@/features/habits/hooks';
import { useDeleteTask, useToggleTask } from '@/features/tasks/hooks';
import { habitPalette } from '@/theme/habit-palette';
import { addDaysIso, startOfWeekIso, todayIso } from '@/utils/date';

import { HabitGlyph } from '../../components/habit-glyph';
import { Button, IconButton } from '../../components/ui';
import { confirmAction } from './confirm';

// ---- Dates -----------------------------------------------------------------------------------

export function dueLabel(iso: string | null): string | null {
  if (!iso) return null;
  const today = todayIso();
  if (iso === today) return 'Today';
  if (iso === addDaysIso(today, 1)) return 'Tomorrow';
  if (iso === addDaysIso(today, -1)) return 'Yesterday';
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function timeLabel(time: string | null): string | null {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(h ?? 0, m ?? 0, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

// ---- Empty state -----------------------------------------------------------------------------

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon size={26} />
      </span>
      <div className="t-title-lg" style={{ color: 'var(--color-text-primary)' }}>
        {title}
      </div>
      <p className="t-body-md" style={{ maxWidth: 360 }}>
        {body}
      </p>
      {action}
    </div>
  );
}

// ---- Quick add ------------------------------------------------------------------------------

/** One input and a lime + button: Enter adds. The row never changes size while typing or saving. */
export function QuickAdd({
  placeholder,
  onAdd,
  busy,
}: {
  placeholder: string;
  onAdd: (title: string) => Promise<unknown> | void;
  busy?: boolean;
}) {
  const [value, setValue] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const title = value.trim();
    if (!title) return;
    setValue('');
    await onAdd(title);
  };
  return (
    <form onSubmit={submit} className="row" style={{ gap: 10 }}>
      <input
        className="input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        style={{ flex: 1 }}
      />
      <Button type="submit" icon={<Plus size={20} strokeWidth={2.6} />} disabled={!value.trim()} loading={busy} style={{ minWidth: 112 }}>
        Add
      </Button>
    </form>
  );
}

// ---- Task row --------------------------------------------------------------------------------

export function TaskRow({ task, projectName, onOpen }: { task: Task; projectName?: string | null; onOpen?: (task: Task) => void }) {
  const toggle = useToggleTask();
  const remove = useDeleteTask();
  const due = dueLabel(task.dueDate);
  const time = timeLabel(task.dueTime);
  const overdue = !task.isCompleted && !!task.dueDate && task.dueDate < todayIso();

  return (
    <li className="item">
      <button
        type="button"
        role="checkbox"
        aria-checked={task.isCompleted}
        aria-label={task.isCompleted ? `Mark “${task.title}” not done` : `Complete “${task.title}”`}
        className="check check--round"
        onClick={() => toggle.mutate({ id: task.id, isCompleted: !task.isCompleted })}
      >
        {task.isCompleted ? <Check size={16} strokeWidth={3.5} /> : null}
      </button>
      <button type="button" className="item__body" style={{ textAlign: 'left' }} onClick={() => onOpen?.(task)}>
        <span className={`item__title${task.isCompleted ? ' item__title--done' : ''}`}>{task.title}</span>
        <span className="item__meta">
          <span>
            <i className={`prio prio--${task.priority}`} aria-hidden />
            {task.priority[0]!.toUpperCase() + task.priority.slice(1)}
          </span>
          {due ? (
            <span style={overdue ? { color: 'var(--color-error)' } : undefined}>
              <Calendar size={13} />
              {due}
            </span>
          ) : null}
          {time ? (
            <span>
              <Clock size={13} />
              {time}
            </span>
          ) : null}
          {task.repeatRule ? (
            <span>
              <Repeat size={13} />
              {task.repeatRule}
            </span>
          ) : null}
          {task.reminderEnabled ? (
            <span title="The phone will remind you">
              <Bell size={13} />
              Reminder
            </span>
          ) : null}
          {projectName ? <span>#{projectName}</span> : null}
        </span>
      </button>
      <div className="item__actions">
        <IconButton
          label={`Delete “${task.title}”`}
          variant="ghost"
          size="sm"
          onClick={async () => {
            if (await confirmAction({ title: 'Delete this task?', body: `“${task.title}” will be deleted everywhere.`, confirmLabel: 'Delete', danger: true })) {
              remove.mutate(task.id);
            }
          }}
        >
          <Trash2 size={17} />
        </IconButton>
      </div>
    </li>
  );
}

// ---- Habit row -------------------------------------------------------------------------------

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function HabitRow({ habit, showWeek = true }: { habit: HabitWithLogs; showWeek?: boolean }) {
  const setCount = useSetHabitCount();
  const today = todayIso();
  const count = habit.logs[today] ?? 0;
  const done = count >= habit.targetPerDay;
  const monday = startOfWeekIso(today);
  const swatch = habitPalette[habit.color] ?? habitPalette.purple;

  return (
    <div className="habit">
      <HabitGlyph icon={habit.icon} emoji={habit.emoji} color={habit.color} size={52} />
      <div style={{ minWidth: 0 }}>
        <div className="item__title">{habit.name}</div>
        <div className="item__meta">
          <span>
            {habit.targetPerDay > 1 ? `${count} / ${habit.targetPerDay} today` : done ? 'Done today' : isScheduledOn(habit.daysOfWeek, today) ? 'Due today' : 'Rest day'}
          </span>
        </div>
        {showWeek ? (
          <div className="habit__week" aria-label="This week">
            {DOW.map((label, index) => {
              const iso = addDaysIso(monday, index);
              const value = habit.logs[iso] ?? 0;
              const complete = value >= habit.targetPerDay;
              const scheduled = habit.daysOfWeek[index] === '1';
              return (
                <span
                  key={iso}
                  className={`habit__day${scheduled ? '' : ' habit__day--off'}${iso === today ? ' habit__day--today' : ''}`}
                  style={complete ? { background: swatch.base, color: '#fff' } : undefined}
                  title={iso}
                >
                  {label}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        className={`habit-check${done ? ' habit-check--done' : count > 0 ? ' habit-check--partial' : ''}`}
        aria-label={done ? `Undo “${habit.name}” for today` : `Check in “${habit.name}”`}
        aria-pressed={done}
        onClick={() => setCount.mutate({ habitId: habit.id, date: today, count: nextTapCount(count, habit.targetPerDay) })}
      >
        {done ? <Check size={22} strokeWidth={3.5} /> : habit.targetPerDay > 1 ? `${count}/${habit.targetPerDay}` : null}
      </button>
    </div>
  );
}
