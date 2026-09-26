# ClayHabbit Web

The web companion to the ClayHabbit phone app: a Welcome page, the landing page, and the full app, signed in. It's plain Vite + React + TypeScript with no React Native.

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build in web/dist
npm test           # WebDatabase + phone↔web sync tests
```

## How it works

- **Shared code, not copies.** The app's data layer (`src/data`, `src/domain`), its feature hooks (`src/features/*/hooks.ts`) and its crypto/sync code (`src/lib/cloud`, `src/lib/vault`) are imported straight from `../src`. `vite.config.ts` swaps the three native modules they touch for web versions in `src/shims`: `expo-sqlite`, the notification service, and the native PBKDF2 module.
- **SQLite in memory.** `@sqlite.org/sqlite-wasm` runs on the main thread, so no COOP/COEP headers are needed. The database only ever exists in the tab.
- **Your Drive, your key.** Sign-in is Clerk (the same account as the phone). Drive access uses Google Identity Services with the `drive.appdata` scope only. The data passcode unlocks the key in the browser, and the shared sync engine restores and saves the encrypted snapshot.
- **Design tokens** are generated from `../src/theme` at build time (`virtual:tokens.css`), so colours, radii and type always match the phone.

## Configuration

Keys come from the repo root's `.env` / `.env.local` locally (`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`). Env files are git-ignored, so on Vercel set both as Environment Variables.

In Google Cloud Console, add each web origin (e.g. `http://localhost:5173` and your production domain) under **Authorized JavaScript origins** of the web OAuth client. Clerk's dev instance allows localhost; add production domains in the Clerk dashboard.

Hosting is a static SPA: every path serves `index.html` (`public/_redirects` handles Netlify and Cloudflare Pages).
