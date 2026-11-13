# trakr: product and technical overview

trakr is a local-first, mobile-first progressive web app for logging gym workouts against a predefined program, tracking weight and rep progression per exercise, and logging other activities (runs, tennis, classes). Live at https://rcstephenson.github.io/trakr/.

Setup, scripts, deployment and sync steps are in [`README.md`](README.md). This document describes what the app does and how it is built.

## 1. Principles

- **Fast logging at the gym**: one hand, phone, poor signal. Fields are prefilled from last time, so repeating a lift is one Enter.
- **Program-driven**: the user defines a routine once; the app knows what is next and what the targets are.
- **Data, not advice**: the app records and charts what the user did. It never recommends weights, reps, progression or changes to the routine, and has no timers (no rest timer, no running clock). A finished session's duration is recorded and shown as a plain stat.
- **Local-first**: everything works offline; there is no required server or account.
- **Out of scope**: social features, coaching, nutrition tracking, native apps.

## 2. Architecture

All data lives in IndexedDB on the device (Dexie). Hosted as static files on GitHub Pages. JSON backup export/import moves data between devices; optional Dexie Cloud sync (section 8) does it automatically.

| Layer | Where | Notes |
|---|---|---|
| UI | `src/routes/`, `src/components/` | React 18, React Router 6 (`BrowserRouter`), Tailwind with design tokens, `lucide-react` icons, Recharts |
| Hooks | `src/hooks/` | `useLiveQuery` wrappers (`useSettings`, `useActiveProgram`, `useActiveSession`, `useSessions`, `useLastPerformance`, ...) |
| Repositories | `src/db/repositories/` | Typed async CRUD; UI code does not query Dexie directly |
| Database | `src/db/schema.ts` | Dexie `trakr` database; seeding in `src/db/seed.ts`; bundled programs in `src/db/bundled.ts` |
| Domain | `src/domain/` | Pure, unit-tested functions with no React or Dexie imports: rotation, stats (e1RM, PRs, volume), units, set-entry parsing, program schema (Zod), markdown import, program history |
| Lib | `src/lib/` | ids (ULID), dates, theme, backup (v1/v2), cloud sync |
| Dev only | `src/dev/` | `/dev/ui` (design system page) and `/dev/seed` (demo data seeder); excluded from production builds |
| Tests | `tests/unit/` (Vitest + Testing Library), `tests/e2e/` (Playwright, mobile viewport, against a production preview build) | |

Other tooling: Vite, TypeScript (strict), Zod, `vite-plugin-pwa` (Workbox), ESLint, Prettier. Business logic in `src/domain/` is covered by unit tests; each main flow has an e2e test.

## 3. Screens

The bottom tab bar is **Today, History, Progress, Program**. It is hidden during an active session, where the sticky session header carries back, title and Finish. Settings is an icon in the Program header.

| Route | Screen |
|---|---|
| `/` | **Today**: a This-week strip (Mon to Sun tiles: workout, activity or none), then a hero card with the selected workout (default: the rotation's next), a tile picker of all the program's workouts (`NEXT` marks the rotation), a **Day** picker (defaults to today, no future dates; a past day makes the button **Log <Workout> . date** and records the session on that day), and a **Start** button. With an active session the hero becomes **Resume** with **Discard** (confirmed). **Log activity**. The last few entries below. |
| `/session/:id` | **Session**: see 3.1. |
| `/history` | **History**: a 14-week contribution grid, then the feed of sessions and activities grouped by week. Chips: All / Workouts / Activities, plus a program filter when sessions exist for more than one program (activities belong to no program and are hidden while one is picked). |
| `/history/session/:id` | **Session detail**: sets, volume and PRs; Edit mode to fix mistakes (per-set rows, warm-up flag, add and delete sets); Delete. |
| `/progress` | **Progress**: searchable exercise list with a sparkline of top-set weight and last-performed date. |
| `/progress/:exerciseId` | **Exercise progress**: line chart (metric: top weight, e1RM or volume; range: 1M, 3M, 1Y, All), PR cards, table of past sessions, and a program filter when the exercise was done in more than one program. History is keyed by exercise id, so it carries across programs. |
| `/activity/new`, `/activity/:id` | **Activity form**: type (run, cycle, swim, climb, tennis, sport, class, walk, other), title, date and time, duration, distance (run, cycle, swim, walk), intensity 1 to 5, notes. Leaving with unsaved input asks to confirm. |
| `/program` | **Program**: active program name and description, weekly schedule, workout cards (exercise rows with sets x rep range, primary lifts in bold, per-item notes; an exercise with alternatives has a dropdown on its name that previews each alternative's own sets, reps and notes), the program's markdown notes, and **Past programs** with their date ranges. Header actions: Import, Export, Switch program (when more than one is stored), Settings. |
| `/program/edit/:workoutId` | **Workout editor**: drag to reorder, add and remove exercises (picker with search), edit sets, rep range, notes, alternatives and the primary-lift flag. |
| `/settings` | **Settings**: Units (lb / kg), Appearance (light / dark / system), Data (export backup, import backup with Merge or Replace, Clear all data with a type-DELETE confirmation), Account & sync (section 8). |

**Program import** accepts a program `.json` file, a `.md` file with workout tables (converted by `src/domain/markdownImport.ts`; see `workouts/workout_A.md` for the format) or a built-in program, shows a preview, and saves it, optionally making it active. Importing an id that already exists replaces that program. Switching programs keeps all logged sessions; each session is tied to the program active when it started, and "next workout" is computed per program.

### 3.1 Session logging

Each exercise has **one** weight field and **one** reps field (`src/domain/setEntry.ts`), and that entry applies to all of the exercise's target sets: logging writes that many identical working sets in one transaction (`sets.replaceExerciseSets`), so volume, e1RM, PRs, History and backups read ordinary set rows.

- **Entry rules**: weight is a non-negative number (`135`, `62.5`) with an optional `lb` or `kg` suffix converted to the display unit; reps is a whole number 1 to 999. By load type: `total` and `per-hand` need a weight; `bodyweight-plus` takes `+25` or `25` (added) or `bw`, `0` or blank (bodyweight); `none` shows reps only. Invalid input shows a hint and disables logging.
- **Prefill**: fields start filled (muted) with the previous completed session's first working set for that exercise, converted to the display unit. Under each exercise: the target (`3 x 6-10`) and a `LAST` line.
- **Flow**: Enter in weight moves to reps; Enter in reps (or the button) logs the exercise and focuses the next one. Logged rows stay editable; tapping the tick un-logs.
- **Alternatives**: an exercise whose program item lists alternatives has a dropdown on its name (tapping anywhere on the name cell opens the native picker). Picking one swaps the slot's exercise and takes that alternative's own sets and rep range (`sessions.swapExercise`), and clears a skip on the slot; the prefill and `LAST` line follow the new exercise. The dropdown is locked once the exercise is logged (un-log to switch). Options come from the session's program, matched by slot position.
- **Skip**: entering `x` (or leaving both fields blank) records the exercise as skipped; the mark can be tapped to un-skip. Finishing records every still-unlogged exercise as skipped (the finish sheet lists them).
- **Finish** opens a summary (sets, volume, PRs, plain duration; duration is hidden under a minute and for backdated sessions) and completes the session. **Discard workout** asks to confirm and deletes the session and its sets.
- Everything persists immediately; reloading resumes the session. The screen is kept awake during a session via the Wake Lock API where supported (needs HTTPS).

### 3.2 Rotation and stats

- **Next workout**: the entry following the most recently completed session's workout in the active program's `schedule`, skipping `rest`. It is sequence-based, not calendar-based, and any workout can be picked by hand.
- **Last performance**: working sets of the latest completed session containing the exercise (warm-ups excluded).
- **Stats**: Epley e1RM `w x (1 + reps/30)` for reps up to 12; per-session top weight, best e1RM, volume and total reps; PRs for heaviest weight and best e1RM, flagged in the UI.
- **Units**: weights are stored in the unit entered, with that unit; every displayed weight goes through `formatWeight()` using the Settings unit. Converted values round to 1 lb or 0.5 kg.

## 4. Data model

IDs are ULIDs, except catalog and template ids, which are slugs from the program file. Timestamps are ISO-8601 strings. Types are in `src/domain/types.ts`; tables in `src/db/schema.ts`.

| Table | Contents |
|---|---|
| `programs` | A full program plus `isActive` and `importedAt` |
| `exercises` | Exercise catalog shared across programs (`custom: true` for user-created ones) |
| `sessions` | `programId`, `workoutId`, `workoutName` and `targets` (snapshotted at start so later program edits do not rewrite history), `startedAt`, `finishedAt`, `status` (`active`, `completed`, `discarded`), `skippedSlots`, `notes`, `bodyweight` |
| `sets` | `sessionId`, `exerciseId` (the exercise actually used), `slotIndex`, `setIndex`, `weight`, `unit`, `reps`, `rir`, `isWarmup`, `completedAt` |
| `activities` | `type`, `title`, `startedAt`, `durationMin`, `distance`, `distanceUnit`, `intensity`, `notes` |
| `settings` | One row (`key: "app"`): `unit`, `theme`, `rotationPointer` |

Rules: never edit a released Dexie version in place (add a new version with an upgrade); never delete user data without explicit confirmation; old stored or imported data containing removed fields (`restSeconds`, `increments`, rest-timer settings) must still load, and those fields are dropped.

## 5. Program file format

A program is the exercise catalog, the workout templates and a weekly schedule, validated by `src/domain/programSchema.ts` (Zod). The format, load types, ID rules and how to add a routine are documented in [`programs/README.md`](programs/README.md); `programs/_template.json` is a starting point and `npm run program:check` validates files. One program is bundled (`programs/5day-upperlower-rev2.json`, listed in `src/db/bundled.ts`); it is installed on a fresh install, and bundled programs can also be added later from Program, Import, Built-in programs.

## 6. Backup format

Settings, Export writes `trakr-backup-YYYY-MM-DD.json` in the compact `backupVersion: 2` format; import reads v2 and the older verbose v1, validates with Zod, and offers **Merge** (upsert by id, keeps current settings) or **Replace** (deletes existing data first). Format details are in [`docs/backup-format.md`](docs/backup-format.md); code is in `src/lib/backup.ts` and `src/lib/backupV2.ts`.

## 7. Design

The visual language ("Signal": hairline borders, mono numerals, one electric accent, light "Paper" and dark "Graphite" themes, 48px touch targets, WCAG AA) is documented against the code in [`docs/design-system.md`](docs/design-system.md). Tokens live in `src/styles/index.css` and `tailwind.config.ts`; `/dev/ui` (dev builds) renders every primitive.

## 8. Optional cloud sync (Dexie Cloud)

Off by default. The Dexie Cloud addon is only compiled in when `VITE_DEXIE_CLOUD_URL` is set at build time; otherwise it is replaced by an empty stub and the app makes no network calls. When enabled the app still works signed out and offline; Settings gets an **Account & sync** section for signing in by email (one-time code), signing out and syncing. Units, theme and the next-workout pointer are per-device and not synced; "Clear all data" and a Replace import are shared across signed-in devices. Setup and behaviour are described in the README ("Cloud sync (Dexie Cloud)"); code is in `src/lib/cloud.ts`, `src/lib/cloudSync.ts`, `src/hooks/useCloud.ts` and `src/components/settings/AccountSection.tsx`.

## 9. PWA, offline and deployment

- `vite-plugin-pwa` generates the manifest and a Workbox service worker with a **prompt** update strategy: installed users see a "New version available" toast with a Reload button, and data is unaffected. The app shell is precached, so it opens offline after the first load. The service worker is only active in production builds.
- Hosted on GitHub Pages at a sub-path. `.github/workflows/deploy.yml` builds on every push to `main` with `BASE_PATH=/<repo>/` (Vite `base`, manifest scope, service worker fallback and router `basename` follow it) and copies `index.html` to `404.html` so deep links and refreshes work.
- The app asks the browser for persistent storage on start; users are told to export backups regularly.

## 10. Quality bar

- TypeScript strict; no `any` in `domain/` or `db/`.
- `npm run program:check`, `npm run typecheck`, `npm run lint`, `npm test` and `npm run e2e` all pass before a change is deployed.
- Mobile Lighthouse targets: Performance 90 or more, Accessibility 95 or more, installable PWA.
- Do not put personal details (names, emails, body measurements) in the repository: the repo is public and program files ship with the app.
