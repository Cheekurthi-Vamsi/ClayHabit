import { useUser } from '@clerk/react';
import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  Cloud,
  CloudOff,
  Flame,
  Home,
  NotebookPen,
  PiggyBank,
  RefreshCw,
  Settings,
  Target,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';

import RandomLetterSwapNav from '../../components/ui/m-random-letter-swap-1';
import { RandomLetterSwap } from '../../components/ui/random-letter-swap';
import { Brand, Button, ThemeToggle } from '../../components/ui';
import { ConfirmHost } from './confirm';
import { useCloudSession, useSessionSnapshot } from './session-context';

interface NavEntry {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Always in the bar; the rest fold into "More" on narrower screens. */
  primary?: boolean;
  /** In the phone-width bottom dock. */
  dock?: boolean;
}

const NAV: NavEntry[] = [
  { to: '/app', label: 'Today', icon: Home, primary: true, dock: true },
  { to: '/app/tasks', label: 'Tasks', icon: CheckSquare, primary: true, dock: true },
  { to: '/app/habits', label: 'Habits', icon: Flame, primary: true, dock: true },
  { to: '/app/focus', label: 'Focus', icon: Timer, primary: true, dock: true },
  { to: '/app/notes', label: 'Notes', icon: NotebookPen, primary: true, dock: true },
  { to: '/app/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/app/goals', label: 'Goals', icon: Target },
  { to: '/app/stats', label: 'Stats', icon: BarChart3 },
  { to: '/app/money', label: 'Money', icon: PiggyBank, primary: true, dock: true },
];

const SWAP = { staggerDuration: 0.025, transition: { duration: 0.6, type: 'spring' as const } };

function isActive(pathname: string, to: string): boolean {
  return to === '/app' ? pathname === '/app' || pathname === '/app/' : pathname === to || pathname.startsWith(`${to}/`);
}

function SyncPill() {
  const session = useCloudSession();
  const { status, lastSyncedAt } = useSessionSnapshot();
  const label =
    status === 'syncing'
      ? 'Saving…'
      : status === 'offline'
          ? 'Offline'
          : status === 'reconnect'
            ? 'Reconnect'
            : status === 'conflict'
              ? 'Needs a choice'
              : status === 'error'
                ? 'Not saved'
                : 'Saved';
  const tone =
    status === 'syncing' ? ' sync-pill--busy' : status === 'synced' ? '' : ' sync-pill--warn';
  const title = lastSyncedAt
    ? `Encrypted in your Google Drive · last saved ${new Date(lastSyncedAt).toLocaleTimeString()}`
    : 'Encrypted in your Google Drive';
  const onClick = status === 'reconnect' ? () => void session.reconnect() : () => void session.syncNow();
  return (
    <button type="button" className={`sync-pill${tone}`} onClick={onClick} title={title} aria-live="polite">
      <span className="sync-pill__dot" aria-hidden />
      {status === 'synced' ? <Cloud size={15} aria-hidden /> : status === 'offline' ? <CloudOff size={15} aria-hidden /> : <RefreshCw size={15} aria-hidden />}
      <span className="sync-pill__text">{label}</span>
    </button>
  );
}

function SyncBanner() {
  const session = useCloudSession();
  const { status, error, conflict } = useSessionSnapshot();
  if (status === 'reconnect') {
    return (
      <div className="banner" role="status">
        <CloudOff size={20} />
        <span className="banner__text">Google’s hour is up, so your Drive needs one click to keep saving. Your edits are safe in this tab.</span>
        <Button size="sm" onClick={() => void session.reconnect()}>
          Reconnect
        </Button>
      </div>
    );
  }
  if (status === 'conflict' && conflict) {
    return (
      <div className="banner" role="status">
        <RefreshCw size={20} />
        <span className="banner__text">
          This browser and your Cloud were both changed{conflict.device ? ` (Cloud copy from ${conflict.device})` : ''}. Pick the version to keep.
        </span>
        <Button size="sm" variant="outline" onClick={() => void session.resolveConflict('remote')}>
          Use Cloud copy
        </Button>
        <Button size="sm" onClick={() => void session.resolveConflict('local')}>
          Keep this browser’s
        </Button>
      </div>
    );
  }
  if (status === 'error' && error) {
    return (
      <div className="banner banner--error" role="alert">
        <CloudOff size={20} />
        <span className="banner__text">{error}</span>
        <Button size="sm" variant="outline" onClick={() => void session.syncNow()}>
          Try again
        </Button>
      </div>
    );
  }
  return null;
}

/** The pages that don't fit in the bar on medium screens, in a small menu. */
function MoreMenu({ entries, pathname }: { entries: NavEntry[]; pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeEntry = entries.find((entry) => isActive(pathname, entry.to));

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="more" ref={ref}>
      <button
        type="button"
        className={`lsnav__item${activeEntry ? ' lsnav__item--active' : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <RandomLetterSwap label={activeEntry?.label ?? 'More'} {...SWAP} />
        <ChevronDown size={15} style={{ marginLeft: 4 }} aria-hidden />
      </button>
      {open ? (
        <div className="more__menu" role="menu">
          {entries.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} role="menuitem" className={`more__item${isActive(pathname, to) ? ' more__item--active' : ''}`}>
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AppLayout() {
  const { user } = useUser();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const link = (entry: NavEntry) => ({
    label: entry.label,
    active: isActive(pathname, entry.to),
    render: (children: ReactNode, className: string) => (
      <NavLink to={entry.to} end={entry.to === '/app'} className={className}>
        {children}
      </NavLink>
    ),
  });

  return (
    <div className="shell">
      <header className={`topbar${scrolled ? ' is-scrolled' : ''}`}>
        <Link to="/app" className="topbar__brand" aria-label="ClayHabbit, today">
          <Brand size={22} mono />
        </Link>

        {/* Top middle: every page, on wide screens. */}
        <div className="topbar__nav topbar__nav--wide">
          <RandomLetterSwapNav links={NAV.map(link)} />
        </div>
        {/* Medium screens: the main five, and the rest under "More". */}
        <div className="topbar__nav topbar__nav--medium">
          <nav className="lsnav" aria-label="Main">
            {NAV.filter((entry) => entry.primary).map((entry) => (
              <NavLink
                key={entry.to}
                to={entry.to}
                end={entry.to === '/app'}
                className={`lsnav__item${isActive(pathname, entry.to) ? ' lsnav__item--active' : ''}`}
              >
                <RandomLetterSwap label={entry.label} {...SWAP} />
              </NavLink>
            ))}
            <MoreMenu entries={NAV.filter((entry) => !entry.primary)} pathname={pathname} />
          </nav>
        </div>

        <div className="topbar__actions">
          <SyncPill />
          <ThemeToggle />
          <NavLink
            to="/app/settings"
            className={({ isActive: on }) => `topbar__avatar${on ? ' topbar__avatar--active' : ''}`}
            aria-label="Settings"
            title="Settings"
          >
            {user?.hasImage ? <img src={user.imageUrl} alt="" width={40} height={40} /> : <Settings size={18} />}
          </NavLink>
        </div>
      </header>

      <main className="main">
        {/* Floats over the page, so appearing or clearing never moves the content. */}
        <div className="banner-slot">
          <SyncBanner />
        </div>
        <Outlet />
      </main>

      <nav className="dock" aria-label="Main">
        {NAV.filter((entry) => entry.dock).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/app'} aria-label={label} className={({ isActive: on }) => (on ? 'active' : '')}>
            <Icon size={21} strokeWidth={2.3} />
          </NavLink>
        ))}
        <NavLink to="/app/settings" aria-label="Settings" className={({ isActive: on }) => (on ? 'active' : '')}>
          <Settings size={21} strokeWidth={2.3} />
        </NavLink>
      </nav>
      <ConfirmHost />
    </div>
  );
}
