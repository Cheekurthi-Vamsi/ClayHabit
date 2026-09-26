import { Check, CheckSquare, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

import type { RepeatRule, Task, TaskPriority } from '@/domain/entities/task';
import { useGoals } from '@/features/goals/hooks';
import {
  useAddSubtask,
  useAllTasks,
  useCreateTask,
  useProjects,
  useRemoveSubtask,
  useTaskDetails,
  useToggleSubtask,
  useUpdateTask,
} from '@/features/tasks/hooks';
import { addDaysIso, todayIso } from '@/utils/date';

import { Button, Card, Dialog, IconButton, Segmented, Skeleton } from '../../../components/ui';
import { useDocumentTitle } from '../../../lib/use-document-title';
import { EmptyState, QuickAdd, TaskRow } from '../app-components';

type Filter = 'today' | 'upcoming' | 'all' | 'done';

const FILTERS = [
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'all', label: 'All' },
  { value: 'done', label: 'Done' },
] as const;

function matches(task: Task, filter: Filter, today: string): boolean {
  if (filter === 'done') return task.isCompleted;
  if (task.isCompleted) return filter === 'today' && task.dueDate === today;
  if (filter === 'today') return !!task.dueDate && task.dueDate <= today;
  if (filter === 'upcoming') return !!task.dueDate && task.dueDate > today;
  return true;
}

export function TasksPage() {
  useDocumentTitle('Tasks — ClayHabbit');
  const [filter, setFilter] = useState<Filter>('today');
  const [open, setOpen] = useState<string | null>(null);
  const { data: tasks, isLoading } = useAllTasks();
  const { data: projects } = useProjects();
  const createTask = useCreateTask();
  const today = todayIso();

  const visible = (tasks ?? [])
    .filter((task) => !task.isArchived && matches(task, filter, today))
    .sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted) || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
  const projectName = (id: string | null) => (id ? (projects?.find((project) => project.id === id)?.name ?? null) : null);
  const counts = {
    open: (tasks ?? []).filter((task) => !task.isCompleted && !task.isArchived).length,
    overdue: (tasks ?? []).filter((task) => !task.isCompleted && !task.isArchived && !!task.dueDate && task.dueDate < today).length,
  };

  return (
    <div className="page">
      <div className="page__head">
        <div style={{ display: 'grid', gap: 6 }}>
          <h1>Tasks</h1>
          <span className="t-body-md c-secondary num">
            {counts.open} open{counts.overdue ? ` · ${counts.overdue} overdue` : ''}
          </span>
        </div>
        <Segmented label="Show" options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      <Card>
        <QuickAdd
          placeholder={filter === 'upcoming' ? 'Add a task for tomorrow' : filter === 'all' ? 'Add a task (no date)' : 'Add a task for today'}
          onAdd={(title) =>
            createTask.mutateAsync({
              title,
              dueDate: filter === 'upcoming' ? addDaysIso(today, 1) : filter === 'all' ? null : today,
            })
          }
        />
      </Card>

      {isLoading ? (
        <Skeleton height={320} radius={26} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={filter === 'done' ? 'Nothing finished yet' : 'All clear'}
          body={filter === 'done' ? 'Completed tasks show up here.' : 'No tasks here. Add one above when you’re ready.'}
        />
      ) : (
        <ul className="list">
          {visible.map((task) => (
            <TaskRow key={task.id} task={task} projectName={projectName(task.projectId)} onOpen={(t) => setOpen(t.id)} />
          ))}
        </ul>
      )}

      <Dialog open={!!open} onClose={() => setOpen(null)} wide labelledBy="task-edit-title">
        {open ? <TaskEditor id={open} onClose={() => setOpen(null)} /> : null}
      </Dialog>
    </div>
  );
}

// ---- Editor ---------------------------------------------------------------------------------

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

function TaskEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: task } = useTaskDetails(id);
  const { data: projects } = useProjects();
  const { data: goals } = useGoals();
  const update = useUpdateTask();
  const addSubtask = useAddSubtask();
  const toggleSubtask = useToggleSubtask(id);
  const removeSubtask = useRemoveSubtask(id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [repeat, setRepeat] = useState<RepeatRule | ''>('');
  const [projectId, setProjectId] = useState('');
  const [goalId, setGoalId] = useState('');
  const [subtask, setSubtask] = useState('');

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? '');
    setDueDate(task.dueDate ?? '');
    setDueTime(task.dueTime ?? '');
    setPriority(task.priority);
    setRepeat(task.repeatRule ?? '');
    setProjectId(task.projectId ?? '');
    setGoalId(task.goalId ?? '');
    // Load once per task; later edits are the form's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  if (!task) {
    return (
      <div className="dialog__body">
        <Skeleton height={320} />
      </div>
    );
  }

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    await update.mutateAsync({
      id,
      input: {
        title: title.trim(),
        description: description.trim() || null,
        dueDate: dueDate || null,
        dueTime: dueDate && dueTime ? dueTime : null,
        priority,
        repeatRule: repeat || null,
        projectId: projectId || null,
        goalId: goalId || null,
      },
    });
    onClose();
  };

  return (
    <form className="dialog__body" onSubmit={save}>
      <div className="row row--between">
        <h2 id="task-edit-title" className="t-headline-md">
          Edit task
        </h2>
        <IconButton label="Close" variant="ghost" size="sm" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </div>

      <label className="field">
        <span className="field__label">Title</span>
        <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} required />
      </label>
      <label className="field">
        <span className="field__label">Notes</span>
        <textarea className="input" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
      </label>

      <div className="grid-2">
        <label className="field">
          <span className="field__label">Due date</span>
          <input className="input" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Time</span>
          <input className="input" type="time" value={dueTime} disabled={!dueDate} onChange={(event) => setDueTime(event.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Repeat</span>
          <select className="input" value={repeat} onChange={(event) => setRepeat(event.target.value as RepeatRule | '')}>
            <option value="">Doesn’t repeat</option>
            <option value="daily">Every day</option>
            <option value="weekdays">Weekdays</option>
            <option value="weekly">Every week</option>
          </select>
        </label>
        <label className="field">
          <span className="field__label">Project</span>
          <select className="input" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">No project</option>
            {(projects ?? []).map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="field">
        <span className="field__label">Priority</span>
        <Segmented label="Priority" options={PRIORITIES} value={priority} onChange={setPriority} />
      </div>

      {(goals ?? []).length > 0 ? (
        <label className="field">
          <span className="field__label">Goal</span>
          <select className="input" value={goalId} onChange={(event) => setGoalId(event.target.value)}>
            <option value="">No goal</option>
            {(goals ?? []).map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="field">
        <span className="field__label">Subtasks</span>
        <ul className="list">
          {task.subtasks.map((item) => (
            <li key={item.id} className="item" style={{ minHeight: 48 }}>
              <button
                type="button"
                role="checkbox"
                aria-checked={item.isCompleted}
                className="check"
                onClick={() => toggleSubtask.mutate({ id: item.id, isCompleted: !item.isCompleted })}
              >
                {item.isCompleted ? <Check size={15} strokeWidth={3.5} /> : null}
              </button>
              <span className={`item__title${item.isCompleted ? ' item__title--done' : ''}`}>{item.title}</span>
              <IconButton label="Remove subtask" variant="ghost" size="sm" onClick={() => removeSubtask.mutate(item.id)}>
                <Trash2 size={16} />
              </IconButton>
            </li>
          ))}
        </ul>
        <div className="row">
          <input
            className="input"
            placeholder="Add a subtask"
            value={subtask}
            onChange={(event) => setSubtask(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && subtask.trim()) {
                event.preventDefault();
                addSubtask.mutate({ taskId: id, title: subtask.trim() });
                setSubtask('');
              }
            }}
          />
          <IconButton
            label="Add subtask"
            variant="lime"
            onClick={() => {
              if (!subtask.trim()) return;
              addSubtask.mutate({ taskId: id, title: subtask.trim() });
              setSubtask('');
            }}
          >
            <Plus size={18} />
          </IconButton>
        </div>
      </div>

      {task.reminderEnabled ? (
        <p className="t-body-sm c-tertiary">This task has a reminder — your phone will ring for it.</p>
      ) : null}

      <div className="dialog__actions">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={update.isPending}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
