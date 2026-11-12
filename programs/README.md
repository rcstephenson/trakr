# Programs

A program is one routine: its exercises, workouts and weekly schedule. Everything you log is stored
against the program that was active when you started the workout, so you can switch routines and
still compare progress over time.

## Add a new routine

1. Copy `_template.json` to `<your-id>.json` (the file name should match the id).
2. Set a **new, unique `id`** and a `name`. Never reuse the id of an earlier program: importing a
   program with an existing id _replaces_ that program and mixes the two routines' history.
3. Edit `exercises`, `workouts` and `schedule`. For a movement you already did in an earlier
   program, copy that exercise's `id` exactly (see the rules below).
4. Check it: `npm run program:check -- programs/<your-id>.json`. Fix any `FAIL` lines and read the
   warnings.
5. Import it: Program tab > upload icon > choose the file > review the preview > keep "Make active"
   ticked > Save program. Your old program and all its logged sessions stay in the app; switch back
   any time from "Past programs" on the Program tab (or the switch icon).
6. Optional: to ship it inside the app, add the file to `src/db/bundled.ts`. It then shows under
   Import > Built-in programs.

## File format

| Field           | Meaning                                                                                                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion` | Always `1`.                                                                                                                                                                         |
| `id`            | Lowercase slug (`my-program-2`). Unique per program, never changed afterwards.                                                                                                      |
| `name`          | Display name.                                                                                                                                                                       |
| `description`   | Optional one-liner.                                                                                                                                                                 |
| `schedule`      | Weekly order of workout ids. Use `rest` for a rest day.                                                                                                                             |
| `exercises`     | Every exercise used, including alternatives (see below).                                                                                                                            |
| `workouts`      | The sessions: `id`, `name`, and `items` in the order they are performed.                                                                                                            |
| `notes`         | Optional markdown at the bottom of the Program screen: muscles worked and progression rules. Keep personal details (age, body weight, diet) out, since the file ships with the app. |

An exercise: `id`, `name`, `equipment` (`barbell`, `dumbbell`, `cable`, `machine`, `bodyweight`,
`other`), `kind` (`compound` or `isolation`), `load`, and `muscles` (free-text list).

A workout item: `exerciseId`, `sets`, `repMin`, `repMax` (min must not exceed max), `notes` (can be
empty), `alternatives` (exercise ids that can be swapped in for that slot; they must also be in
`exercises`) and optionally `"primary": true` to mark a primary lift (shown in bold on the Program
screen; also toggleable in the workout editor).

### Load types

| `load`            | You log                             | Example                  |
| ----------------- | ----------------------------------- | ------------------------ |
| `total`           | The full weight on the bar or stack | Barbell bench, cable row |
| `per-hand`        | The weight of one dumbbell          | Dumbbell press           |
| `bodyweight-plus` | Added weight only (0 = bodyweight)  | Pull-up, dips            |
| `none`            | No weight field, reps only          | Leg raise, plank         |

## Rules

- **New program, new `id`.** The id is what ties sessions to a program.
- **Same movement, same exercise `id`.** Progress charts, personal records and the weight prefill
  are keyed by exercise id, so reusing `barbell-bench-press` carries your history into the new
  program. A different id starts a fresh history for that exercise. Variations that load
  differently (incline vs flat) should be separate ids.
- **Schedule ids must be workout ids or `rest`.** Every non-rest entry has to match a workout's
  `id`; `rest` is reserved and cannot be a workout id. Workouts you leave out of the schedule are
  never suggested as "next" (they can still be started by hand).
- **Rotation is per program.** "Next workout" looks only at the active program's sessions, so
  reusing workout ids like `upper-a` across programs is safe.
- Ids are lowercase letters, digits and single hyphens only.
- Files starting with `_` and anything that is not a program file are ignored by
  `npm run program:check` when it compares programs. Do not keep trakr backups
  (`trakr-backup-*.json`) in this folder.

## `npm run program:check`

```
npm run program:check -- programs/my-program.json   # one file
npm run program:check                               # every program here
```

It validates against the same schema the app uses and exits non-zero on errors. It also warns about:
a program id that another file already uses, exercise ids that no other program has but whose name
looks like one that does (probably an accidental new id), exercises no workout uses, and workouts
missing from the schedule.

## Files here

- `5day-upperlower-rev2.json`: the bundled 5-day routine (the only built-in program), installed on a fresh install. Existing installs get it from Program > Import > Built-in programs.
- `_template.json`: starting point for a new routine.
