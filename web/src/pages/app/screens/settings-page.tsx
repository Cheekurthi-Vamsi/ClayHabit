import { useClerk, useUser } from '@clerk/react';
import { Cloud, KeyRound, LogOut, Lock, Moon, RefreshCw, Smartphone, Sun } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { cloudErrorMessage } from '@/lib/cloud/cloud-error';
import { passcodeProblem, WrongPasscodeError } from '@/lib/vault/keyring';

import { Button, Card, Segmented } from '../../../components/ui';
import { useTheme } from '../../../lib/theme';
import { useDocumentTitle } from '../../../lib/use-document-title';
import { useCloudSession, useSessionSnapshot } from '../session-context';

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

export function SettingsPage() {
  useDocumentTitle('Settings — ClayHabbit');
  const { user } = useUser();
  const clerk = useClerk();
  const session = useCloudSession();
  const { lastSyncedAt, status } = useSessionSnapshot();
  const { theme, setTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    await session.lock();
    await clerk.signOut({ redirectUrl: '/landing' });
  };

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <div className="page__head">
        <h1>Settings</h1>
      </div>

      <Card>
        <div className="row">
          {user?.hasImage ? (
            <img src={user.imageUrl} alt="" width={56} height={56} style={{ borderRadius: '50%' }} />
          ) : (
            <span className="avatar" style={{ width: 56, height: 56, fontSize: 22 }}>
              {(user?.firstName ?? '?').slice(0, 1)}
            </span>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="t-title-lg">{user?.fullName ?? 'You'}</div>
            <div className="t-body-sm c-secondary">{user?.primaryEmailAddress?.emailAddress}</div>
          </div>
          <Button variant="outline" icon={<LogOut size={18} />} loading={signingOut} onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </Card>

      <Card>
        <div className="section-head">
          <h2>Appearance</h2>
          {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
        </div>
        <Segmented label="Theme" options={THEMES} value={theme} onChange={setTheme} />
      </Card>

      <Card>
        <div className="section-head">
          <h2>Cloud</h2>
          <Cloud size={18} />
        </div>
        <div className="stack-sm">
          <p className="t-body-md c-secondary">
            Your data is sealed with AES-256-GCM in this browser and saved to your Google Drive’s private app folder a few seconds
            after each change. Nothing readable is stored in this browser.
          </p>
          <div className="row row--between row--wrap">
            <span className="t-label-lg">{lastSyncedAt ? `Last saved ${new Date(lastSyncedAt).toLocaleString()}` : 'Not saved yet'}</span>
            <Button variant="outline" size="sm" icon={<RefreshCw size={16} />} loading={status === 'syncing'} onClick={() => void session.syncNow()}>
              Sync now
            </Button>
          </div>
        </div>
      </Card>

      <ChangePasscode />

      <Card tone="muted">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <Smartphone size={20} style={{ flex: 'none', marginTop: 2 }} />
          <p className="t-body-sm c-secondary">
            App Lock, reminders, budgets and categories are managed in the ClayHabbit phone app. Reminders you set on the web ring on
            your phone after it syncs. Locked notes open only on the phone.
          </p>
        </div>
      </Card>
    </div>
  );
}

function ChangePasscode() {
  const session = useCloudSession();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const problem = passcodeProblem(next);
    if (problem) return setMessage({ ok: false, text: problem });
    if (next !== confirm) return setMessage({ ok: false, text: 'The new passcodes don’t match.' });
    setBusy(true);
    setMessage(null);
    try {
      await session.changePasscode(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setMessage({ ok: true, text: 'Passcode changed. Use the new one on every device from now on.' });
    } catch (caught) {
      setMessage({ ok: false, text: caught instanceof WrongPasscodeError ? 'Your current passcode isn’t right.' : cloudErrorMessage(caught) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div className="section-head">
        <h2>Data passcode</h2>
        <KeyRound size={18} />
      </div>
      <form onSubmit={submit} className="stack-sm">
        <div className="grid-3">
          <label className="field">
            <span className="field__label">Current</span>
            <input className="input" type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">New</span>
            <input className="input" type="password" autoComplete="new-password" value={next} onChange={(event) => setNext(event.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">New, again</span>
            <input className="input" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
          </label>
        </div>
        <p className="field__error" role="status" style={message?.ok ? { color: 'var(--color-success)' } : undefined}>
          {message?.text ?? ''}
        </p>
        <div className="row row--between row--wrap">
          <span className="t-body-sm c-tertiary">
            <Lock size={14} style={{ verticalAlign: -2 }} /> Your data key stays the same; only its lock changes.
          </span>
          <Button type="submit" size="sm" loading={busy} disabled={!current || !next || !confirm}>
            Change passcode
          </Button>
        </div>
      </form>
    </Card>
  );
}
