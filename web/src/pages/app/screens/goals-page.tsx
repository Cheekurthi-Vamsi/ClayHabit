import { Archive, CalendarClock, Plus, Target, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { useArchiveGoal, useCreateGoal, useDeleteGoal, useGoals, useGoalTasks } from '@/features/goals/hooks';
import { useCreateTask } from '@/features/tasks/hooks';

import { Button, Card, Dialog, IconButton, ProgressBar, Skeleton } from '../../../components/ui';
import { useDocumentTitle } from '../../../lib/use-document-title';
import { dueLabel, EmptyState, QuickAdd, TaskRow } from '../app-components';
import { confirmAction } from '../confirm';

export function GoalsPage() {
  useDocumentTitle('Goals — ClayHabbit');
  const { data: goals, isLoading } = useGoals();
  const archive = useArchiveGoal();
  const remove = useDeleteGoal();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const open = (goals ?? []).find((goal) => goal.id === openId) ?? null;

  return (
    <div className="page">
      <div className="page__head">
        <div style={{ display: 'grid', gap: 6 }}>
          <h1>Goals</h1>
          <span className="t-body-md c-secondary">What your tasks are for.</span>
        </div>
        <Button icon={<Plus size={20} strokeWidth={2.6} />} onClick={() => setCreating(true)}>
          New goal
        </Button>
      </div>

      {isLoading ? (
        <Skeleton height={260} radius={26} />
      ) : (goals ?? []).length === 0 ? (
        <EmptyState icon={Target} title="Set a first goal" body="Give it a deadline, then link tasks to it and watch the bar fill." action={<Button onClick={() => setCreating(true)}>Create a goal</Button>} />
      ) : (
        <div className="grid-3">
          {(goals ?? []).map((goal) => {
            const ratio = goal.taskCount ? goal.completedTaskCount / goal.taskCount : 0;
            return (
              <Card key={goal.id} pressable onClick={() => setOpenId(goal.id)} style={{ display: 'grid', gap: 14, minHeight: 190 }} role="button" tabIndex={0}>
                <div className="row row--between" style={{ alignItems: 'flex-start' }}>
                  <span className="gate__point-icon">
                    <Target size={18} />
                  </span>
                  {goal.deadline ? (
                    <span className="chip">
                      <CalendarClock size={13} /> {dueLabel(goal.deadline)}
                    </span>
                  ) : null}
                </div>
                <div className="t-title-lg">{goal.title}</div>
                {goal.description ? <p className="t-body-sm c-secondary">{goal.description}</p> : null}
                <div style={{ display: 'grid', gap: 8, alignSelf: 'end' }}>
                  <ProgressBar value={ratio} label={`${goal.title} progress`} />
                  <span className="t-label-md c-secondary num">
                    {goal.completedTaskCount} of {goal.taskCount} tasks
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={creating} onClose={() => setCreating(false)} labelledBy="goal-new-title">
        {creating ? <NewGoalForm onClose={() => setCreating(false)} /> : null}
      </Dialog>

      <Dialog open={!!open} onClose={() => setOpenId(null)} wide labelledBy="goal-title">
        {open ? (
          <div className="dialog__body">
            <div className="row row--between">
              <h2 id="goal-title" className="t-headline-md">
                {open.title}
              </h2>
              <IconButton label="Close" variant="ghost" size="sm" onClick={() => setOpenId(null)}>
                <X size={18} />
              </IconButton>
            </div>
            {open.description ? <p className="t-body-md c-secondary">{open.description}</p> : null}
            <GoalTasks goalId={open.id} />
            <div className="dialog__actions">
              <Button
                variant="ghost"
                icon={<Archive size={16} />}
                onClick={async () => {
                  archive.mutate({ id: open.id, isArchived: true });
                  setOpenId(null);
                }}
              >
                Archive
              </Button>
              <Button
                variant="danger"
                icon={<Trash2 size={16} />}
                onClick={async () => {
                  if (await confirmAction({ title: 'Delete this goal?', body: 'Its tasks stay; they just lose the link.', confirmLabel: 'Delete', danger: true })) {
                    remove.mutate(open.id);
                    setOpenId(null);
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

function GoalTasks({ goalId }: { goalId: string }) {
  const { data: tasks } = useGoalTasks(goalId);
  const createTask = useCreateTask();
  return (
    <div className="stack-sm">
      <QuickAdd placeholder="Add a task for this goal" onAdd={(title) => createTask.mutateAsync({ title, goalId })} />
      {(tasks ?? []).length === 0 ? (
        <p className="t-body-sm c-tertiary">No tasks yet.</p>
      ) : (
        <ul className="list">
          {(tasks ?? []).map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </ul>
      )}
    </div>
  );
}

function NewGoalForm({ onClose }: { onClose: () => void }) {
  const create = useCreateGoal();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    await create.mutateAsync({ title: title.trim(), description: description.trim() || null, deadline: deadline || null });
    onClose();
  };
  return (
    <form className="dialog__body" onSubmit={submit}>
      <h2 id="goal-new-title" className="t-headline-md">
        New goal
      </h2>
      <label className="field">
        <span className="field__label">Goal</span>
        <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Run a 10k" required autoFocus />
      </label>
      <label className="field">
        <span className="field__label">Why it matters (optional)</span>
        <textarea className="input" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <label className="field">
        <span className="field__label">Deadline (optional)</span>
        <input className="input" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
      </label>
      <div className="dialog__actions">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={create.isPending} disabled={!title.trim()}>
          Create goal
        </Button>
      </div>
    </form>
  );
}
