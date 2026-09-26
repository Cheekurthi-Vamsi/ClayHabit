import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { useCreateEvent, useDeleteEvent, useEventsForRange, useTasksForRange } from '@/features/calendar/hooks';
import { getMonthGridDates, todayIso } from '@/utils/date';

import { Button, Card, IconButton } from '../../../components/ui';
import { useDocumentTitle } from '../../../lib/use-document-title';
import { EmptyState, TaskRow, timeLabel } from '../app-components';
import { confirmAction } from '../confirm';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const EVENT_COLOR = '#49769F';

export function CalendarPage() {
  useDocumentTitle('Calendar — ClayHabbit');
  const today = todayIso();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selected, setSelected] = useState(today);

  const days = getMonthGridDates(cursor.year, cursor.month);
  const first = days[0]!;
  const last = days[days.length - 1]!;
  const { data: events } = useEventsForRange(first, last);
  const { data: tasks } = useTasksForRange(first, last);
  const createEvent = useCreateEvent();
  const deleteEvent = useDeleteEvent();

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const move = (delta: number) =>
    setCursor(({ year, month }) => {
      const next = new Date(year, month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });

  const dayEvents = (events ?? []).filter((event) => event.date === selected);
  const dayTasks = (tasks ?? []).filter((task) => task.dueDate === selected);

  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const addEvent = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    await createEvent.mutateAsync({ title: title.trim(), date: selected, startTime: start || null, color: EVENT_COLOR });
    setTitle('');
    setStart('');
  };

  const selectedLabel = new Date(`${selected}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="page">
      <div className="page__head">
        <h1>{monthLabel}</h1>
        <div className="page__actions">
          <IconButton label="Previous month" onClick={() => move(-1)}>
            <ChevronLeft size={20} />
          </IconButton>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const now = new Date();
              setCursor({ year: now.getFullYear(), month: now.getMonth() });
              setSelected(today);
            }}
          >
            Today
          </Button>
          <IconButton label="Next month" onClick={() => move(1)}>
            <ChevronRight size={20} />
          </IconButton>
        </div>
      </div>

      <div className="grid-main">
        <Card>
          <div className="month">
            {DOW.map((label) => (
              <span key={label} className="month__dow">
                {label}
              </span>
            ))}
            {days.map((iso) => {
              const date = new Date(`${iso}T00:00:00`);
              const inMonth = date.getMonth() === cursor.month;
              const items = [
                ...(events ?? []).filter((event) => event.date === iso).map((event) => ({ id: event.id, title: event.title, kind: 'event' })),
                ...(tasks ?? []).filter((task) => task.dueDate === iso && !task.isCompleted).map((task) => ({ id: task.id, title: task.title, kind: 'task' })),
              ];
              return (
                <button
                  key={iso}
                  type="button"
                  className={`month__day${inMonth ? '' : ' month__day--out'}${iso === today ? ' month__day--today' : ''}${iso === selected ? ' month__day--selected' : ''}`}
                  onClick={() => setSelected(iso)}
                  aria-label={`${date.toDateString()}, ${items.length} items`}
                  aria-pressed={iso === selected}
                >
                  <span className="month__num">{date.getDate()}</span>
                  <span className="month__pills">
                    {items.slice(0, 3).map((item) => (
                      <span key={item.id} className={`month__pill${item.kind === 'task' ? ' month__pill--task' : ''}`}>
                        {item.title}
                      </span>
                    ))}
                    {items.length > 3 ? <span className="t-caption c-tertiary">+{items.length - 3} more</span> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <div className="stack">
          <Card>
            <div className="section-head">
              <h2>{selectedLabel}</h2>
            </div>
            <form onSubmit={addEvent} className="stack-sm" style={{ marginBottom: 16 }}>
              <input className="input" placeholder="New event" aria-label="Event title" value={title} onChange={(event) => setTitle(event.target.value)} />
              <div className="row">
                <input className="input" type="time" aria-label="Start time" value={start} onChange={(event) => setStart(event.target.value)} style={{ flex: 1 }} />
                <Button type="submit" icon={<Plus size={18} />} disabled={!title.trim()} loading={createEvent.isPending}>
                  Add
                </Button>
              </div>
            </form>
            {dayEvents.length === 0 && dayTasks.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Nothing planned" body="A free day. Add an event above." />
            ) : (
              <div className="stack-sm">
                {dayEvents.map((event) => (
                  <div key={event.id} className="item" style={{ gridTemplateColumns: '6px minmax(0,1fr) auto' }}>
                    <span style={{ width: 6, height: 36, borderRadius: 3, background: event.color || EVENT_COLOR }} aria-hidden />
                    <div className="item__body">
                      <span className="item__title">{event.title}</span>
                      <span className="item__meta">{event.startTime ? `${timeLabel(event.startTime)}${event.endTime ? ` – ${timeLabel(event.endTime)}` : ''}` : 'All day'}</span>
                    </div>
                    <IconButton
                      label={`Delete “${event.title}”`}
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (await confirmAction({ title: 'Delete this event?', confirmLabel: 'Delete', danger: true })) deleteEvent.mutate(event.id);
                      }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                ))}
                {dayTasks.length ? (
                  <ul className="list">
                    {dayTasks.map((task) => (
                      <TaskRow key={task.id} task={task} />
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
