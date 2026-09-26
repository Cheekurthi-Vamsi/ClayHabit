import { Pause, Play, RotateCcw, Square, Timer } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useFinishFocusSession, useRecentFocusSessions, useStartFocusSession, useTodayFocusMinutes } from '@/features/focus/hooks';
import { formatRelativeTime } from '@/utils/date';

import { Button, Card, ProgressRing } from '../../../components/ui';
import { useDocumentTitle } from '../../../lib/use-document-title';
import { EmptyState } from '../app-components';
import { usePhonePrefs } from '../session-context';

const PRESETS = [15, 25, 45, 60];

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function FocusPage() {
  const prefs = usePhonePrefs();
  const initial = typeof prefs.defaultFocusMinutes === 'number' ? prefs.defaultFocusMinutes : 25;
  const [minutes, setMinutes] = useState(initial);
  const [left, setLeft] = useState(initial * 60);
  const [running, setRunning] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const startedAt = useRef<number>(0);
  const endsAt = useRef<number>(0);

  const start = useStartFocusSession();
  const finish = useFinishFocusSession();
  const { data: todayMinutes } = useTodayFocusMinutes();
  const { data: recent } = useRecentFocusSessions();

  useDocumentTitle(running ? `${clock(left)} · Focus — ClayHabbit` : 'Focus — ClayHabbit');

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const remaining = Math.max(0, Math.round((endsAt.current - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) void complete(true);
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const begin = async () => {
    const session = sessionId ? { id: sessionId } : await start.mutateAsync({ plannedMinutes: minutes });
    setSessionId(session.id);
    if (!startedAt.current) startedAt.current = Date.now();
    endsAt.current = Date.now() + left * 1000;
    setRunning(true);
  };

  const complete = async (done: boolean) => {
    setRunning(false);
    const id = sessionId;
    if (!id) return;
    const actual = Math.max(1, Math.round((minutes * 60 - left) / 60));
    await finish.mutateAsync({ id, actualMinutes: done ? minutes : actual, isCompleted: done });
    setSessionId(null);
    startedAt.current = 0;
    setLeft(minutes * 60);
  };

  const pick = (value: number) => {
    if (running || sessionId) return;
    setMinutes(value);
    setLeft(value * 60);
  };

  const progress = 1 - left / (minutes * 60);

  return (
    <div className="page">
      <div className="page__head">
        <div style={{ display: 'grid', gap: 6 }}>
          <h1>Focus</h1>
          <span className="t-body-md c-secondary num">{todayMinutes ?? 0} minutes today</span>
        </div>
      </div>

      <div className="grid-main">
        <div className="focus-stage">
          <ProgressRing value={progress} size={280} stroke={18} color="var(--color-highlight)" track="var(--color-panel-muted)">
            <div style={{ textAlign: 'center' }}>
              <div className="focus-time">{clock(left)}</div>
              <div className="t-label-lg" style={{ color: 'var(--color-on-panel-muted)', marginTop: 6 }}>
                {running ? 'Deep work' : sessionId ? 'Paused' : `${minutes} min session`}
              </div>
            </div>
          </ProgressRing>

          <div className="row row--wrap" style={{ justifyContent: 'center', gap: 8 }} role="group" aria-label="Length">
            {PRESETS.map((value) => (
              <button
                key={value}
                type="button"
                className={`chip${minutes === value ? ' chip--selected' : ' chip--panel'}`}
                aria-pressed={minutes === value}
                disabled={running || !!sessionId}
                onClick={() => pick(value)}
              >
                {value} min
              </button>
            ))}
          </div>

          <div className="row" style={{ gap: 12 }}>
            {running ? (
              <Button size="lg" icon={<Pause size={20} />} onClick={() => setRunning(false)} style={{ minWidth: 160 }}>
                Pause
              </Button>
            ) : (
              <Button size="lg" icon={<Play size={20} />} onClick={() => void begin()} loading={start.isPending} style={{ minWidth: 160 }}>
                {sessionId ? 'Resume' : 'Start'}
              </Button>
            )}
            <Button size="lg" variant="panel" icon={sessionId ? <Square size={18} /> : <RotateCcw size={18} />} onClick={() => (sessionId ? void complete(false) : pick(minutes))} style={{ minWidth: 140 }}>
              {sessionId ? 'Stop' : 'Reset'}
            </Button>
          </div>
        </div>

        <Card>
          <div className="section-head">
            <h2>Recent sessions</h2>
          </div>
          {(recent ?? []).length === 0 ? (
            <EmptyState icon={Timer} title="No sessions yet" body="Your focus sessions from here and your phone show up here." />
          ) : (
            <ul className="list">
              {(recent ?? []).slice(0, 8).map((session) => (
                <li key={session.id} className="item" style={{ gridTemplateColumns: 'auto minmax(0,1fr) auto' }}>
                  <span className="gate__point-icon">
                    <Timer size={17} />
                  </span>
                  <div className="item__body">
                    <span className="item__title">{session.actualMinutes ?? session.plannedMinutes} min</span>
                    <span className="item__meta">{formatRelativeTime(session.startedAt)}</span>
                  </div>
                  <span className={`chip${session.isCompleted ? ' chip--selected' : ''}`}>{session.isCompleted ? 'Done' : 'Stopped'}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
