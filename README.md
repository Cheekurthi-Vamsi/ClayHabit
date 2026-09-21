# ClayHabit

A premium, offline-first productivity app — tasks, streaks, notes, reminders, calendar, goals, and
focus sessions in one workspace. Built with Expo, TypeScript, and Expo Router.

## Stack

- **Expo SDK 57** + **Expo Router** (file-based routing, `src/app`)
- **TypeScript** (strict mode)
- **React Native Reanimated** + **Gesture Handler** for animation and swipe gestures
- **expo-sqlite** with a hand-rolled versioned migration runner — no ORM
- **Zustand** for small client UI state, **TanStack Query** for all SQLite reads/writes
- **expo-notifications** for local reminders, **expo-local-authentication** + **expo-secure-store**
  for App Lock
- **Jest** (`jest-expo`), with repository/migration tests run against a real SQLite engine via
  Node's built-in `node:sqlite` (see `src/data/db/testing/create-test-db.ts`) rather than mocks

## Getting started

```bash
npm install
npx expo start
```

Scan the QR code with [Expo Go](https://expo.dev/go) on a physical device, or press `a` / `i` for
an Android/iOS emulator if you have one configured. There is no backend to run — everything is
local SQLite.

## Project structure

```
src/
  app/            Expo Router routes (thin — screens import from features/)
  features/       Screen-level UI grouped by domain (tasks, notes, streaks, calendar, goals, focus, security, settings)
  components/ui/  The shared design system (Button, Card, BentoCard, ProgressRing, ...)
  data/           SQLite client, migrations, and repositories (the only layer that touches SQL)
  domain/         Entity types and pure domain services (recurrence, streak engine)
  lib/            Cross-cutting service wrappers (notifications, security)
  store/          Zustand stores (settings, ephemeral app-lock session state)
  theme/          Design tokens: colors, typography, spacing, radii, motion
  hooks/, utils/  Shared hooks and pure utility functions
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Metro dev server |
| `npm run android` / `npm run ios` / `npm run web` | Start and open on a platform |
| `npm test` | Run the Jest test suite |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier, write mode |

## Database

The schema evolves through numbered migrations in `src/data/db/migrations/`, applied in order and
tracked via SQLite's `PRAGMA user_version` (see `src/data/db/migrate.ts`). Add a new migration file
rather than editing an existing one once it has shipped.

## Design system

`/dev/ui-showcase` (linked from Settings → Developer in dev builds) renders every component in the
shared design system for visual review.
