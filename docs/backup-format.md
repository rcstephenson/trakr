# Backup format v2

Settings > Export writes `trakr-backup-YYYY-MM-DD.json` in this compact format
(`backupVersion: 2`). Import reads both v2 and the original verbose v1 (SPEC 4.3). Code:
`src/lib/backupV2.ts` (codec) and `src/lib/backup.ts` (export/import). Both versions are
decoded to the same table rows and validated by the same Zod schema before anything is written.

Output is one JSON document with one catalog entry, program, session or activity per line.
A real five-day history is about 70% smaller than v1 (39 KB to 12 KB), and a month of logged
sessions more than 75% smaller.

## Example

```json
{"app":"trakr","backupVersion":2,"exportedAt":"2026-03-10T00:00:00.000Z","settings":{"unit":"kg","theme":"dark"},
"exercises":{
"barbell-bench-press":{"name":"Barbell Bench Press","equipment":"barbell","kind":"compound","muscles":["chest","triceps"]},
"sled-push":{"name":"Sled Push","equipment":"other","kind":"compound","load":"none","muscles":["quads"],"custom":true}
},
"programs":{
"upper-lower":{"name":"Upper Lower","active":1,"imported":"2026-02-01T00:00:00.000Z","schedule":["upper-a","rest"],"exercises":["barbell-bench-press","sled-push"],"workouts":[{"id":"upper-a","name":"Upper A","items":[["barbell-bench-press","3x6-8",{"notes":"Pause","alt":["sled-push"]}],["sled-push","4x10"]]}]}
},
"sessions":[
{"id":"01M738HN3EF495JW3MR4VHYWTV","program":"upper-lower","workout":"upper-a","start":"2026-03-02T17:00:00.000Z","end":3000000,"bw":82.5,"skipped":[1],"plan":[["barbell-bench-press","3x6-8"],["sled-push","4x10"]],"log":[{"slot":0,"t":480000,"sets":["w40x10","60x8@2*3","62.5lbx6"]}]}
],
"activities":[
{"id":"01M7...","type":"run","start":"2026-03-01T08:00:00.000Z","min":28,"dist":5,"unit":"km"}
]}
```

## Fields

- `settings`: only values that differ from the defaults (`unit` lb, `theme` system) are written.
- `exercises`: the exercise catalog, keyed by id, defined once. `load` is omitted when `total`.
- `programs`: keyed by id. `exercises` lists ids from the catalog; an exercise whose definition
  differs from the catalog is written inline with its `id`. `schemaVersion` is implied.
  `active: 1` marks the active program. Workout items are `[exerciseId, "SETSxMIN-MAX"]` (`"3x10"`
  when min equals max), with an optional third object `{notes, alt}` that is left out when both
  are empty.
- `sessions`: in file order.
  - `program` and `workout` keep each session tied to its program, so per-program history
    survives. `name` (the workout name snapshot) is written only when it differs from the
    program's workout name.
  - `status` is omitted when `completed`. `end`, `notes`, `bw` (bodyweight) and `skipped` are
    omitted when absent or empty.
  - `end` is the finish time in milliseconds after `start` (or a full ISO string when that cannot
    be expressed exactly).
  - `plan` is the template snapshot taken at session start, one `[exerciseId, "3x6-8"]` per slot
    (position is the slot index). A third object appears only for exceptions: `kind` when it
    differs from the exercise's catalog kind, `slot` when the slot is not the position.
  - `log` groups logged sets by slot: `{slot, ex?, t, sets}`. `ex` is only written when the
    exercise differs from the plan's exercise for that slot (a swap after logging). `t` is the
    completion time in ms after the session `start`, shared by the group; if sets in the group
    have different times it is an array with one entry per expanded set.
- Set strings: `[w]WEIGHT[lb|kg]xREPS[@RIR][*COUNT]`.
  - `w` marks a warm-up.
  - The unit is written only when it differs from `settings.unit`.
  - `*3` repeats an identical set.
  - Examples: `135x8`, `w60x10`, `100kgx5@2`, `0x12*3` (bodyweight / no load).
- `activities`: `title`, `min` (durationMin), `dist` (distance), `unit` (distanceUnit),
  `intensity` and `notes` are omitted when absent.

## What is derived, and why the round trip is lossless

Dropped because they can be recomputed on import: set `id` (`<sessionId>.<group>.<n>`),
`sessionId`, `slotIndex` and `setIndex` (from position), `isWarmup: false`, `unit` equal to the
settings unit, empty `notes` / `alternatives` / `skippedSlots`, `schemaVersion`, duplicated
program exercise definitions, target `kind` equal to the catalog kind, and `workoutName` equal to
the program's. `completedAt` and `finishedAt` are kept (history ordering and "last time" lookups
use them), just stored relative to `start`.

Documented normalisations (nothing the app reads changes): set ids are regenerated, `setIndex` is
renumbered 0.. within each slot and exercise, an empty `skippedSlots` becomes absent, and sets that
point at a session missing from the file are not exported.

## Import

- Replace and merge behave as for v1. Session and activity ids are kept, so merging the same file
  twice changes nothing.
- Because v2 set ids are derived, a merge first removes the existing sets of each incoming session
  and writes the file's sets, so they are replaced rather than duplicated.
- Problems are reported with a path, for example
  `sessions[0].log[1].sets[2]: bad set "100 by 5" (use e.g. "135x8", ...)`.
