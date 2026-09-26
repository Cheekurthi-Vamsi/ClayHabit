import { useAuth } from '@clerk/react';
import { ArrowRight, Cloud, Lock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router';

import getStarted from '@/assets/images/onboarding/get-started.jpg';

import { Brand, Button, Chip, ThemeToggle } from '../components/ui';
import { useDocumentTitle } from '../lib/use-document-title';

/**
 * The first page, like the phone's Get Started: the "Small steps lead to big
 * changes" art and one lime button onward. The art box has its exact aspect
 * ratio before the image arrives, so nothing on the page moves when it loads.
 */
export function WelcomePage() {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  useDocumentTitle('ClayHabbit — small steps, big changes');

  return (
    <main className="welcome">
      <div aria-hidden>
        <span className="welcome__orb" style={{ width: 520, height: 520, top: -180, left: -160, background: '#7BBDE8' }} />
        <span
          className="welcome__orb"
          style={{ width: 460, height: 460, bottom: -200, right: -120, background: '#CFF400', opacity: 0.28, ['--dx' as string]: '-30px', animationDuration: '18s' }}
        />
        <span
          className="welcome__orb"
          style={{ width: 300, height: 300, top: '40%', left: '46%', background: '#BDD8E9', opacity: 0.45, ['--dy' as string]: '-26px', animationDuration: '16s' }}
        />
      </div>

      <header className="container welcome__top">
        <Brand mono />
        <ThemeToggle />
      </header>

      <section className="container welcome__stage" aria-labelledby="welcome-title">
        <div className="welcome__copy">
          <div className="welcome__steps">
            <Chip tone="primary" icon={<Sparkles size={14} />}>
              Habits · Tasks · Notes · Money
            </Chip>
          </div>
          <h1 id="welcome-title" className="welcome__title">
            Your whole life,
            <br />
            <span className="accent">one calm place.</span>
          </h1>
          <p className="welcome__lead">
            ClayHabbit keeps your habits, tasks, notes, calendar and money in one calm place — on your phone and
            now on the web, encrypted and kept in your own Google Drive.
          </p>
          <div className="welcome__actions">
            <Button size="lg" trailingIcon={<ArrowRight size={20} strokeWidth={2.4} />} onClick={() => navigate('/landing')}>
              Get Started
            </Button>
            <Button variant="ghost" size="lg" onClick={() => navigate(isSignedIn ? '/app' : '/sign-in')}>
              {isSignedIn ? 'Open my space' : 'I already have an account'}
            </Button>
          </div>
          <div className="welcome__steps" aria-label="Why it’s private">
            <Chip icon={<Lock size={14} />}>AES-256 encrypted</Chip>
            <Chip icon={<Cloud size={14} />}>Your own Google Drive</Chip>
          </div>
        </div>

        <div className="welcome__art">
          <img
            src={getStarted}
            width={720}
            height={970}
            alt="Small steps lead to big changes: a student with a laptop climbs a staircase of books toward a flag."
            fetchPriority="high"
            decoding="async"
          />
        </div>
      </section>

      <footer className="welcome__bottom c-tertiary t-body-sm">© {new Date().getFullYear()} ClayHabbit</footer>
    </main>
  );
}
