import { useAuth } from '@clerk/react';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import RandomLetterSwapNav from './ui/m-random-letter-swap-1';
import { Brand, Button, ThemeToggle } from './ui';

const SECTIONS = [
  { id: 'features', label: 'Features' },
  { id: 'ecosystem', label: 'Ecosystem' },
  { id: 'security', label: 'Security' },
];

/** The section in view, so the nav can light it up as you read. */
function useSectionInView(ids: string[]): string | null {
  const [current, setCurrent] = useState<string | null>(null);
  useEffect(() => {
    const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (!elements.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setCurrent(visible.target.id);
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.25, 0.5] },
    );
    elements.forEach((element) => observer.observe(element));
    const onTop = () => window.scrollY < 200 && setCurrent(null);
    window.addEventListener('scroll', onTop, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onTop);
    };
  }, [ids]);
  return current;
}

/**
 * The marketing pages' top bar: transparent, fixed height, with the letter-swap
 * links in the middle. Nothing in it changes size as you scroll.
 */
export function SiteNav({ links = true }: { links?: boolean }) {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const current = useSectionInView(links ? SECTIONS.map((section) => section.id) : []);

  return (
    <header className="site-nav">
      <div className="container site-nav__inner">
        <Link to="/" aria-label="ClayHabbit home" className="site-nav__brand">
          <Brand size={23} mono />
        </Link>
        {links ? (
          <div className="site-nav__center">
            <RandomLetterSwapNav
              label="Sections"
              links={SECTIONS.map((section) => ({
                label: section.label,
                active: current === section.id,
                render: (children, className) => (
                  <a href={`#${section.id}`} className={className}>
                    {children}
                  </a>
                ),
              }))}
            />
          </div>
        ) : null}
        <div className="site-nav__actions">
          <ThemeToggle />
          {isSignedIn ? null : (
            <Button variant="ghost" size="sm" className="site-nav__signin" onClick={() => navigate('/sign-in')}>
              Sign in
            </Button>
          )}
          <Button size="sm" trailingIcon={<ArrowRight size={16} strokeWidth={2.5} />} onClick={() => navigate(isSignedIn ? '/app' : '/sign-in')}>
            {isSignedIn ? 'Open app' : 'Get started'}
          </Button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div style={{ display: 'grid', gap: 8 }}>
          <Brand size={19} mono />
          <span className="t-body-sm">Small steps, big changes. © {new Date().getFullYear()} ClayHabbit.</span>
        </div>
        <nav className="site-footer__links" aria-label="Footer">
          <a href="/landing#features">Features</a>
          <a href="/landing#ecosystem">Ecosystem</a>
          <a href="/landing#security">Security</a>
          <Link to="/download">Android app</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/sign-in">Sign in</Link>
        </nav>
      </div>
    </footer>
  );
}
