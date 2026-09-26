# Publishing ClayHabbit (without the Play Store)

Two things go out to people:

- **The website:** the landing page, `/download`, `/privacy`, `/terms` and the web app. It's hosted on **Vercel** from `web/`.
- **The Android app:** a signed APK attached to **GitHub Releases** on `Cheekurthi-Vamsi/ClayHabit` (a public repo).
  - The website's *Download APK* button always points at the newest release.
  - The installed app checks GitHub once a day and offers the update.

Do the one-time setup (sections 1–3) once. After that, each new version is section 4.

---

## 1. Put the website on Vercel (one time)

1. Go to https://vercel.com, sign in with GitHub and choose **Add New… → Project**. Import `Cheekurthi-Vamsi/ClayHabit`.
2. **Root Directory:** `web`. Leave **"Include files outside the root directory"** on: the web app shares code from `../src`.
3. Vercel reads the rest from `web/vercel.json`: `npm ci`, `npm run build:deploy`, output `dist`, page routing and security headers.
4. Environment variables: none are needed, because the build reads the root `.env`. That file holds the Clerk publishable key and the Google web client ID, and both are public identifiers. Later, to use different keys, add `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` / `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in Vercel → Settings → Environment Variables; they take priority.
5. Click **Deploy**. You get an address like `https://clayhabit.vercel.app`, and every push to `main` redeploys.

## 2. Let people sign in (one time)

### Google Cloud Console → APIs & Services

1. **Credentials → your Web OAuth client → Authorized JavaScript origins.** Add your site's address (e.g. `https://clayhabit.vercel.app`) and any custom domain. Without it, *Connect Google Drive* fails on the live site.
2. **OAuth consent screen:**
   - Add the **App home page** (`https://<your site>/landing`), **Privacy policy** (`https://<your site>/privacy`) and **Terms** (`https://<your site>/terms`).
   - Add a support email.
   - **Publishing status → Publish app** (leave *Testing*). While it's in *Testing*, only the test users you listed can sign in; everyone else gets error 12500 on the phone.
3. **Scope check:** ClayHabbit asks for `openid`, `email`, `profile` and `drive.appdata` only.
   - If Google classes one of your scopes as *sensitive*, new users see a "Google hasn't verified this app" screen until you apply for verification. Until then, users can still continue through *Advanced → Go to ClayHabbit*.
   - Verification needs a domain you own, because `vercel.app` addresses can't be added as authorized domains.

### Clerk

- `.env` has a **development** key (`pk_test_…`). It works for anyone, but it's meant for testing: it has usage limits and shows a development badge.
- For real users, create a **production instance** in the Clerk dashboard. It needs a domain you own (you add a few DNS records).
- Then:
  - set up Google sign-in there with the same **custom credentials**: the web client ID and its secret;
  - allowlist the redirect `clayhabit://sso-callback` under Native applications, plus your website's domain;
  - put the new `pk_live_…` key in `.env` (and in Vercel);
  - rebuild the app.

## 3. The Android signing key (already done)

- Release APKs are signed with `~/.clayhabit/clayhabit-upload.jks`; the passwords are in `~/.gradle/gradle.properties`.
- Its SHA-1 is registered as the Android OAuth client in Google Cloud.
- **Back up this key file and its passwords somewhere safe.** Android only installs an update over an app signed with the same key. If the key is lost, every user has to uninstall, losing their phone data unless Cloud is on, and install again.

## 4. Release a new version (each time)

1. Build the release:
   ```bash
   npm run release:android -- patch     # or: minor · major · 1.2.0
   ```
   This does the following:
   - bumps the version in `app.json` and raises `versionCode`;
   - builds the signed APK;
   - puts `ClayHabbit.apk`, a versioned copy and `RELEASE-vX.Y.Z.md` (release notes with the SHA-256) in `release/`.
2. Write a few lines about what changed in `release/RELEASE-vX.Y.Z.md`. The app shows the start of it in the update prompt.
3. Commit and push the version change (`app.json`).
4. On GitHub → **Releases → Draft a new release**:
   - tag `vX.Y.Z` (the script prints it), on `main`;
   - title `ClayHabbit X.Y.Z`;
   - paste the notes;
   - attach **`release/ClayHabbit.apk`**, keeping that exact file name;
   - click **Publish release**. Don't mark it as a pre-release: pre-releases are ignored.
5. That's it:
   - `https://<your site>/download` shows the new version;
   - the *Download APK* button serves it;
   - installed apps offer the update within a day, or at once from Settings → About → *Check for updates*.

## What users do

1. Open `https://<your site>/download` on their Android phone and tap **Download APK**.
2. Open the file and allow their browser to install apps. That's a one-time Android prompt; Play Protect may ask them to confirm an unknown developer.
3. Sign in with Google and choose a data passcode.
4. On a computer, they can use the same account at `https://<your site>` with the same passcode.
