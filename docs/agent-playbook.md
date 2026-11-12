# trakr Agent Playbook

How to build trakr with parallel Sonnet coding agents. The product and technical source of truth is [SPEC.md](../SPEC.md); the agents live in [.claude/agents/](../.claude/agents/).

## The agents

| Agent | Feature | Starts when merged |
|---|---|---|
| `trakr-f00-scaffold` | Scaffold, design system, shared types, route placeholders | — |
| `trakr-f01-program` | Program Zod schema + conversion of `workout_A.md` | F00 |
| `trakr-f02-data` | Dexie schema, repositories, hooks, seeding | F00 |
| `trakr-f03-domain` | Rotation, stats (e1RM, PRs, volume), units | F00 |
| `trakr-f04-today` | Today screen | F01–F03 |
| `trakr-f05-session` | Active session logging | F04 |
| `trakr-f06-rest-timer` | Rest timer | F05 |
| `trakr-f07-history` | History feed, session detail/edit | F05 |
| `trakr-f08-progress` | Progress list, charts, demo seeder | F01–F03 |
| `trakr-f09-activities` | Activity logging | F01–F03 |
| `trakr-f10-program-editor` | Program view, editor, JSON/markdown import | F01–F03 |
| `trakr-f11-settings` | Settings, backup export/import | F01–F03 |
| `trakr-f12-pwa` | PWA, offline, deploy config, README | F04–F11 |
| `trakr-f13-qa` | End-to-end QA and polish | F12 |
| `trakr-integrator` | Merges `feat/*` branches into `main`, keeps it green | after any batch |

All of them use `model: sonnet`.

## One-time setup

1. Install Node.js 20 LTS or newer.
2. Turn the folder into a git repo with a first commit, because agents work on branches and worktrees:
   ```sh
   git init -b main
   git add SPEC.md workouts docs .claude
   git commit -m "Spec and agent definitions"
   ```
3. Restart Claude Code (or run `/agents`) so it picks up the new agent definitions.

## Running the build

Each agent works on its own branch, and agents in the same step run in parallel in separate git worktrees so they never edit the same checkout. After each step, the integrator merges the branches into `main`.

Paste these prompts into a Claude Code session in this folder, one step at a time:

| Step | Prompt |
|---|---|
| 1 | `Run the trakr-f00-scaffold agent on branch feat/f00-scaffold, then run trakr-integrator to merge it.` |
| 2 | `Run trakr-f01-program, trakr-f02-data and trakr-f03-domain in parallel, each in its own worktree. When all three finish, run trakr-integrator to merge them.` |
| 3 | `Run trakr-f04-today, trakr-f08-progress, trakr-f09-activities, trakr-f10-program-editor and trakr-f11-settings in parallel, each in its own worktree. Merge F04 with trakr-integrator as soon as it finishes, then start trakr-f05-session. Merge the others as they finish.` |
| 4 | `When F05 is merged, run trakr-f06-rest-timer and trakr-f07-history in parallel in worktrees, then merge them with trakr-integrator.` |
| 5 | `Run trakr-f12-pwa, then merge it.` |
| 6 | `Run trakr-f13-qa, then merge it.` |

After step 4 you have a working MVP: run `npm run dev` and open the shown address on your phone (same Wi-Fi; start with `npm run dev -- --host`).

### Running an agent by hand

To run an agent yourself, for example to retry it after a failure:

```sh
git worktree add ../trakr-f09 -b feat/f09-activities main
cd ../trakr-f09
claude   # then: "Use the trakr-f09-activities agent to implement F09."
```

Afterwards, from the main checkout: `Run trakr-integrator to merge feat/f09-activities.`

## Between steps

- **Read each agent's report.** Pay most attention to "contract changes" (edits to shared types, the database schema, the repository API, routes, UI primitives or `package.json`). These affect agents that haven't started yet, so check the `SPEC.md` diff before launching the next step.
- **Try it.** From step 3 on, `npm run dev` and `/dev/seed` (after F08) give you realistic data to click through.
- **If an agent fails or its result isn't right,** send it a follow-up message (it keeps its context), or rerun it on the same branch with specific feedback. Don't let a later agent fix an earlier feature, because that breaks file ownership.
- **Changing your mind about a feature?** Edit `SPEC.md` first, then the agent definition, then rerun it. The spec is what every agent trusts.

## Rules the agents follow (SPEC §8.1)

- Each agent edits only the files it owns, plus a few listed "minimal edit" files.
- Shared contracts are frozen once merged. Changes must be small, additive, and recorded in `SPEC.md`.
- Only F00 installs dependencies (F12 may add build tools).
- No training recommendations anywhere: the app only logs and visualises data.
