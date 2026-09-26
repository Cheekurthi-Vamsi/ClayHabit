import './landing.css';

import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckSquare,
  Cloud,
  EyeOff,
  Fingerprint,
  Flame,
  HardDrive,
  KeyRound,
  Laptop,
  Lock,
  NotebookPen,
  PiggyBank,
  ServerOff,
  Smartphone,
  Sparkles,
  Timer,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router';

import { SiteFooter, SiteNav } from '../../components/site-chrome';
import { Button, Reveal } from '../../components/ui';
import { useDocumentTitle } from '../../lib/use-document-title';
import {
  CalendarVisual,
  FocusVisual,
  HeatmapVisual,
  LaptopDashboard,
  MoneyVisual,
  NoteVisual,
  PhoneHabits,
  TasksVisual,
} from './previews';

export function LandingPage() {
  useDocumentTitle('ClayHabbit — habits, tasks, notes and money, privately');
  return (
    <div className="landing">
      <SiteNav />
      <main>
        <Hero />
        <StatsStrip />
        <Features />
        <Ecosystem />
        <Security />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

// ---- Hero ---------------------------------------------------------------------------------------

function Hero() {
  const navigate = useNavigate();
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="backdrop" aria-hidden>
        <div className="backdrop__grid" />
        <span className="backdrop__orb" style={{ width: 560, height: 560, top: -220, left: -180, background: 'var(--color-accent-lavender)', opacity: 0.4 }} />
        <span
          className="backdrop__orb"
          style={{ width: 480, height: 480, top: 120, right: -200, background: 'var(--color-highlight)', opacity: 0.22, animationDuration: '20s' }}
        />
      </div>

      <div className="container hero__grid">
        <div className="hero__copy">
          <span className="eyebrow">
            <span className="eyebrow__dot">
              <Sparkles size={13} strokeWidth={2.6} />
            </span>
            Now on the web — the same space as your phone
          </span>
          <h1 id="hero-title" className="hero__title">
            Build the life you want, <em className="mark">calmly.</em>
            <br />
            <span className="soft">One place for it all.</span>
          </h1>
          <p className="hero__lead">
            Habits, tasks, notes, calendar, focus and money — one quiet space on your phone and your laptop. Your data
            is encrypted before it leaves your device and lives in your own Google Drive, not on our servers.
          </p>
          <div className="hero__actions">
            <Button size="lg" trailingIcon={<ArrowRight size={20} strokeWidth={2.4} />} onClick={() => navigate('/sign-in')}>
              Start free with Google
            </Button>
            <Button size="lg" variant="outline" icon={<Smartphone size={20} />} onClick={() => navigate('/download')}>
              Get the Android app
            </Button>
          </div>
          <div className="hero__trust">
            <span>
              <Lock size={16} /> AES-256-GCM
            </span>
            <span>
              <HardDrive size={16} /> Your Google Drive
            </span>
            <span>
              <ServerOff size={16} /> No ClayHabbit server
            </span>
          </div>
        </div>

        <div className="devices" role="img" aria-label="ClayHabbit on a laptop and a phone, showing today’s tasks, streak and habits.">
          <div className="laptop">
            <div className="laptop__screen">
              <div className="laptop__display">
                <LaptopDashboard />
              </div>
            </div>
            <div className="laptop__base" />
          </div>
          <div className="phone">
            <span className="phone__notch" />
            <div className="phone__display">
              <PhoneHabits />
            </div>
          </div>
          <div className="float-chip" style={{ left: '-3%', bottom: '14%', animationDelay: '-2s' }}>
            <span className="float-chip__icon">
              <Flame size={16} />
            </span>
            <span>
              24-day streak
              <small>Keep it going</small>
            </span>
          </div>
          <div className="float-chip" style={{ right: '8%', top: '-2%', animationDelay: '-4s' }}>
            <span className="float-chip__icon" style={{ background: 'var(--color-primary)', color: '#fff' }}>
              <Lock size={15} />
            </span>
            <span>
              Encrypted sync
              <small>Phone ↔ Drive ↔ Web</small>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---- Stats strip ----------------------------------------------------------------------------------

function StatsStrip() {
  const items = [
    { value: '7', label: 'tools in one calm app' },
    { value: '600k', label: 'PBKDF2 rounds on your passcode' },
    { value: '256-bit', label: 'AES-GCM encryption' },
    { value: '0', label: 'ClayHabbit servers holding your data' },
  ];
  return (
    <div className="container">
      <Reveal className="strip">
        {items.map((item) => (
          <div key={item.label} className="strip__item">
            <span className="strip__value num">{item.value}</span>
            <span className="strip__label">{item.label}</span>
          </div>
        ))}
      </Reveal>
    </div>
  );
}

// ---- Features -------------------------------------------------------------------------------------

function Features() {
  return (
    <section id="features" className="section" aria-labelledby="features-title" style={{ scrollMarginTop: 80 }}>
      <div className="container">
        <Reveal className="section__head">
          <span className="section__kicker">Everything, together</span>
          <h2 id="features-title" className="section__title">
            Seven tools that finally <em className="mark">talk to each other.</em>
          </h2>
          <p className="section__lead">
            Your tasks know your goals, your notes turn into tasks, your streak counts every habit, and your money sits
            next to your plans. One app instead of seven.
          </p>
        </Reveal>

        <div className="bento">
          <Reveal as="article" className="tile span-7">
            <div className="tile__head">
              <span className="tile__icon">
                <Flame size={22} />
              </span>
              <h3 className="tile__title">Habits that stick</h3>
              <p className="tile__text">Daily or weekly habits with icons, colours, streaks and a year-long heatmap of every check-in.</p>
            </div>
            <div className="tile__visual">
              <HeatmapVisual />
            </div>
          </Reveal>

          <Reveal as="article" className="tile span-5" delay={80}>
            <div className="tile__head">
              <span className="tile__icon">
                <CheckSquare size={22} />
              </span>
              <h3 className="tile__title">Tasks with a plan</h3>
              <p className="tile__text">Due dates, repeats, priorities, projects and subtasks — and a clear “next up”.</p>
            </div>
            <div className="tile__visual">
              <TasksVisual />
            </div>
          </Reveal>

          <Reveal as="article" className="tile span-4">
            <div className="tile__head">
              <span className="tile__icon">
                <NotebookPen size={22} />
              </span>
              <h3 className="tile__title">Notes worth keeping</h3>
              <p className="tile__text">Markdown, checklists, folders, papers — lock the private ones.</p>
            </div>
            <div className="tile__visual">
              <NoteVisual />
            </div>
          </Reveal>

          <Reveal as="article" className="tile tile--panel span-4" delay={80}>
            <div className="tile__head">
              <span className="tile__icon">
                <CalendarDays size={22} />
              </span>
              <h3 className="tile__title">Calendar &amp; goals</h3>
              <p className="tile__text">See the month at a glance and tie every task to what it’s for.</p>
            </div>
            <div className="tile__visual">
              <CalendarVisual />
            </div>
          </Reveal>

          <Reveal as="article" className="tile tile--lime span-4" delay={160}>
            <div className="tile__head">
              <span className="tile__icon">
                <Timer size={22} />
              </span>
              <h3 className="tile__title">Focus sessions</h3>
              <p className="tile__text">A calm timer for deep work, counted in your stats.</p>
            </div>
            <div className="tile__visual">
              <FocusVisual />
            </div>
          </Reveal>

          <Reveal as="article" className="tile span-full">
            <div className="tile__head" style={{ maxWidth: 520 }}>
              <span className="tile__icon" style={{ background: 'var(--color-finance-muted)', color: 'var(--color-finance-text)' }}>
                <PiggyBank size={22} />
              </span>
              <h3 className="tile__title">Money, in the same calm place</h3>
              <p className="tile__text">
                Income and expenses, budgets that warn you early, savings plans and multi-year stats — a whole finance
                space one tap away from your day.
              </p>
            </div>
            <div className="tile__visual tile__visual--tall">
              <MoneyVisual />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ---- Ecosystem ------------------------------------------------------------------------------------

function DeviceNode({ x, label, sub, icon }: { x: number; label: string; sub: string; icon: 'phone' | 'drive' | 'web' }) {
  const fill = icon === 'drive' ? '#CFF400' : '#0A2F53';
  const text = icon === 'drive' ? '#141512' : '#FFFFFF';
  return (
    <g transform={`translate(${x} 60)`}>
      {/* The cartoon hard shadow, then the face. */}
      <rect x="-110" y="6" width="220" height="190" rx="32" fill="#050607" />
      <rect x="-110" y="0" width="220" height="190" rx="32" fill={fill} stroke="#050607" strokeWidth="3" />
      <foreignObject x="-110" y="0" width="220" height="190">
        <div
          style={{
            height: '100%',
            display: 'grid',
            placeItems: 'center',
            alignContent: 'center',
            gap: 10,
            color: text,
            textAlign: 'center',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {icon === 'phone' ? <Smartphone size={42} /> : icon === 'drive' ? <Cloud size={42} /> : <Laptop size={42} />}
          <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>{label}</div>
          <div style={{ fontWeight: 600, fontSize: 13, opacity: 0.75 }}>{sub}</div>
        </div>
      </foreignObject>
    </g>
  );
}

function Ecosystem() {
  return (
    <section id="ecosystem" className="section eco" aria-labelledby="eco-title" style={{ scrollMarginTop: 80 }}>
      <span className="eco__glow" aria-hidden style={{ width: 500, height: 500, top: -200, left: -120, background: '#49769F' }} />
      <span className="eco__glow" aria-hidden style={{ width: 420, height: 420, bottom: -200, right: -100, background: '#CFF400', opacity: 0.18 }} />
      <div className="container">
        <Reveal className="section__head section__head--center">
          <span className="section__kicker">One ecosystem</span>
          <h2 id="eco-title" className="section__title">
            Your phone and the web,
            <br />
            <em>always in step.</em>
          </h2>
          <p className="section__lead">
            There’s no ClayHabbit cloud in the middle. Each device seals your data with your key and keeps one copy
            in your own Google Drive — so your phone, and now your browser, pick up exactly where you left off.
          </p>
        </Reveal>

        <Reveal className="eco__diagram" delay={100}>
          <svg viewBox="0 0 1100 360" role="img" aria-label="Phone and web each sync an encrypted copy through your Google Drive">
            <path d="M290 150 H 440" stroke="#CFF400" strokeWidth="4" fill="none" strokeLinecap="round" className="eco__flow" />
            <path d="M290 170 H 440" stroke="#7BBDE8" strokeWidth="4" fill="none" strokeLinecap="round" className="eco__flow eco__flow--back" />
            <path d="M660 150 H 810" stroke="#CFF400" strokeWidth="4" fill="none" strokeLinecap="round" className="eco__flow eco__flow--back" />
            <path d="M660 170 H 810" stroke="#7BBDE8" strokeWidth="4" fill="none" strokeLinecap="round" className="eco__flow" />
            <g transform="translate(365 108)">
              <rect x="-50" y="-18" width="100" height="36" rx="18" fill="#161719" stroke="#363940" />
              <text x="0" y="5" textAnchor="middle" fontSize="13" fontWeight="700" fill="#BDD8E9">
                🔒 sealed
              </text>
            </g>
            <g transform="translate(735 108)">
              <rect x="-50" y="-18" width="100" height="36" rx="18" fill="#161719" stroke="#363940" />
              <text x="0" y="5" textAnchor="middle" fontSize="13" fontWeight="700" fill="#BDD8E9">
                🔒 sealed
              </text>
            </g>
            <DeviceNode x={180} icon="phone" label="Your phone" sub="SQLCipher database" />
            <DeviceNode x={550} icon="drive" label="Your Drive" sub="Private app folder" />
            <DeviceNode x={920} icon="web" label="The web" sub="Kept in memory only" />
          </svg>
        </Reveal>

        <div className="eco__steps">
          {[
            {
              title: 'Sign in with Google',
              text: 'One account everywhere. No new password to invent, and ClayHabbit only learns your name and email.',
            },
            {
              title: 'Unlock with your passcode',
              text: 'Your data passcode opens your key on each device. Without it, the copy in Drive is unreadable — to anyone.',
            },
            {
              title: 'Pick up where you left off',
              text: 'Changes save to your Drive a few seconds after you make them. If two devices change at once, you choose.',
            },
          ].map((step, index) => (
            <Reveal key={step.title} className="eco__step" delay={index * 90}>
              <span className="eco__step-num">{index + 1}</span>
              <h3 className="t-title-lg">{step.title}</h3>
              <p>{step.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- Security -------------------------------------------------------------------------------------

function VaultArt() {
  return (
    <div className="vault" aria-hidden>
      <svg viewBox="0 0 420 420">
        <g className="vault__spin">
          <circle cx="210" cy="210" r="196" fill="none" stroke="var(--color-border-strong)" strokeWidth="2" strokeDasharray="4 10" />
        </g>
        <g className="vault__spin vault__spin--rev">
          <circle cx="210" cy="210" r="160" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeDasharray="60 22" opacity="0.5" />
        </g>
        <circle cx="210" cy="216" r="122" fill="var(--ink)" />
        <circle cx="210" cy="210" r="122" fill="var(--color-surface)" stroke="var(--ink)" strokeWidth="3" />
        <rect x="160" y="190" width="100" height="84" rx="20" fill="var(--color-highlight)" stroke="var(--ink)" strokeWidth="3" />
        <path d="M178 190 v-22 a32 32 0 0 1 64 0 v22" fill="none" stroke="var(--ink)" strokeWidth="10" strokeLinecap="round" />
        <circle cx="210" cy="226" r="9" fill="var(--ink)" />
        <rect x="206" y="228" width="8" height="22" rx="4" fill="var(--ink)" />
        {['AES-256', 'GCM', 'PBKDF2', 'SHA-256'].map((label, i) => {
          const angle = (i / 4) * Math.PI * 2 - Math.PI / 4;
          const x = 210 + Math.cos(angle) * 160;
          const y = 210 + Math.sin(angle) * 160;
          return (
            <g key={label} transform={`translate(${x} ${y})`}>
              <rect x="-44" y="-16" width="88" height="32" rx="16" fill="var(--color-panel)" stroke="var(--ink)" strokeWidth="2" />
              <text x="0" y="5" textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--color-on-panel)">
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Security() {
  const cards = [
    {
      icon: Lock,
      title: 'Sealed before it leaves',
      text: (
        <>
          Every copy is encrypted with <code>AES-256-GCM</code> on your device, with a fresh nonce each time. The
          128-bit tag means any change on the way is caught.
        </>
      ),
    },
    {
      icon: KeyRound,
      title: 'A key only your passcode opens',
      text: (
        <>
          Your data key is locked with your passcode through <code>PBKDF2-SHA256</code> at 600,000 rounds. We never
          store the passcode — a wrong one simply fails to open.
        </>
      ),
    },
    {
      icon: Smartphone,
      title: 'Encrypted on your phone too',
      text: (
        <>
          The phone’s database is <code>SQLCipher</code>-encrypted with the same key, kept in the Android Keystore or
          iOS Keychain, and App Lock adds a PIN or biometrics.
        </>
      ),
    },
    {
      icon: HardDrive,
      title: 'Only its own folder in your Drive',
      text: (
        <>
          ClayHabbit asks for <code>drive.appdata</code> only: a hidden folder just for this app. It can’t see, list
          or touch any of your other files.
        </>
      ),
    },
    {
      icon: Fingerprint,
      title: 'Bound to your account',
      text: (
        <>
          Each copy is fingerprinted with <code>SHA-256</code> and tied to your account and key, so it can’t be
          swapped for someone else’s or quietly altered.
        </>
      ),
    },
    {
      icon: EyeOff,
      title: 'The web keeps nothing',
      text: (
        <>
          In the browser your data lives in memory for the visit, then it’s gone. Nothing readable is written to
          the browser’s storage — close the tab and it’s locked again.
        </>
      ),
    },
  ];

  return (
    <section id="security" className="section" aria-labelledby="security-title" style={{ scrollMarginTop: 80 }}>
      <div className="container security">
        <div className="security__intro">
          <Reveal className="section__head" style={{ marginBottom: 0 }}>
            <span className="section__kicker">Private by design</span>
            <h2 id="security-title" className="section__title">
              Your life is <em className="mark">nobody’s</em> business.
            </h2>
            <p className="section__lead">
              Not ours, not Google’s, not the sign-in provider’s. ClayHabbit is built so that only you, with your
              passcode, can ever read what you write.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <VaultArt />
          </Reveal>
        </div>

        <div className="security__grid">
          {cards.map(({ icon: Icon, title, text }, index) => (
            <Reveal key={title} as="article" className="sec-card" delay={(index % 2) * 90}>
              <span className="sec-card__icon">
                <Icon size={22} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </Reveal>
          ))}
          <Reveal className="never">
            <h3 className="t-title-lg">What ClayHabbit never does</h3>
            <ul>
              {[
                'Store your data on a ClayHabbit server',
                'See your passcode or your key',
                'Read or list your other Drive files',
                'Keep your data anywhere but your devices and your Drive',
              ].map((item) => (
                <li key={item}>
                  <X size={18} strokeWidth={3} />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ---- Final call to action --------------------------------------------------------------------------

function FinalCta() {
  const navigate = useNavigate();
  return (
    <section className="section" style={{ paddingTop: 0 }} aria-labelledby="cta-title">
      <div className="container">
        <Reveal className="cta">
          <span className="cta__ring" aria-hidden />
          <div>
            <h2 id="cta-title" className="cta__title">
              Start with one
              <br />
              <em>small step.</em>
            </h2>
            <p>Sign in with Google, choose a passcode, and your space is ready — here and on your phone.</p>
          </div>
          <div className="cta__actions">
            <Button variant="panel" size="lg" trailingIcon={<ArrowRight size={20} strokeWidth={2.4} />} onClick={() => navigate('/sign-in')}>
              Get started free
            </Button>
            <Button variant="outline" size="lg" icon={<Smartphone size={20} />} onClick={() => navigate('/download')}>
              Download for Android
            </Button>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', fontWeight: 700, fontSize: 14 }}>
              {['Free', 'Your data, your Drive'].map((item) => (
                <span key={item} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <Check size={16} strokeWidth={3} />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
