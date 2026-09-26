import { useClerk } from '@clerk/react';
import { Cloud, Eye, EyeOff, HardDrive, KeyRound, Laptop, Lock, RefreshCw, ShieldCheck, Smartphone } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';

import { passcodeProblem } from '@/lib/vault/keyring';

import { Button, GoogleButton, Spinner } from '../../components/ui';
import type { SessionPhase } from '../../lib/cloud-session';
import { preloadGoogle } from '../../lib/google-drive';
import { useDocumentTitle } from '../../lib/use-document-title';
import { useCloudSession } from './session-context';

type PhaseOf<N extends SessionPhase['name']> = Extract<SessionPhase, { name: N }>;

function GateFrame({ icon, title, subtitle, children }: { icon: ReactNode; title: string; subtitle: string; children: ReactNode }) {
  useDocumentTitle(`${title} — ClayHabbit`);
  return (
    <main className="gate">
      <section className="gate__card" aria-labelledby="gate-title">
        <span className="gate__icon" aria-hidden>
          {icon}
        </span>
        <div style={{ display: 'grid', gap: 8 }}>
          <h1 id="gate-title" className="t-headline-lg">
            {title}
          </h1>
          <p className="t-body-md c-secondary">{subtitle}</p>
        </div>
        {children}
      </section>
    </main>
  );
}

function Point({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="gate__point">
      <span className="gate__point-icon" aria-hidden>
        {icon}
      </span>
      <div>
        <div className="t-title-md">{title}</div>
        <div className="t-body-sm c-secondary">{body}</div>
      </div>
    </div>
  );
}

/** Always reserves its line, so an error appearing never pushes the buttons down. */
function ErrorLine({ message }: { message: string | null }) {
  return (
    <p className="field__error" role="alert" style={{ margin: 0 }}>
      {message ?? ''}
    </p>
  );
}

function SignOutLink() {
  const clerk = useClerk();
  return (
    <button type="button" className="link" style={{ justifySelf: 'center' }} onClick={() => void clerk.signOut({ redirectUrl: '/landing' })}>
      Use a different ClayHabbit account
    </button>
  );
}

// ---- Connect ----------------------------------------------------------------------------------

export function ConnectScreen({ phase }: { phase: PhaseOf<'connect'> }) {
  const session = useCloudSession();
  useEffect(() => preloadGoogle(), []);
  return (
    <GateFrame
      icon={<Cloud size={28} />}
      title="Connect your Cloud"
      subtitle="Your ClayHabbit data lives in your own Google Drive, encrypted. Connect it to open your space here."
    >
      <div className="gate__points">
        <Point icon={<HardDrive size={18} />} title="Only ClayHabbit’s folder" body="A private app folder in your Drive. Nothing else in your Drive is visible." />
        <Point icon={<Lock size={18} />} title="Still encrypted" body="What’s in Drive stays sealed until your passcode unlocks it, in this tab." />
        <Point icon={<Laptop size={18} />} title="Nothing kept in this browser" body="Your data lives in memory while you use it, then it’s gone." />
      </div>
      <ErrorLine message={phase.error} />
      <GoogleButton label="Connect Google Drive" busyLabel="Waiting for Google…" busy={phase.busy} onClick={() => void session.connect()} />
      <SignOutLink />
    </GateFrame>
  );
}

// ---- Passcode ---------------------------------------------------------------------------------

function PasscodeField({
  label,
  value,
  onChange,
  autoFocus,
  autoComplete,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  autoComplete: 'current-password' | 'new-password';
  invalid?: boolean;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          className="input"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          aria-invalid={invalid || undefined}
          style={{ paddingRight: 56 }}
          spellCheck={false}
        />
        <button
          type="button"
          className="icon-btn icon-btn--ghost icon-btn--sm"
          style={{ position: 'absolute', right: 8, top: 8 }}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide passcode' : 'Show passcode'}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

function useCountdown(until: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [until]);
  return Math.max(0, Math.ceil((until - now) / 1000));
}

export function UnlockScreen({ phase }: { phase: PhaseOf<'unlock'> }) {
  const session = useCloudSession();
  const [passcode, setPasscode] = useState('');
  const wait = useCountdown(phase.waitUntil);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!passcode || phase.busy || wait > 0) return;
    void session.unlock(passcode);
  };

  return (
    <GateFrame
      icon={<KeyRound size={28} />}
      title="Unlock your space"
      subtitle="Enter the data passcode you chose in the ClayHabbit app. It unlocks your key right here in the browser."
    >
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <PasscodeField label="Data passcode" value={passcode} onChange={setPasscode} autoFocus autoComplete="current-password" invalid={!!phase.error} />
        <ErrorLine message={wait > 0 ? `Too many tries. Try again in ${wait} s.` : phase.error} />
        <Button type="submit" size="lg" fullWidth loading={phase.busy} disabled={!passcode || wait > 0} icon={<Lock size={18} />}>
          {phase.busy ? 'Unlocking…' : 'Unlock'}
        </Button>
      </form>
      <p className="t-body-sm c-tertiary" style={{ textAlign: 'center' }}>
        Forgot it? Without it nobody can open this data — not even us. The phone app can start over, which erases the Cloud copy.
      </p>
      <SignOutLink />
    </GateFrame>
  );
}

export function CreatePasscodeScreen({ phase }: { phase: PhaseOf<'create'> }) {
  const session = useCloudSession();
  const [passcode, setPasscode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);

  const problem = passcodeProblem(passcode);
  const mismatch = confirm.length > 0 && confirm !== passcode;
  const shown = touched ? (problem ?? (mismatch ? 'The two passcodes don’t match.' : null)) : null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (problem || passcode !== confirm || phase.busy) return;
    void session.create(passcode);
  };

  return (
    <GateFrame
      icon={<ShieldCheck size={28} />}
      title="Choose a data passcode"
      subtitle="It encrypts everything you keep in ClayHabbit — here and on your phone. At least 8 characters with letters and numbers."
    >
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <PasscodeField label="New passcode" value={passcode} onChange={setPasscode} autoFocus autoComplete="new-password" invalid={touched && !!problem} />
        <PasscodeField label="Type it again" value={confirm} onChange={setConfirm} autoComplete="new-password" invalid={touched && mismatch} />
        <ErrorLine message={phase.error ?? shown} />
        <Button type="submit" size="lg" fullWidth loading={phase.busy}>
          {phase.busy ? 'Creating your key…' : 'Create my encrypted space'}
        </Button>
      </form>
      <p className="t-body-sm c-tertiary" style={{ textAlign: 'center' }}>
        There’s no reset: nobody else can recover it. Write it down somewhere safe.
      </p>
      <SignOutLink />
    </GateFrame>
  );
}

// ---- Working / choose ----------------------------------------------------------------------------

export function WorkingScreen({ message }: { message: string }) {
  useDocumentTitle('ClayHabbit');
  return (
    <main className="gate">
      <div className="gate__center" role="status">
        <Spinner label={message} />
        <p className="t-title-md c-secondary">{message}</p>
      </div>
    </main>
  );
}

export function ChooseCopyScreen({ phase }: { phase: PhaseOf<'choose'> }) {
  const session = useCloudSession();
  const saved = phase.remote.savedAt ? new Date(phase.remote.savedAt).toLocaleString() : 'recently';
  return (
    <GateFrame
      icon={<RefreshCw size={28} />}
      title="Two versions found"
      subtitle={`Your Cloud copy was saved ${saved}${phase.remote.device ? ` on ${phase.remote.device}` : ''}. Choose which to keep.`}
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <Button size="lg" fullWidth icon={<Smartphone size={18} />} loading={phase.busy} onClick={() => void session.choose('remote')}>
          Use the Cloud copy
        </Button>
        <Button size="lg" variant="outline" fullWidth disabled={phase.busy} onClick={() => void session.choose('local')}>
          Keep this browser’s
        </Button>
      </div>
    </GateFrame>
  );
}
