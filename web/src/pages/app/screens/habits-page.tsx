import { Archive, Flame, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

import type { HabitWithLogs } from '@/domain/entities/habit';
import { completionRate, computeHabitStats, habitLevel } from '@/domain/services/habit-engine';
import { buildCalendarColumns } from '@/domain/services/heatmap';
import { useArchiveHabit, useCreateHabit, useDeleteHabit, useHabits, useUpdateHabit } from '@/features/habits/hooks';
import { HABIT_TEMPLATES } from '@/features/habits/habit-templates';
import { ICON_CATEGORIES, type HabitIconCategory, type HabitIconKind } from '@/features/habits/icons/catalog';
import { getHabitIcon, iconsInCategory, searchHabitIcons } from '@/features/habits/icons/lookup';
import { HABIT_COLORS, habitPalette, type HabitColor } from '@/theme/habit-palette';
import { addDaysIso, todayIso } from '@/utils/date';

import { HabitGlyph, HabitIconSvg } from '../../../components/habit-glyph';
import { Heatmap, HeatmapLegend } from '../../../components/heatmap';
import { Button, Card, Chip, Dialog, IconButton, Segmented, Skeleton } from '../../../components/ui';
import { useDocumentTitle } from '../../../lib/use-document-title';
import { EmptyState, HabitRow } from '../app-components';
import { confirmAction } from '../confirm';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** Same as the phone's habit card: 17 weeks, 11 px cells. */
const HEATMAP_WEEKS = 17;
const DEFAULT_ICON = 'line:sparkles';

export function HabitsPage() {
  useDocumentTitle('Habits — ClayHabbit');
  const { data: habits, isLoading } = useHabits();
  const archive = useArchiveHabit();
  const remove = useDeleteHabit();
  const [editing, setEditing] = useState<HabitWithLogs | 'new' | null>(null);
  const today = todayIso();
  const columns = useMemo(() => buildCalendarColumns(HEATMAP_WEEKS, today), [today]);

  const doneToday = (habits ?? []).filter((habit) => (habit.logs[today] ?? 0) >= habit.targetPerDay).length;

  return (
    <div className="page">
      <div className="page__head">
        <div style={{ display: 'grid', gap: 6 }}>
          <h1 className="serif">Habits</h1>
          <span className="t-body-md c-secondary num">
            {doneToday} of {habits?.length ?? 0} done today
          </span>
        </div>
        <Button icon={<Plus size={20} strokeWidth={2.6} />} onClick={() => setEditing('new')}>
          New habit
        </Button>
      </div>

      {isLoading ? (
        <Skeleton height={320} radius={26} />
      ) : (habits ?? []).length === 0 ? (
        <EmptyState
          icon={Flame}
          title="Start one small habit"
          body="Drink water, read ten pages, stretch. Check it in each day and watch the heatmap fill."
          action={<Button onClick={() => setEditing('new')}>Create a habit</Button>}
        />
      ) : (
        <div className="grid-2">
          {(habits ?? []).map((habit) => {
            const stats = computeHabitStats(habit.logs, habit.targetPerDay, habit.daysOfWeek, today);
            const rate = completionRate(habit.logs, habit.targetPerDay, habit.daysOfWeek, addDaysIso(today, -29), today);
            const swatch = habitPalette[habit.color] ?? habitPalette.purple;
            return (
              <Card key={habit.id} style={{ display: 'grid', gap: 16 }}>
                <HabitRow habit={habit} />
                <div className="row row--wrap" style={{ gap: 8 }}>
                  <span className="chip">🔥 {stats.currentStreak} day streak</span>
                  <span className="chip">Best {stats.bestStreak}</span>
                  <span className="chip num">{Math.round(rate * 100)}% last 30 days</span>
                </div>
                <Heatmap
                  columns={columns}
                  levelFor={(date) => habitLevel(habit.logs[date] ?? 0, habit.targetPerDay)}
                  color={swatch.base}
                  cellSize={11}
                  scrollable
                  titleFor={(date) => `${date}: ${habit.logs[date] ?? 0}`}
                  label={`${habit.name}: last ${HEATMAP_WEEKS} weeks`}
                />
                <div className="row row--between">
                  <HeatmapLegend color={swatch.base} />
                  <div className="row" style={{ gap: 4 }}>
                    <IconButton label={`Edit “${habit.name}”`} variant="ghost" size="sm" onClick={() => setEditing(habit)}>
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton
                      label={`Archive “${habit.name}”`}
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (await confirmAction({ title: 'Archive this habit?', body: 'It leaves your lists; its history is kept.', confirmLabel: 'Archive' })) {
                          archive.mutate(habit.id);
                        }
                      }}
                    >
                      <Archive size={16} />
                    </IconButton>
                    <IconButton
                      label={`Delete “${habit.name}”`}
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (
                          await confirmAction({
                            title: 'Delete this habit?',
                            body: 'Its whole history is deleted everywhere. This can’t be undone.',
                            confirmLabel: 'Delete',
                            danger: true,
                          })
                        ) {
                          remove.mutate(habit.id);
                        }
                      }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={editing !== null} onClose={() => setEditing(null)} wide labelledBy="habit-form-title">
        {editing ? <HabitForm habit={editing === 'new' ? null : editing} onClose={() => setEditing(null)} /> : null}
      </Dialog>
    </div>
  );
}

// ---- Icon picker (the phone's catalog) ------------------------------------------------------

const KINDS = [
  { value: 'line', label: 'Icons' },
  { value: 'emoji', label: 'Colour' },
] as const;

function IconPicker({ value, color, onChange }: { value: string | null; color: HabitColor; onChange: (id: string) => void }) {
  const [kind, setKind] = useState<HabitIconKind>(() => (getHabitIcon(value)?.kind === 'emoji' ? 'emoji' : 'line'));
  const [category, setCategory] = useState<HabitIconCategory>(() => getHabitIcon(value)?.category ?? ICON_CATEGORIES[0]!.key);
  const [query, setQuery] = useState('');
  const icons = query.trim() ? searchHabitIcons(kind, query) : iconsInCategory(kind, category);

  return (
    <div className="field">
      <div className="row row--between row--wrap" style={{ gap: 10 }}>
        <span className="field__label">Icon</span>
        <Segmented label="Icon style" options={KINDS} value={kind} onChange={setKind} />
      </div>
      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: 18, color: 'var(--color-text-tertiary)' }} aria-hidden />
        <input className="input" placeholder="Search icons" aria-label="Search icons" value={query} onChange={(event) => setQuery(event.target.value)} style={{ paddingLeft: 40 }} />
      </div>
      {query.trim() ? null : (
        <div className="row" style={{ gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {ICON_CATEGORIES.map((item) => (
            <Chip key={item.key} selected={category === item.key} onClick={() => setCategory(item.key)}>
              {item.label}
            </Chip>
          ))}
        </div>
      )}
      {/* Fixed height: switching category or searching never resizes the dialog. */}
      <div className="icon-grid" role="listbox" aria-label="Icons">
        {icons.length === 0 ? (
          <p className="t-body-sm c-tertiary" style={{ gridColumn: '1 / -1', padding: 12 }}>
            No icons match.
          </p>
        ) : (
          icons.map((def) => (
            <button
              key={def.id}
              type="button"
              role="option"
              aria-selected={value === def.id}
              title={def.label}
              className={`icon-grid__cell${value === def.id ? ' icon-grid__cell--on' : ''}`}
              onClick={() => onChange(def.id)}
            >
              <HabitIconSvg id={def.id} size={24} color={def.kind === 'line' ? habitPalette[color].base : undefined} />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ---- Form -------------------------------------------------------------------------------------

function HabitForm({ habit, onClose }: { habit: HabitWithLogs | null; onClose: () => void }) {
  const create = useCreateHabit();
  const update = useUpdateHabit();
  // Editing keeps whatever the habit had (an icon, or just its emoji); a new habit starts with sparkles.
  const startIcon = habit ? habit.icon : DEFAULT_ICON;
  const [name, setName] = useState(habit?.name ?? '');
  const [icon, setIcon] = useState<string | null>(startIcon);
  const [emoji, setEmoji] = useState(habit?.emoji ?? getHabitIcon(startIcon)?.emoji ?? '✨');
  const [color, setColor] = useState<HabitColor>(habit?.color ?? 'purple');
  const [days, setDays] = useState(habit?.daysOfWeek ?? '1111111');
  const [target, setTarget] = useState(habit?.targetPerDay ?? 1);

  const chooseIcon = (id: string) => {
    setIcon(id);
    // The emoji stays as the habit's text stand-in, like on the phone.
    setEmoji(getHabitIcon(id)?.emoji ?? emoji);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !days.includes('1')) return;
    const input = { name: name.trim(), emoji, icon, color, daysOfWeek: days, targetPerDay: target };
    if (habit) await update.mutateAsync({ id: habit.id, input });
    else await create.mutateAsync(input);
    onClose();
  };

  return (
    <form className="dialog__body" onSubmit={submit}>
      <div className="row row--between">
        <h2 id="habit-form-title" className="t-headline-md">
          {habit ? 'Edit habit' : 'New habit'}
        </h2>
        <IconButton label="Close" variant="ghost" size="sm" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </div>

      {habit ? null : (
        <div className="field">
          <span className="field__label">Start from</span>
          <div className="row" style={{ gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {HABIT_TEMPLATES.map((template) => (
              <button
                key={template.name}
                type="button"
                className="chip"
                style={{ height: 40, paddingLeft: 4, flex: 'none' }}
                onClick={() => {
                  setName(template.name);
                  chooseIcon(template.icon);
                  setColor(template.color);
                  setTarget(template.targetPerDay);
                  setDays(template.daysOfWeek);
                }}
              >
                <HabitGlyph icon={template.icon} emoji={getHabitIcon(template.icon)?.emoji ?? '✨'} color={template.color} size={32} />
                {template.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="row">
        <HabitGlyph icon={icon} emoji={emoji} color={color} size={56} />
        <label className="field" style={{ flex: 1 }}>
          <span className="field__label">Name</span>
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Drink water" required autoFocus />
        </label>
      </div>

      <IconPicker value={icon} color={color} onChange={chooseIcon} />

      <div className="field">
        <span className="field__label">Colour</span>
        <div className="row" style={{ gap: 10 }}>
          {HABIT_COLORS.map((key) => (
            <button
              key={key}
              type="button"
              aria-label={key}
              aria-pressed={color === key}
              onClick={() => setColor(key)}
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${habitPalette[key].gradient[0]}, ${habitPalette[key].gradient[1]})`,
                boxShadow: color === key ? '0 0 0 3px var(--color-background-elevated), 0 0 0 5px var(--ink)' : undefined,
              }}
            />
          ))}
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'end' }}>
        <div className="field">
          <span className="field__label">Days</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
            {DAYS.map((label, index) => {
              const on = days[index] === '1';
              return (
                <button
                  key={label}
                  type="button"
                  className={`chip${on ? ' chip--selected' : ''}`}
                  style={{ justifyContent: 'center', height: 38, padding: 0 }}
                  aria-pressed={on}
                  aria-label={label}
                  onClick={() => setDays(days.slice(0, index) + (on ? '0' : '1') + days.slice(index + 1))}
                >
                  {label[0]}
                </button>
              );
            })}
          </div>
        </div>
        <label className="field">
          <span className="field__label">Times per day</span>
          <input
            className="input"
            type="number"
            min={1}
            max={20}
            value={target}
            onChange={(event) => setTarget(Math.max(1, Math.min(20, Number(event.target.value) || 1)))}
          />
        </label>
      </div>

      <div className="dialog__actions">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={create.isPending || update.isPending} disabled={!name.trim() || !days.includes('1')}>
          {habit ? 'Save' : 'Create habit'}
        </Button>
      </div>
    </form>
  );
}
