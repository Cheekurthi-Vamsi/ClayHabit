import './info.css';

import type { ReactNode } from 'react';

import { SiteFooter, SiteNav } from '../../components/site-chrome';
import { SUPPORT_URL } from '../../lib/config';
import { useDocumentTitle } from '../../lib/use-document-title';

/** Bump when the text changes. */
const UPDATED = '26 September 2026';

function LegalPage({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  useDocumentTitle(`${title} — ClayHabbit`);
  return (
    <div className="landing">
      <SiteNav links={false} />
      <main className="container info">
        <article className="info__inner">
          <header style={{ display: 'grid', gap: 12 }}>
            <h1 className="info__title">{title}</h1>
            <p className="info__lead">{lead}</p>
            <p className="info__updated">Last updated {UPDATED}</p>
          </header>
          <div className="prose">{children}</div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

const contact = (
  <a href={SUPPORT_URL} target="_blank" rel="noreferrer">
    ClayHabbit’s GitHub issues page
  </a>
);

/**
 * Written to match how the apps actually work (no ClayHabbit server, data sealed
 * on the device, Drive app folder only). Keep it true when features change.
 */
export function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      lead="ClayHabbit is built so that nobody but you can read what you keep in it, including us. This page explains what that means in practice."
    >
      <h2>The short version</h2>
      <ul>
        <li>ClayHabbit has no server that stores your habits, tasks, notes, calendar, focus sessions or money.</li>
        <li>Your data is encrypted on your device before it’s saved anywhere, with a key only your data passcode can unlock.</li>
        <li>If you turn on Cloud, the encrypted copy is kept in a private app folder in <strong>your own</strong> Google Drive.</li>
        <li>No ads, no analytics, no tracking and no selling of data.</li>
      </ul>

      <h2>What we receive when you sign in</h2>
      <p>
        You sign in with Google through <strong>Clerk</strong>, our sign-in provider. Clerk receives your name, email address and
        profile photo from Google, and keeps your account and session so you stay signed in. ClayHabbit uses them only to show who
        is signed in and to tell your data apart from other accounts on the same device or Drive. Clerk processes them under its own
        privacy policy.
      </p>

      <h2>Your data and where it lives</h2>
      <ul>
        <li>
          <strong>On your phone</strong>, everything is stored in a database encrypted with SQLCipher (AES-256). Its key is protected
          by Android’s Keystore.
        </li>
        <li>
          <strong>In the Cloud (optional)</strong>, a copy is sealed with AES-256-GCM on your device and uploaded to the hidden app
          folder of your Google Drive. The key is locked with your data passcode (PBKDF2-SHA256, 600,000 rounds). We never receive
          your passcode or your key, so we cannot open that copy, and neither can Google.
        </li>
        <li>
          <strong>On the web</strong>, the website downloads that encrypted copy and unlocks it with your passcode in your browser.
          The unlocked data exists only in the tab’s memory and is gone when you close it. The browser keeps only your theme choice
          and a counter of wrong passcode attempts.
        </li>
      </ul>

      <h2>Google permissions</h2>
      <p>
        Besides sign-in, ClayHabbit asks for one Google permission, and only if you use Cloud: <code>drive.appdata</code>. That lets
        it create, read and update its own files in a hidden folder of your Drive. It cannot see, list or change any of your other
        files.
      </p>
      <p>
        ClayHabbit’s use and transfer of information received from Google APIs adheres to the{' '}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements. That data is used only to provide the app’s features to you: it is never
        transferred to others, used for advertising, or read by people.
      </p>

      <h2>Reminders</h2>
      <p>Task and note reminders are scheduled as notifications on your own phone. Nothing about them is sent anywhere else.</p>

      <h2>Deleting your data</h2>
      <ul>
        <li>
          <strong>On your phone:</strong> Settings → Data &amp; storage → Erase all data, or uninstall the app.
        </li>
        <li>
          <strong>In your Drive:</strong> open Google Drive → Settings → Manage apps → ClayHabbit → Delete hidden app data. You can
          also remove its access at{' '}
          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">
            myaccount.google.com/permissions
          </a>
          .
        </li>
        <li>
          <strong>Your sign-in account:</strong> ask us through {contact} and we’ll delete it from Clerk.
        </li>
      </ul>

      <h2>Children</h2>
      <p>ClayHabbit isn’t directed at children under 13, and we don’t knowingly create accounts for them.</p>

      <h2>Changes and contact</h2>
      <p>
        If this policy changes, the new version is published on this page with a new date. Questions or requests: {contact}.
      </p>
    </LegalPage>
  );
}

export function TermsPage() {
  return (
    <LegalPage title="Terms of use" lead="The simple rules for using ClayHabbit on your phone and on the web.">
      <h2>Using ClayHabbit</h2>
      <p>
        ClayHabbit is a personal organiser for habits, tasks, notes, calendar, focus and money. You may use it for your own personal
        purposes. Don’t use it to break the law or to try to access other people’s accounts or data.
      </p>

      <h2>Your account and passcode</h2>
      <p>
        You sign in with a Google account and choose a data passcode. <strong>Keep your passcode safe.</strong> It is the only thing
        that can unlock your encrypted data. We never have it, so we can’t recover it or your data if it’s lost.
      </p>

      <h2>Your content</h2>
      <p>
        What you create stays yours. It is stored on your devices and, if you choose, encrypted in your own Google Drive. We don’t
        claim any rights to it and can’t read it.
      </p>

      <h2>The Android app</h2>
      <p>
        The Android app is distributed from our website and GitHub releases, not the Play Store. Only install it from those places;
        every version is signed with the same key.
      </p>

      <h2>No warranty</h2>
      <p>
        ClayHabbit is provided “as is”, without warranties of any kind. We work hard to keep it reliable and your data safe, but we
        aren’t liable for data loss or damages arising from its use. Keep your Cloud backup turned on if your data matters to you.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. The current version is always on this page, with the date it last changed. Questions: {contact}.
      </p>
    </LegalPage>
  );
}
