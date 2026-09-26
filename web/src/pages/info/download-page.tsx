import './info.css';

import { Download, ExternalLink, Globe, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { SiteFooter, SiteNav } from '../../components/site-chrome';
import { Button } from '../../components/ui';
import { APK_URL, GITHUB_REPO, RELEASES_URL } from '../../lib/config';
import { useDocumentTitle } from '../../lib/use-document-title';

interface LatestRelease {
  version: string;
  publishedAt: string;
  sizeMb: number | null;
  url: string;
}

/** The newest release's version and size, from GitHub's public API. Nothing is sent about the visitor. */
function useLatestRelease(): LatestRelease | null | 'unavailable' {
  const [release, setRelease] = useState<LatestRelease | null | 'unavailable'>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((json: { tag_name: string; published_at: string; html_url: string; assets?: { name: string; size: number }[] }) => {
        if (cancelled) return;
        const apk = json.assets?.find((asset) => asset.name === 'ClayHabbit.apk');
        setRelease({
          version: json.tag_name.replace(/^v/, ''),
          publishedAt: json.published_at,
          sizeMb: apk ? Math.round((apk.size / 1024 / 1024) * 10) / 10 : null,
          url: json.html_url,
        });
      })
      .catch(() => !cancelled && setRelease('unavailable'));
    return () => {
      cancelled = true;
    };
  }, []);
  return release;
}

export function DownloadPage() {
  useDocumentTitle('Download ClayHabbit for Android');
  const navigate = useNavigate();
  const release = useLatestRelease();

  return (
    <div className="landing">
      <SiteNav links={false} />
      <main className="container info">
        <div className="info__inner">
          <div style={{ display: 'grid', gap: 14 }}>
            <h1 className="info__title">
              ClayHabbit for <em>Android</em>
            </h1>
            <p className="info__lead">
              Install the app straight from us. It’s the same signed build we test, and it keeps your data encrypted on your phone and
              in your own Google Drive.
            </p>
          </div>

          <section className="dl-hero" aria-label="Download">
            <div style={{ display: 'grid', gap: 10 }}>
              <span className="t-headline-md">Get the app</span>
              <div className="dl-meta dl-version" aria-live="polite">
                {release === null ? (
                  <span>Checking the latest version…</span>
                ) : release === 'unavailable' ? (
                  <span>Android 7.0 or newer</span>
                ) : (
                  <>
                    <span>Version {release.version}</span>
                    {release.sizeMb ? <span>{release.sizeMb} MB</span> : null}
                    <span>Released {new Date(release.publishedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </>
                )}
              </div>
            </div>
            <a className="btn btn--lg btn--panel" href={APK_URL} download>
              <Download size={20} />
              <span>Download APK</span>
            </a>
          </section>

          <section className="prose" aria-labelledby="install-title">
            <h2 id="install-title">How to install</h2>
            <ol className="steps">
              <li>
                <span>
                  <strong>Download the APK on your phone.</strong>
                  Open this page on your Android phone and tap <em>Download APK</em>. If the browser warns that the file could be harmful,
                  choose <em>Download anyway</em>: that’s the standard warning for any app installed outside the Play Store.
                </span>
              </li>
              <li>
                <span>
                  <strong>Allow installing from your browser.</strong>
                  Open the downloaded file. Android asks once to let your browser install apps: tap <em>Settings</em>, turn on{' '}
                  <em>Allow from this source</em>, then go back.
                </span>
              </li>
              <li>
                <span>
                  <strong>Install and open ClayHabbit.</strong>
                  Tap <em>Install</em>. Play Protect may show a check for an unknown developer; choose <em>Install anyway</em>. Then sign in
                  with Google and choose your data passcode.
                </span>
              </li>
              <li>
                <span>
                  <strong>Updates.</strong>
                  The app tells you when a new version is out. Download it from here and install it over the old one: your data stays.
                </span>
              </li>
            </ol>

            <h2>Check that it’s genuine</h2>
            <p>
              Every release on{' '}
              <a href={RELEASES_URL} target="_blank" rel="noreferrer">
                GitHub
              </a>{' '}
              lists the APK’s SHA-256 checksum. Only download ClayHabbit from this page or that releases page. Every version is signed
              with the same key, so Android refuses an update that someone else built.
            </p>
          </section>

          <div className="row row--wrap" style={{ gap: 12 }}>
            <Button variant="outline" icon={<Globe size={18} />} onClick={() => navigate('/sign-in')}>
              Use it on the web instead
            </Button>
            <a className="btn btn--ghost" href={release && release !== 'unavailable' ? release.url : RELEASES_URL} target="_blank" rel="noreferrer">
              <ExternalLink size={18} />
              <span>Release notes</span>
            </a>
            <a className="btn btn--ghost" href="/privacy">
              <ShieldCheck size={18} />
              <span>Privacy</span>
            </a>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
