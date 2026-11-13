# trakr design system: "Signal"

The visual language of trakr, a mobile-first workout-logging PWA. This sheet documents what the code does today, so the look can be reproduced and extended by people and by coding agents.

- **Source of truth:** the code. If this sheet and the code disagree, fix the sheet.
- **Product rationale:** data, not advice; no timers (see `SPEC.md`).
- **Living style page:** run the app and open `/dev/ui` (dev builds only; `src/dev/UiDemo.tsx`). It renders tokens, type, and every primitive in Paper or Graphite, with a "Compare both themes" toggle.
- **Files that define the system:** `src/styles/index.css` (tokens, `.micro`, `.num`, dot grid, focus, reduced motion), `tailwind.config.ts` (utilities, scale, radii, fonts), `src/components/ui/*` (primitives).

## Contents

1. [Principles & mood](#1-principles--mood)
2. [Tokens](#2-tokens)
3. [Typography](#3-typography)
4. [Shape, spacing & layout](#4-shape-spacing--layout)
5. [Components catalogue](#5-components-catalogue)
6. [Signature patterns](#6-signature-patterns)
7. [Data visualisation](#7-data-visualisation)
8. [Interaction, motion & accessibility](#8-interaction-motion--accessibility)
9. [Iconography & brand](#9-iconography--brand)
10. [Voice & content](#10-voice--content)
11. [Do / Don't gallery](#11-do--dont-gallery)
12. [Implementation cookbook](#12-implementation-cookbook)

---

## 1. Principles & mood

Signal is an instrument panel or lab notebook, not a wellness app. It is precise, cool and slightly technical: hairline rules, mono numerals, terse uppercase micro-labels, near-black ink on a cool grey-white page (Paper) or near-black graphite (Graphite), and a single electric lime accent that works like an indicator light. The user's numbers are the content; everything else is a quiet ledger around them. The app records and shows what the user did. It never advises, nags, or times.

Rules:

1. **Numbers are the hero.** Weights, reps, volume, dates and durations get the visual weight (mono, tabular, `text-ink`). Labels around them are small, muted, and uppercase.
2. **Chrome stays quiet.** Borders are 1px hairlines, surfaces differ by a few percent of lightness, and nothing animates for decoration.
3. **Accent is an indicator light, never an area.** Lime marks the *current* thing (active tab tick, focused row, logged tick, next workout, chart line). It appears as 2px bars, 8px squares, thin outlines and small fills, never as a card or screen background. The one large lime fill is the Graphite primary button.
4. **Hairlines, not shadows.** Depth comes from the `bg` > `surface` > `raised` steps plus a 1px border. No drop shadows, no blur, no gradients except the page dot grid.
5. **Mono is for data.** Anything logged or measured, plus every micro-label, is Geist Mono with tabular figures. Geist (sans) is for names, prose and buttons.
6. **Small, square-ish shapes.** Cards 8px, buttons and inputs 6px, chips 4px (never pills), segments 2px.
7. **Terse voice.** Short labels, no exclamation marks, no coaching copy, no emoji except 🏆 in the finish summary's PR list.
8. **Ledger and instrument metaphors.** Sections are indexed (`01 / THIS WEEK`), sets are ledger lines with a mono index, progress is a segmented bar like a level meter, and the page carries a faint graph-paper dot grid.

---

## 2. Tokens

All colours are CSS custom properties defined in `src/styles/index.css`. Paper is the default (`:root`, `[data-theme='light']`); Graphite is `[data-theme='dark']`. The `data-theme` attribute is set on `<html>` by `applyTheme()` (`src/lib/theme.ts`), resolving the `system` preference through `prefers-color-scheme`. Components never hard-code colours; they use the Tailwind utilities below.

### 2.1 Colour tokens

| Token | Tailwind name | Paper (light) | Graphite (dark) | Role |
|---|---|---|---|---|
| `--bg` | `bg-bg`, `text-bg` | `#eef1f4` | `#0a0c10` | Page background (carries the dot grid). Also the "pressed" fill (`active:bg-bg`) and inset stat-tile fill. |
| `--surface` | `bg-surface` | `#f8fafb` | `#11151b` | Default card, list container, tab bar, sticky session header. |
| `--raised` | `bg-raised` | `#ffffff` | `#171c24` | One step above surface: inputs, hero card, selected chip, sheets, secondary/danger button fill. |
| `--ink` | `text-ink`, `bg-ink`, `border-ink` | `#0a0e14` | `#e8edf2` | Primary text and strong strokes (selected chip border, done segments, workout-done tile). |
| `--muted` | `text-muted` | `#5b6572` | `#8893a0` | Secondary text, micro-labels, inactive tabs, placeholders, icons at rest. |
| `--hairline` | `border-hairline`, `bg-hairline`, `divide-hairline` | `#d3d9e0` | `#232a33` | All 1px borders, dividers, rest/off segments, skeleton fill. |
| `--hairline-strong` | `border-hairline-strong` | `#7d8794` | `#657080` | Borders of form controls (text inputs, selects, textareas, the file picker) so the field boundary reaches 3:1. Never for cards, rows or dividers. |
| `--accent` | `bg-accent` (fill only) | `#c6ff3d` | `#c6ff3d` | The lime. Fills, ticks, bars, selection highlight. Identical in both themes. |
| `--on-accent` | `text-on-accent` | `#0a0e14` | `#0a0c10` | Text/icons on an accent fill (`::selection`). |
| `--accent-ink` | `text-accent`, `border-accent` (remapped) | `#3d5a00` | `#c6ff3d` | Accent-coloured **text and lines**. Dark olive on Paper so it passes AA; equals the lime on Graphite. |
| `--primary` | `bg-primary`, `border-primary` | `#0a0e14` | `#c6ff3d` | Primary button fill and selected state of the settings segmented control. |
| `--on-primary` | `text-on-primary` | `#f8fafb` | `#0a0c10` | Text on `--primary`. |
| `--pr` | `text-pr`, `border-pr` | `#b86e00` | `#ffb84d` | Personal-record amber. **Icons and badge outlines only, never small text** (fails AA on Paper; see contrast). |
| `--danger` | `text-danger`, `border-danger` | `#c62839` | `#ff6b7a` | Destructive actions and invalid input. |
| `--scrim` | `bg-scrim` | `rgb(10 14 20 / 0.5)` | `rgb(0 0 0 / 0.65)` | Backdrop behind sheets. |

`color-scheme` is set per theme so native controls follow.

### 2.2 The `accent` remapping (read this before using lime)

`tailwind.config.ts` deliberately splits the word "accent" three ways:

| Utility | Resolves to | Use |
|---|---|---|
| `bg-accent` | `--accent` (lime) | Fills: 2px bars, ticks, 8px squares, filled segments. |
| `text-accent` | `--accent-ink` | Accent-coloured text and icons (links, indices, logged tick). |
| `border-accent` | `--accent-ink` | Accent outlines (segment outline, intensity swatches). |

So `text-accent` on Paper is dark olive `#3d5a00`, not lime. There is no utility for lime text; that is intentional, because lime text on Paper is 1.04:1.

### 2.3 Accent usage rules

| Need | Use | Never |
|---|---|---|
| A small filled marker (bar, tick, square, filled segment) | `bg-accent` (lime) | Fill a card, row or screen with it. |
| Accent text, link, index number, icon | `text-accent` (`--accent-ink`) | Use `bg-accent` colour as text colour. |
| Accent line/outline that must be visible on Paper | `border-accent` (`--accent-ink`) | Rely on lime alone on Paper (1.04 to 1.18:1). |
| Main call-to-action button | `--primary` via `Button` (ink on Paper, lime on Graphite) | Hand-roll `bg-accent` buttons. |
| Text on a lime fill | `text-on-accent` | `text-ink` (works today by coincidence on Paper, but not a token guarantee). |
| Active-state bar (tab tick, chip and radio underline, focused-row bar, resume bar) | `bg-accent-ink` (olive on Paper, lime on Graphite) | `bg-accent` lime on Paper (1.04 to 1.18:1). |
| Focus ring | `outline: 2px solid var(--accent-ink)` (global) | A lime outline. |

### 2.4 Semantic colours

- **PR (`--pr`)**: amber. Used as the colour of the `Trophy` icon (`text-pr`) and as a 1px border on the warm-up `W` badge. PR *text* is `text-ink` with the amber icon beside it. The 🏆 emoji appears only in the finish summary's PR list; everywhere else the amber `Trophy` icon is used. `--pr` is for icons and borders, never for small text (3.5 to 4.0:1 on Paper).
- **Danger (`--danger`)**: destructive `Button variant="danger"` (red text, red 1px border, raised fill), invalid set-entry text and hint, import error headings, backup error status. Always paired with words or an `aria-invalid`, never colour alone.
- There is no success/warning colour. "Done" is expressed in ink (`done` segment, workout-done tile) or the lime tick, not green.

### 2.5 Contrast table (WCAG 2.x)

Computed with a small Node script that converts sRGB to relative luminance and applies `(L1 + 0.05) / (L2 + 0.05)`. Thresholds: text 4.5:1 (AA), large text (18.66px bold or 24px) 3:1, UI components and graphics 3:1.

| Pair (foreground on background) | Paper | Graphite | Verdict |
|---|---|---|---|
| `ink` on `bg` | 17.06 | 16.61 | AA text |
| `ink` on `surface` | 18.47 | 15.54 | AA text |
| `ink` on `raised` | 19.34 | 14.52 | AA text |
| `muted` on `bg` | 5.22 | 6.27 | AA text |
| `muted` on `surface` | 5.65 | 5.87 | AA text |
| `muted` on `raised` | 5.92 | 5.48 | AA text |
| `muted` on `hairline` | 4.16 | 4.64 | Skeleton/decoration only; do not put text on a hairline fill |
| `accent-ink` on `bg` | 6.96 | 16.56 | AA text |
| `accent-ink` on `surface` | 7.54 | 15.50 | AA text |
| `accent-ink` on `raised` | 7.89 | 14.47 | AA text |
| `accent` (lime) on `bg` | 1.04 | 16.56 | **Fill/decoration only on Paper**; fine on Graphite |
| `accent` (lime) on `surface` | 1.13 | 15.50 | as above |
| `accent` (lime) on `raised` | 1.18 | 14.47 | as above |
| `on-accent` on `accent` | 16.37 | 16.56 | AA text |
| `on-primary` on `primary` | 18.47 | 16.56 | AA text (button labels) |
| `pr` on `bg` | **3.52** | 11.38 | Paper: **large text / icon / UI only, not body text**. Graphite: AA text |
| `pr` on `surface` | **3.81** | 10.65 | as above |
| `pr` on `raised` | **3.99** | 9.95 | as above |
| `danger` on `bg` | 4.92 | 7.12 | AA text |
| `danger` on `surface` | 5.33 | 6.66 | AA text |
| `danger` on `raised` | 5.58 | 6.22 | AA text |
| `hairline-strong` on `bg` | 3.21 | 3.90 | Form-control border (WCAG 1.4.11, 3:1) |
| `hairline-strong` on `surface` | 3.48 | 3.65 | as above |
| `hairline-strong` on `raised` | 3.64 | 3.41 | as above |
| `hairline` on `bg` | 1.25 | 1.35 | Decorative divider only (cards, rows, rules; never the sole boundary of a form control) |
| `hairline` on `surface` | 1.36 | 1.26 | as above |
| `hairline` on `raised` | 1.42 | 1.18 | as above |
| `bg` on `ink` (week-done tile) | 17.06 | 16.61 | AA text/icon |
| Focus ring (`accent-ink`) on `bg` / `surface` / `raised` | 6.96 / 7.54 / 7.89 | 16.56 / 15.50 / 14.47 | Passes 3:1 on every surface in both themes |

Take-aways:
- All text roles (`ink`, `muted`, `accent-ink`, `danger`, `on-*`) pass AA in both themes on all three surfaces.
- `--pr` on Paper is **not** AA for small text; keep it as an icon colour or outline, with the label in `text-ink`.
- Lime (`--accent`) is never text on Paper.
- Hairlines are decorative. Form controls use `--hairline-strong` (3.2 to 3.9:1) so their boundary is perceivable. Unselected chips keep the hairline because their mono label (4.5:1+) identifies them; selection is carried by border, fill and underline, not by hairline contrast.

### 2.6 Dot grid recipe

The page background is a faint graph-paper dot grid. Cards are solid surfaces on top.

```css
body {
  background-color: var(--bg);               /* via the bg-bg utility */
  background-image: radial-gradient(
    color-mix(in srgb, var(--ink) 9%, transparent) 1px,  /* dot: 9% ink at its core */
    transparent 1.2px
  );
  background-size: 24px 24px;                /* pitch */
  background-position: 11px 11px;            /* offset so dots avoid the edges */
}
```

The literal value is 9% ink on a 1px core fading to transparent at 1.2px; because the dot is only about 2px across on a 24px pitch, the overall page tone shifts by well under 1%. Do not enlarge or darken it; it must stay below the level where it competes with text.

---

## 3. Typography

### 3.1 Families

| Role | Family | Tailwind | Fallbacks |
|---|---|---|---|
| UI, names, prose, buttons | Geist (variable) | `font-sans` (default on `body`) | `ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif` |
| Numbers, labels, data | Geist Mono (variable) | `font-mono` | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` |

Both are self-hosted through npm (`@fontsource-variable/geist`, `@fontsource-variable/geist-mono`), imported at the top of `src/styles/index.css`, so they work offline and are precached by the service worker. The CSS family names are `"Geist Variable"` and `"Geist Mono Variable"`. Weights used: 400, 500, 600. `antialiased` is on for the body.

### 3.2 Type scale

`tailwind.config.ts` **overrides** the default size ramp with six distinct steps (there is no `2xl`). Note that `text-base` is 18px, not Tailwind's default 16px: it is the size for inputs, so every text-entry control is at least 16px and iOS Safari does not zoom on focus.

| Utility | Size / line-height | Typical use |
|---|---|---|
| `text-micro` | 11px / 16px | Micro-labels, set feedback line, tab labels (usually via `.micro`) |
| `text-xs` | 13px / 18px | Secondary data lines, chip text, mono card headers, row meta |
| `text-sm` | 15px / 22px | Body (the `body` default), button labels, row titles, hints |
| `text-base` | 18px / 24px | Set-entry input, form inputs, session title, stat values, card h2 |
| `text-xl` | 24px / 30px | Page title (`PageHeader`), sheet title, PR card value |
| `text-display` | 40px / 42px | Next-workout name on the Today hero (with `tracking-tighter`, weight 600) |

There are no off-scale literals: the week-strip day letters, the `R3` RIR badge and the `/dev/ui` swatch captions use `micro` (11px). Do not add `text-[Npx]`.

### 3.3 Weights and tracking

| Combination | Where |
|---|---|
| `font-semibold tracking-tight` | Page titles, sheet titles, buttons, row titles, stat values |
| `font-semibold tracking-tighter` (+ `text-display`) | Hero workout name |
| `font-mono text-xs font-semibold uppercase tracking-wide` | Exercise card header (`01 · BARBELL BENCH PRESS`) |
| `font-mono text-xs font-medium uppercase tracking-micro` | Chips, segmented controls, mono link buttons (`tracking-micro` = 0.08em) |
| `font-medium` | Set-entry input, tile text |
| `font-normal` | Placeholder text in the set input |

### 3.4 Recipes

```css
/* Terse uppercase micro-label. Use the class; do not re-type the values. */
.micro {
  font-family: theme('fontFamily.mono');
  font-size: 11px; line-height: 16px; font-weight: 500;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--muted);
}

/* Mono tabular numerals for any logged / data value. */
.num {
  font-family: theme('fontFamily.mono');
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}
```

`.micro` sets its own colour (`--muted`). To brighten part of a label, wrap the number in `<Mono className="text-ink">` or add `!text-ink` (used for "today" and "next" in the strips). `.tabular` is also available (tabular figures without changing family).

### 3.5 What must be mono (`.num` or `<Mono>`)

Must be mono with tabular figures:
- Anything the user logged: weights, reps (the entry fields), RIR, indices (`01`).
- Computed data: volume, set counts, durations, pace, distances, e1RM, chart axes and tooltips.
- Dates and times in lists and rows (`Mar 4`, `12:04`, relative-day labels).
- Counters inside labels (`3/5 done`, `04` group counts).
- All micro-labels, section labels, chips, tab labels, and exercise-card headers (the label *style* is mono even when it contains words).

Stays in the UI font: workout and exercise names in rows, button labels, titles, prose, notes, empty-state copy, settings labels.

### 3.6 Pairing examples

```tsx
// Row: UI-font title over a mono data line
<p className="truncate text-sm font-semibold text-ink">{session.workoutName}</p>
<p className="num truncate text-xs text-muted">Mon, Mar 4 · 52m · 18 sets · 12,480 lb</p>

// Micro-label with a bright mono number inside
<p className="micro"><Mono className="text-ink">{exerciseCount}</Mono> exercises</p>

// Stat tile
<p className="micro">Volume</p>
<p className="num mt-1 text-base font-semibold tracking-tight text-ink">12,480 lb</p>
```

---

## 4. Shape, spacing & layout

### 4.1 Radii and borders

| Token | Value | Used for |
|---|---|---|
| `rounded-card` | 8px | Cards, list containers, empty state, sheet top corners, icon tile |
| `rounded-btn` | 6px | Buttons, text inputs, segmented controls, tooltip, stat tiles, icon boxes |
| `rounded-chip` | 4px | Chips, schedule tiles, week-day tiles, warm-up badge |
| `rounded-[2px]` | 2px | Segments, intensity swatches, 8px accent squares, sheet grab handle |
| `rounded-none` | square | The 2px selected-chip underline (a straight line; there are no pills anywhere) |

Borders are always **1px** (`border`) in `border-hairline` unless a state changes the colour (`border-ink` selected, `border-danger`, `border-primary`). The only 2px strokes are accent bars/ticks (`h-0.5` / `w-0.5`), the note rule (`border-l-2 border-hairline`), and the focus outline. There are no shadows anywhere.

Hairline usage: card edge, `divide-y divide-hairline` between rows in a list card, `border-t` between a card header and its rows, and the `h-px flex-1 bg-hairline` rule in `SectionLabel`.

### 4.2 Spacing

Tailwind's 4px scale is unchanged. Named additions: `gutter` = 16px (`px-gutter`, `p-gutter`).

| Thing | Value |
|---|---|
| Screen side gutter | 16px (`px-gutter`) |
| Gap between page sections | 20px (`gap-5`); the session is a single ledger card |
| Section label to its content | 8px (`mt-2`) |
| Card padding | 16px (`p-4`, from `Card`); hero 20px (`p-5`); compact cards `!p-3` or `!p-0` with inner `px-3` |
| List row | min 48px (`min-h-touch`), `px-3 py-2`, `gap-3` |
| Exercise row (session) | min 64px (`min-h-16`): 48px inputs and log button plus a 16px caption; grows with a wrapping name |
| History edit set row | 48px index button beside the same entry fields |
| Page header | `px-gutter pb-2 pt-5`, min 48px |
| Bottom space | `pb-28` (112px) on `<main>` outside sessions, `pb-8` in sessions |
| Chip gap | 6px (`gap-1.5`); button groups 8px (`gap-2`) |

### 4.3 Touch targets

Every tappable control is at least **48x48px**: `min-h-touch` / `min-w-touch` (both 48px in the config). Exceptions are the 56px primary hero button (`min-h-[56px]`) and tab bar items (`min-h-[56px]`), which are larger. Small visuals sit inside larger hit areas (e.g. a 12px intensity swatch inside a 48px button). Read-only rows may be shorter (the read-only detail set line is 44px, a deliberate exemption) because they are not controls.

### 4.4 Layout

- Designed for 360 to 430px wide. The shell is `mx-auto min-h-screen max-w-app` with `app` = **560px**; on wider screens content centres and the dot grid continues behind it.
- Sheets and the tab bar also cap at `max-w-app`.
- No horizontal page scroll at 390px (guarded by `tests/e2e/f00-shell.spec.ts`). Intentional inner horizontal scroll exists only for the Program schedule tiles (`overflow-x-auto`) and markdown tables.
- `viewport-fit=cover` is set; bottom chrome adds `pb-safe` (`padding-bottom: env(safe-area-inset-bottom)`).

### 4.5 Z-order

| Layer | z-index | Notes |
|---|---|---|
| Page content | auto | |
| Tab bar (`fixed inset-x-0 bottom-0`) | `z-30` | 56px items + safe-area padding; hidden on `/session/*` |
| Session sticky header (`sticky top-0`) | `z-30` | `bg-surface`, bottom hairline; holds back, title, **Finish** |
| Sheet / ConfirmDialog (portal to `body`) | `z-50` | Scrim + panel, `max-h-[85vh]` |
| Update prompt toast | `z-50` | Fixed, `bottom-24`, a surface card with hairline |

The tab bar and session header never coexist, so sharing `z-30` is safe. Only the session screen has a sticky header; other pages scroll their `PageHeader`.

---

## 5. Components catalogue

All primitives live in `src/components/ui/` and are exported from `src/components/ui/index.ts`. States common to all: there is **no hover styling** (touch first); pressed is a 1px nudge/opacity or a `bg-bg` fill; focus is the global 2px `--accent-ink` outline with 2px offset.

### 5.1 Button (`Button.tsx`)

Purpose: every action. Props: `variant` (`primary` | `secondary` | `ghost` | `danger`, default `primary`), `fullWidth`, plus all `<button>` attributes (`type` defaults to `"button"`).

| Variant | Classes | Use |
|---|---|---|
| `primary` | `border border-primary bg-primary text-on-primary` | One main action per view (Start, Finish, Done). Ink on Paper, lime on Graphite. |
| `secondary` | `border border-hairline bg-raised text-ink` | Alternatives, Cancel, Edit, toggles off. |
| `ghost` | `border border-transparent bg-transparent text-accent` | Tertiary text actions (Choose another workout). |
| `danger` | `border border-danger bg-raised text-danger` | Destructive (Delete). Outlined, never filled. |

Base (from `buttonClass`): `inline-flex min-h-touch min-w-touch select-none items-center justify-center gap-2 rounded-btn px-4 text-sm font-semibold tracking-tight transition-[opacity,transform] active:translate-y-px active:opacity-80 disabled:opacity-40`, plus `w-full` when `fullWidth`.

States: default, pressed (`translate-y-px`, 80% opacity), disabled (40% opacity, native `disabled`), focus (global ring). A toggle uses `variant={on ? 'primary' : 'secondary'}` with `aria-pressed`.

Links as buttons: use `buttonClass(variant, fullWidth)` on a `<Link>`, never a `Button` inside a `Link`.

```tsx
<Link to="/activity/new" className={buttonClass('secondary', true)}>+ Log activity</Link>
<Button fullWidth disabled={starting} onClick={onStart} className="min-h-[56px] text-base">Start</Button>
```

Do: one primary per view; put the primary in reach of the thumb; keep labels to one or two words. Don't: fill danger buttons, add icons larger than 20px, or nest interactive elements.

### 5.2 Card (`Card.tsx`)

Purpose: a solid container on the dot grid. Props: `tone` (`surface` default | `raised`).

Classes: `rounded-card border border-hairline p-4` + `bg-surface` or `bg-raised`. Override padding with `!p-0` / `!p-3` (the `!` is needed because `p-4` is in the base string).

- `surface`: default content and list containers.
- `raised`: emphasis one step up: hero, PR cards, pace card.

```tsx
<Card tone="raised" className="flex flex-col gap-5 p-5">…</Card>
<Card className="!p-0" data-testid="exercise-card">…</Card>
```

List containers that are not `Card` copy the same recipe: `divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-surface`.

### 5.3 Chip (`Chip.tsx`)

Purpose: a single-select filter or choice. Props: `selected` (boolean), plus button attributes. Renders `aria-pressed={selected}`.

Classes: `relative inline-flex min-h-touch items-center justify-center rounded-chip border px-4 font-mono text-xs font-medium uppercase tracking-micro transition-colors`.
- Unselected: `border-hairline bg-surface text-muted`.
- Selected: `border-ink bg-raised text-ink` plus a 2px underline (`absolute inset-x-1.5 bottom-0 h-0.5 bg-accent-ink`, square-ended).

Selection is signalled by border, fill, text colour and the underline, so it does not depend on lime. Groups: wrap in `role="group"` with an `aria-label`, `flex gap-1.5`.

```tsx
<div className="flex gap-1.5" role="group" aria-label="Filter history">
  {FILTERS.map((f) => <Chip key={f.id} selected={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</Chip>)}
</div>
```

Don't make chips pills, add icons beyond 18px (`TypeChips` pairs an 18px icon with `!px-3`), or use them for navigation.

### 5.4 Sheet (`Sheet.tsx`)

Purpose: modal bottom drawer for secondary flows (finish summary, discard confirm, History set options, import). Props: `open`, `onClose`, `title` (required, becomes `aria-label` and the visible `h2`), `children`.

Anatomy:

```
 scrim (bg-scrim, tap to close)
 ┌──────────────── rounded-t-card, 1px hairline (no bottom border) ─┐
 │            ▬▬▬▬  (grab handle: h-1 w-10 bg-hairline)              │
 │ Title (text-xl font-semibold tracking-tight)                      │
 │ content …                                       (p-gutter, pb-safe)│
 └───────────────────────────────────────────────────────────────────┘
```

Panel: `relative max-h-[85vh] w-full max-w-app overflow-y-auto rounded-t-card border border-b-0 border-hairline bg-raised p-gutter pb-safe`. Behaviour: portal to `body`, `role="dialog" aria-modal`, focus moves to the first focusable (or the panel), Tab is trapped, Escape and backdrop close, focus returns to the opener. No slide animation.

Content convention: a column of `fullWidth` buttons (`flex flex-col gap-2`), primary first, Cancel/Done (`secondary`) last.

### 5.5 ConfirmDialog (`ConfirmDialog.tsx`)

A `Sheet` with an optional `message` (`text-sm text-muted`) and two stacked full-width buttons. Props: `open`, `title`, `message?`, `confirmLabel` (default "Confirm"), `cancelLabel` (default "Cancel"), `destructive` (confirm becomes `danger`, else `primary`), `onConfirm`, `onCancel`.

```tsx
<ConfirmDialog open={confirm} title="Delete item?" message="This cannot be undone."
  confirmLabel="Delete" destructive onConfirm={…} onCancel={…} />
```

Label the confirm button with the verb ("Delete"), not "OK". Use `destructive` for anything that loses data.

### 5.6 EmptyState (`EmptyState.tsx`)

Purpose: a list or screen with nothing in it. Props: `title`, `description?`, `icon?` (a lucide node), `action?`.

Anatomy: dashed hairline box (`rounded-card border border-dashed border-hairline px-6 py-10`, centred), optional 48px icon tile (`rounded-card border border-hairline bg-raised text-muted`), `h2` (`text-base font-semibold tracking-tight`), description (`text-sm text-muted`, `max-w-[28ch]`), action (`pt-2`). The dashed border is the signature of "empty".

```tsx
<EmptyState title="Nothing logged yet"
  description="Your finished workouts and activities will show up here."
  action={<Link to="/"><Button>Start your first workout</Button></Link>} />
```

Inline "no data" within a card uses a bare `micro` line instead (`No sessions in this range.`, `Nothing to show for this filter.`).

### 5.7 TabBar (`TabBar.tsx`)

Four fixed tabs: Today (`CalendarCheck`), History (`History`), Progress (`LineChart`), Program (`ListChecks`). Settings is an icon in the Program header, not a tab.

Anatomy: `nav` `fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface pb-safe`; inner `ul mx-auto flex max-w-app`; each item `flex-1`, `min-h-[56px]`, column of 20px icon + mono micro label (`font-mono text-micro font-medium uppercase tracking-micro`).
- Inactive: `text-muted`, icon `strokeWidth` 1.75.
- Active: `text-ink`, icon `strokeWidth` 2.25, and a 2px tick across the top edge (`absolute inset-x-5 -top-px h-0.5 bg-accent-ink`, `data-testid="tab-tick"`).

Hidden on `/session/*` (the session has its own sticky header).

### 5.8 PageHeader (`PageHeader.tsx`)

Props: `title`, `subtitle?`, `action?`. Anatomy: `header` `flex min-h-touch items-center justify-between gap-3 px-gutter pb-2 pt-5`; left column has an optional `micro` subtitle above an `h1` (`truncate text-xl font-semibold tracking-tight text-ink`); `action` (an icon button or Button) is right-aligned and `shrink-0`.

```tsx
<PageHeader title="Today" subtitle="Mon Mar 4" />
<PageHeader title={session.workoutName} subtitle={subtitle}
  action={<Button variant="secondary">Edit</Button>} />
```

The subtitle is data context in micro style (date, count, `Signal / dev`), never a tagline.

### 5.9 SectionLabel (`SectionLabel.tsx`)

Props: `index?` (number is zero-padded to `01`; a string is shown as-is), `children`, `action?`, `as` (`h2` default | `h3` | `p`), `className`.

Output: `01 / THIS WEEK ──────────── 3/4 done`. The index is `text-accent`, the slash is decorative (`aria-hidden`), the rule is `h-px flex-1 bg-hairline`, and the optional action is a right-aligned micro slot. Use `as="p"` or `h3` to keep heading levels valid. Omit `index` for sub-labels inside sheets (`Reps in reserve`, `Records`).

```tsx
<SectionLabel index={1} action={<><Mono className="text-ink">3</Mono>/<Mono>5</Mono> done</>}>This week</SectionLabel>
```

### 5.10 SegmentedBar (`SegmentedBar.tsx`)

A row of equal-width segments used as a level meter (exercises logged on the session screen). Props: `states?`, `value?`, `total?`, `label` (required), `className`. `role="img"` with `aria-label={label}` (e.g. "3 of 8 exercises logged"). Container: `flex items-end gap-1`; each segment `flex-1 rounded-[2px] border`.

| State | Classes | Meaning |
|---|---|---|
| `on` | `h-2 border-accent bg-accent` | Counted/logged (from `value`/`total`) |
| `current` | `h-3 border-accent bg-accent` | The next/current slot; 4px taller |
| `done` | `h-2 border-ink bg-ink` | Past/completed slot in a schedule |
| `off` | `h-2 border-hairline bg-transparent` | Not yet |
| `rest` | `h-2 border-hairline bg-hairline` | Rest day (filled hairline) |

Two modes: `value`/`total` produces `on` then `off` segments (sets logged, workouts this week). `states` gives explicit per-slot states and wins (7-day cycle). The lime fill has an `--accent-ink` outline so it stays visible on Paper. State is carried by height and fill, not colour alone.

```tsx
<SegmentedBar value={loggedCount} total={total} label={`${loggedCount} of ${total} exercises logged`} />
<SegmentedBar states={['done','done','rest','current','off','rest','off']} label="Seven day schedule" />
```

### 5.11 Mono (`Mono.tsx`)

`<span className="num …">`: mono tabular numerals for inline data. Use it inside prose, labels and rows. For a whole block already in a mono context, add `num` to the element instead.

```tsx
<Mono className="text-xs text-muted">{formatRelativeDay(e.at)}</Mono>
```

### 5.12 Non-primitive building blocks worth reusing

| Block | Where | Notes |
|---|---|---|
| `Field` + `inputClass` / `numInputClass` | `src/components/activity/fields.tsx` | Form field: micro label over a 48px input |
| `SettingsGroup` / `SettingsRow` / `Segmented` | `src/components/settings/SettingsGroup.tsx` | Indexed group of ledger rows; compact radio segmented control |
| `IntensityDots` | `src/components/activity/IntensityDots.tsx` | 1 to 5 segment picker |
| `ActivityTypeIcon` | `src/components/activity/ActivityTypeIcon.tsx` | Lucide glyph per activity type |

---

## 6. Signature patterns

### 6.1 Indexed section header

```
01 / THIS WEEK ─────────────────────────── 3/4 done
```

`SectionLabel index={n}`. Index counts sections on the page, starting at 1; History groups by week and indexes each group (`gi + 1`). The content follows after `mt-2`. The count/summary slot is mono.

### 6.2 Exercise ledger (session)

The session is **one table**: exercise on the left, the user's entry on the right. Each exercise has ONE weight field and ONE reps field that apply to all of its sets.

```
┌──────────────────────────────────────────────────────────┐
│ EXERCISE · 3 / 8 LOGGED                    WEIGHT / REPS │  px-3 pt-3, micro
│ ▰▰▰▱▱▱▱▱                                                 │  SegmentedBar, mx-3 mt-2 mb-3
├────────────────────────┬──────────┬─────────┬────────────┤
│ 01 Barbell Bench Press │   135    │    8    │     ✓      │  row (6.3)
│ 4 × 6–8                │    LB    │   REPS  │            │
│ LAST 135 x 8           │          │         │            │
├────────────────────────┼──────────┼─────────┼────────────┤
│ 02 Incline Dumbbell…   │  weight  │  reps   │    ( ↵ )   │
└────────────────────────┴──────────┴─────────┴────────────┘
                     Discard workout   (ghost, danger text)
```

- Container: `Card className="!p-0 overflow-hidden"` inside `px-gutter pb-6 pt-3`; the card's `overflow-hidden` also makes the global focus ring draw inset. Rows live in `ul.border-t.border-hairline`.
- Header: `micro` `Exercise · <num text-ink>3</num> / 8 logged` on the left, `micro` `Weight / reps` on the right, then the `SegmentedBar` (`value` = exercises with at least one stored set, `total` = exercises, label `3 of 8 exercises logged`). There is no per-card or per-set bar any more.
- Row: `li.group.relative.grid.min-h-16.grid-cols-[minmax(0,42fr)_minmax(0,58fr)].border-t.border-hairline.first:border-t-0`. Minimum height 64px (a 48px input plus its 16px caption); taller when the name wraps.
- **Column 1 (exercise, 42%)**: `py-2.5 pl-3 pr-2`. Name `h3` `text-sm font-semibold leading-[18px] tracking-tight text-ink [overflow-wrap:anywhere]`, preceded by the mono index (`num mr-1.5 text-xs font-medium text-muted`, `01`). The name **wraps and is never truncated** (a 33-character name takes three lines at 360px). Under it, `num mt-1 text-xs text-muted` shows the target `3 × 6–10`, then (when there is history) `Last <value>` on its own line (`data-testid="last-line"`, `micro` "Last" + a non-breaking space + the value): `105 x 9` when last time's working sets were identical (`bw x 12`, `+25 x 8`, `12 reps` for the other loads), otherwise the grouped list (`135 lb × 8 · 145 lb × 6`). Data only.
- **Column 2 (entry, 58%)**: `flex border-l border-hairline`, holding the entry fields (6.3).
- Focused row: `group-focus-within` shows the 2px `--accent-ink` bar at the row's left edge and the focused field gets the inset 2px ring. Logged rows are marked only by the tick (and the `data-logged` attribute): no fill, no colour change.
- Sets, swap, note, per-set numbering, per-set options and the collapsed card were removed. The only other things on the screen are the sticky header (back, `SESSION` label, workout name, **Finish**) and the ghost danger **Discard workout** button below the table.

### 6.3 Entry fields (weight + reps)

`EntryFields` (`src/components/session/EntryFields.tsx`) is the whole control. It is also used per set in History edit mode.

```
 ┌───────────┬───────────┐┌────┐
 │   62.5    │    10     ││ ↵  │   inputs 48px high; button 48x48
 └───────────┴───────────┘└────┘
      LB          REPS             caption row (micro, one line, 16px)
```

| Part | Spec |
|---|---|
| Weight field | `type="text"` `inputMode="decimal"` `enterKeyHint="next"`; `num h-12 w-full min-w-0 bg-transparent px-1 text-center text-lg font-medium` (18px, never under 16px so iOS does not zoom); placeholder `weight` (`placeholder:text-sm font-normal text-muted`); `aria-label="<Exercise> weight"`. Accepts `135`, `62.5`, `100kg`, `+25`, `bw` per load type. Not rendered for load `none`. |
| Reps field | `type="text"` `inputMode="numeric"` `enterKeyHint="done"`, same classes plus `border-l border-hairline` between the two fields; placeholder `reps`; `aria-label="<Exercise> reps"`. For load `none` it is the only field and takes the full width. |
| Common attributes | `autoCapitalize="off" autoCorrect="off" autoComplete="off" spellCheck={false}`. Both select their text on focus. |
| Log button | 48x48, `border-l border-hairline`. Unlogged or edited: `CornerDownLeft` 20px, `text-muted`, `aria-label="Log <Exercise>"` / `"Update <Exercise>"`, disabled at 30% when the pair is invalid. Logged and unedited: `Check` 22px stroke 3, `text-accent`, `aria-pressed`, `aria-label="Un-log <Exercise>"`; tapping deletes all the exercise's sets. |
| Caption row | `num truncate text-micro uppercase tracking-micro px-1 pb-1`, always one line so rows do not jump. Default: two centred labels under the fields, `LB`/`KG` (the display unit) and `REPS` (`aria-hidden`). After an edit with valid values the parsed preview replaces them (`100 lb × 8`, `BW × 8`, `12 reps`, muted). An invalid non-empty field shows its hint instead, `text-danger` (`weight (e.g. 135)`, `+25, or bw`, `whole reps (e.g. 8)`), `role="status"`. |
| Prefill | The previous session's first working set, shown in `text-muted` in BOTH fields until either is edited or the pair is logged. No history: empty fields with placeholders. |
| Invalid | The offending field's text becomes `text-danger` and gets `aria-invalid`; the hint appears in the caption row; logging is disabled. Never guess. |

**Focus order and keys:** weight, then reps, then the log button, then the next row. Enter in weight moves to reps; Enter in reps logs (or rewrites, for a logged row); logging a new exercise then moves focus to the next row's first field (see 8.5).

**Fit:** at 360px the entry column is about 190px: two fields of about 67px each plus the 48px button. `135.5` and `100` fit at 18px with no clipping (guarded in `tests/e2e/r3-single-entry.spec.ts`).

### 6.4 Add-set cell (History edit mode only)

Container `border-t border-hairline`, one full-width cell: `inline-flex min-h-touch w-full items-center justify-center gap-1.5 font-mono text-micro font-medium uppercase tracking-micro text-ink active:bg-bg` with a 14px `Plus`. The session screen no longer has an action strip.

### 6.5 Today hero

```
┌─────────────────────────────────────────────┐
│ ■ NEXT UP                                   │  ■ = 8px lime square (rounded-[2px])
│ Upper B                                     │  text-display font-semibold tracking-tighter
│ 9 EXERCISES                                 │  micro, count in <Mono text-ink>
│ ┌─────────────────────────────────────────┐ │
│ │                 Start                   │ │  primary, min-h-[56px], text-base
│ └─────────────────────────────────────────┘ │
│            Choose another workout           │  ghost
└─────────────────────────────────────────────┘
```

`Card tone="raised" className="flex flex-col gap-5 p-5"`. The **Resume** variant adds a 2px lime left bar (`absolute inset-y-0 left-0 w-0.5 bg-accent`, extra `pl-6`) and the label `In progress · started 12:04` (static time; no running clock). The hero has no rotation-schedule strip of its own — the calendar week's logged/not-logged state lives once, in the "This week" strip below (6.6).

### 6.6 Week strip tiles

`section` with `SectionLabel` (`3/4 done` in the action slot) over a `Card p-3` holding seven columns (`flex min-h-touch flex-1 flex-col items-center gap-1.5`): a `micro` day letter, a 28px tile (`h-7 w-7 rounded-chip border`), and a 16x2px underline for today.

| State | Tile |
|---|---|
| Workout | `border-ink bg-ink text-bg` with a 14px check |
| Activity | `border-ink bg-transparent` with a 6px ink square |
| Nothing | `border-hairline bg-transparent` |
| Today | day letter `!text-ink font-semibold` plus `h-0.5 w-4 bg-ink` underline |

Each `li` has an `aria-label` such as "Monday (today): workout done". A `SegmentedBar` of workouts done vs. target sits underneath (`mt-2`).

### 6.7 History ledger rows

A list container (`divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-surface`) of links. Row: `flex min-h-touch items-center gap-3 px-3 py-2 active:bg-bg` containing:
- 36px icon box (`h-9 w-9 rounded-btn border border-hairline bg-raised`, 18px lucide icon),
- a text column: title `text-sm font-semibold text-ink truncate` over a mono meta line `num truncate text-xs text-muted` joined with ` · ` (date, duration, sets, volume),
- a 16px `ChevronRight` in `text-muted`.

Today's "Recent" rows use a mono two-digit index (`01`) instead of the icon box and a right-aligned mono relative day.

Read-only session detail: exercise card with mono header and set lines `num min-h-[44px] text-base`. Identical working sets collapse into one line `3 × 100 lb × 8` (`font-medium`, no index); warm-ups and legacy differing sets keep one line each with an index (`w-10 text-center text-xs text-muted`), `135 lb × 8`, `RIR n` micro. A right-aligned `PR` marker (amber `Trophy` icon + `PR` in ink) appears when any of the line's sets set a record. Warm-up lines are `text-muted`. Edit mode lists per-set rows (48px index button + the entry fields), with Add set and the set options sheet.

### 6.8 Stat tiles

```
┌────────────┐ ┌────────────┐ ┌────────────┐
│ DURATION   │ │ SETS       │ │ VOLUME     │   grid grid-cols-3 gap-2
│ 52:10      │ │ 18         │ │ 12,480 lb  │
└────────────┘ └────────────┘ └────────────┘
```

Tile: `rounded-btn border border-hairline bg-bg p-3`; `micro` label; value `num mt-1 whitespace-nowrap text-base font-semibold tracking-tight text-ink`. The inset `bg-bg` fill makes it read as a recessed gauge inside a raised sheet.

### 6.9 PR rows

In the finish summary: `li.flex.items-center.gap-2.border-t.border-hairline.py-2.text-sm.first:border-t-0` with `🏆` (`role="img" aria-label="Personal record"`), exercise name (`flex-1 truncate`), and `num shrink-0 font-semibold text-ink` value `225 lb × 5`. In progress screens, record cards are `Card tone="raised" !p-3` with a `micro` title preceded by a 14px amber `Trophy`, a `num text-xl font-semibold tracking-tight` value, and a `num text-xs text-muted` caption (`× 5 · Mar 4, 2025`). Empty: `No data` micro.

### 6.10 Form field

```
DURATION (MIN)
┌──────────────────────────────┐
│ 45                           │   min-h-touch, rounded-btn, border-hairline, bg-raised, px-3, text-base
└──────────────────────────────┘
```

`Field` = `flex flex-col gap-1.5` with `<label className="micro">`. Text inputs use `inputClass` (`min-h-touch w-full rounded-btn border border-hairline-strong bg-raised px-3 text-base text-ink placeholder:text-muted`); numeric, date and time inputs use `numInputClass` (`num` + the same). Keep text at 16px or larger (18px here) so iOS does not zoom on focus; `tests/e2e/p1-polish.spec.ts` checks every text-entry control on every main screen. Use `border-hairline-strong` for any new form control. Pair fields in `grid grid-cols-2 gap-3`; start sections with `SectionLabel` (`-mb-2` to tighten under the `gap-5` form stack).

### 6.11 Segmented controls (three sanctioned forms)

| Form | Where | Spec |
|---|---|---|
| Chip row | Filters, ranges, type choice | `Chip` (4px radius, gap, underline) |
| Joined radio group | Metric toggle (progress) | `grid grid-cols-3 rounded-btn border border-hairline bg-surface`, cells `min-h-touch border-l border-hairline font-mono text-xs font-medium uppercase tracking-micro`; selected `bg-raised text-ink` + 2px underline (`bg-accent-ink`); `role="radiogroup"` / `role="radio"` / `aria-checked` |
| Inverted radio group | Settings (unit, theme) | `inline-flex divide-x divide-hairline overflow-hidden rounded-btn border border-hairline bg-bg`; selected `bg-primary text-on-primary` |

These three are the sanctioned set and are deliberately different (filter vs. mode vs. preference); do not unify them. Choose by context: a filter that changes a list = chips; a mutually exclusive mode of one view = joined group; a persistent preference = inverted group. Do not invent a fourth.

### 6.12 Pace / stat card

`Card tone="raised" className="flex items-center justify-between !py-3"`: `micro` label (`Pace`) left, `num text-base font-semibold text-ink` value right. Used for derived read-only values in forms.

### 6.13 Schedule tiles (Program)

Horizontal scroller (`flex gap-1 overflow-x-auto px-gutter`) of `min-w-[68px]` tiles: workout day = `border-ink bg-raised text-ink` with a 2px lime top bar; rest day = `border-dashed border-hairline text-muted`. Contents: `micro` "Day n" over a `text-sm font-semibold` name. Workout cards in Program use a bordered header row (`border-b border-hairline`) with an accent index and an accent mono "Edit" link.

### 6.14 Activity grid (`ActivityGrid.tsx`, top of History)

A GitHub-contribution-style grid: 14 columns (weeks, oldest to newest) of 7 rows (Mon-Sun), each day one cell. `SectionLabel` ("Last 14 weeks") with a `<Mono>logged</Mono>/<Mono>total</Mono> days` action, over `Card className="mt-2 !p-3"`. The grid has no day or month labels. A right-aligned `micro` legend sits under it (`Gym`, `Other`, `Both`, each with a 10px `rounded-[2px]` swatch; no swatch for empty days). It is `aria-hidden` because each cell carries its own `aria-label`.

The cells are separate rounded squares: one `<ol>` is a CSS grid (`grid-flow-col grid-rows-7`, `repeat(weeks, minmax(0,1fr))` columns, `gap-[3px]`), each cell `aspect-square rounded-[3px]` and scaling with the card width (~21px at 375px). Each cell is filled from the dedicated grid tokens by day state:

| State | Token / class | Paper | Graphite |
|---|---|---|---|
| `none` (nothing logged) | `bg-grid-empty` | `#e4e9ee` | `#1a2029` |
| `workout` (gym session) | `bg-grid-workout` (electric blue, pairs with the lime) | `#1f6bff` | `#3d8bff` |
| `activity` (any other activity) | `bg-grid-activity` (magenta) | `#e8388a` | `#ff5fa2` |
| `both` (session and activity) | `bg-grid-both` (diagonal split: workout blue top-left, activity magenta bottom-right; a CSS utility, not a colour token) | — | — |

The grid tokens are used only here. Today's cell gets a 1px `outline-ink` ring with a 1px offset, drawn into the gap. Colour is not the only carrier: each cell has its own `aria-label` ("Wednesday, Jan 15 (today): workout done and activity logged").

---

## 7. Data visualisation

Principle: **data only.** Charts show what happened. No trend lines, no targets, no goal bands, no forecasts, no "you should" annotations.

### 7.1 Progress chart (`ProgressChart.tsx`, Recharts)

| Element | Spec |
|---|---|
| Container | `h-60 w-full select-none`, `role="img"` with `aria-label="Top weight chart, 12 sessions"`; sits in `Card tone="raised" !px-2 !pt-3` |
| Line | `type="linear"`, `stroke="var(--accent-ink)"`, `strokeWidth={1.5}`, no area fill, no animation |
| Dots | Hollow: `r=3`, `fill var(--raised)`, `stroke var(--accent-ink)`, 1.5 stroke |
| Active dot | `r=5`, `fill var(--accent)`, `stroke var(--accent-ink)` |
| Grid | `CartesianGrid vertical={false}`, horizontal lines `stroke var(--hairline)` |
| X axis | Time scale, `Mon D` labels, no tick lines, axis line `var(--hairline)`, `minTickGap 24` |
| Y axis | Width 44, `domain auto`, integers, no axis line, no tick lines |
| Axis text | `fill var(--muted)`, 11px, `"Geist Mono Variable"` (mono) |
| Cursor | `var(--ink)`, 1px, dashed `2 3` |
| Tooltip | A ledger card: `num max-w-[220px] rounded-btn border border-ink bg-raised p-2.5 text-xs`; `micro` full date, value `text-base font-semibold text-ink`, then a `border-t border-hairline` line of the sets in `text-muted` |
| Margin | `{ top: 8, right: 12, bottom: 0, left: 0 }` |
| Summary line | Above the chart: `num px-2 pb-2 text-xs text-muted` ("Top weight · 12 sessions · latest 225 lb") |
| Empty | `micro px-2 py-10 text-center`: "No sessions in this range." |

Colours are theme-correct automatically because the chart uses CSS variables as SVG paints: Paper line `#3d5a00`, Graphite line `#c6ff3d`. Single series only, so there is no legend and no palette beyond ink/muted/hairline/accent-ink.

### 7.2 Sparkline (`Sparkline.tsx`)

64x24 SVG, 2px padding, `polyline` `stroke var(--accent-ink)` width 1.5 with round caps and joins, no axes. The last point is a hollow circle (`r 2.25`, `fill var(--surface)`, `stroke var(--accent-ink)`). One value draws only the dot, centred. Flat data draws a level line at mid-height. `role="img"` with `aria-label="Bench press top weight trend"`.

### 7.3 Meters

Counters are rendered as `SegmentedBar`s (sets per exercise, workouts per week) rather than percentage rings or plain numbers; the number sits beside it in mono (`3/5`).

---

## 8. Interaction, motion & accessibility

### 8.1 Motion

- Global default: `transition-duration: 120ms`, `ease-out` (set in `tailwind.config.ts`). Used by `transition-colors` (chips, segmented cells, intensity swatches) and Button's `transition-[opacity,transform]`.
- Pressed feedback: Button `active:translate-y-px active:opacity-80`; rows `active:bg-bg`.
- Other motion that exists: skeleton `animate-pulse` on the Today loading cards, and a 180-degree chevron rotation in the Program notes toggle (`transition-transform`). Sheets and tabs appear instantly.
- The single flourish is the logged-set tick: a **static icon swap** of the right-hand cell (log arrow to `--accent-ink` check) with no animation, by design. Keep it that small. Do not add confetti, bounces, count-ups or celebratory animation.
- `prefers-reduced-motion: reduce` clamps all animation and transition durations to `0.01ms`, iterations to 1, and scroll behaviour to auto, globally in `index.css`.

### 8.2 Focus

```css
:focus-visible { outline: 2px solid var(--accent-ink); outline-offset: 2px; }
.overflow-hidden :focus-visible { outline-offset: -2px; }   /* inset inside clipped list cards */
```

Global, keyboard-only (`:focus-visible`; text inputs always match). `--accent-ink` gives 6.96 to 7.89:1 on Paper surfaces and the lime (14.5 to 16.6:1) on Graphite, so every focusable control has a ring of at least 3:1 in both themes. Inside `overflow-hidden` list cards the ring is drawn inset so it is never clipped. The set-entry input keeps the ring too, inset (`focus-visible:outline-offset-[-2px]`), with the 2px left row bar (`bg-accent-ink`) as a secondary cue. Do not remove outlines anywhere. Dragging uses `ring-2 ring-accent`.

### 8.3 Labelling rules

- Icon-only buttons need `aria-label` (`Import program`, `Back to Today`, `Un-log set 2`) and icons carry `aria-hidden="true"`.
- Inputs need a label: visible `micro` `<label htmlFor>` (forms), `aria-label` (entry fields: `Bench Press weight`, `Bench Press reps`), or an `sr-only` span (search).
- Groups of toggles: `role="group"` + `aria-label` (chips), `role="radiogroup"` + `role="radio"` + `aria-checked` (segmented controls), `aria-pressed` for toggle buttons.
- Visual-only graphics get a text equivalent: `SegmentedBar` and charts are `role="img"` with a descriptive `aria-label`; decorative marks (`/`, accent squares, rules, ticks) are `aria-hidden`.
- Dialogs: `role="dialog" aria-modal="true" aria-label={title}`.
- Loading: `aria-busy="true" aria-label="Loading"`.

### 8.4 Colour is never the only signal

| State | Colour cue | Second cue |
|---|---|---|
| Active tab | `text-ink` | Heavier icon stroke plus a tick |
| Selected chip | `border-ink bg-raised` | Underline bar |
| Invalid set entry | `text-danger` | Hint text, `aria-invalid`, disabled log button |
| Logged set | ink text | Check icon (not an empty circle) |
| Workout done (week) | filled ink tile | Check icon, `aria-label` text |
| Segment state | fill | Height (`current` is taller), outline vs. fill |
| PR | amber icon | The word "PR" or 🏆 with `aria-label` |
| Rest day | hairline fill | Dashed border (Program), `REST` label |

### 8.5 Keyboard flow on the logging screen

1. Focus lands in an exercise's weight field (reps for load `none`); its content is selected so typing replaces it.
2. **Enter in weight** moves to reps (selected). **Enter in reps** logs the exercise exactly as shown (prefill included), when both fields are valid. Repeating last session is two keypresses.
3. Logging a new exercise writes all of its sets and moves focus straight to the next exercise's first field (the soft keyboard stays up); the next row scrolls to the middle of the screen (instantly under reduced motion). After the last exercise, focus is dropped and the Finish button stays in the sticky header.
4. Logged rows stay editable: change a field then press Enter in reps (or the button) to rewrite all the sets; focus stays put. Tapping the check un-logs (deletes all the exercise's sets).
5. Escape closes any sheet and focus returns to the control that opened it.

### 8.6 Touch targets and one-hand use

48px minimum everywhere (see 4.3); 56px for the hero Start and tab items; primary actions are full width. No hover-only UI, no gesture-only actions (drag handles in the editor are paired with buttons). Designed to be used one-handed at the gym on poor signal.

---

## 9. Iconography & brand

### 9.1 Lucide usage

`lucide-react` 1.66.0, imported per icon. Style: outline glyphs, default `strokeWidth` 2 unless stated.

| Context | Size | Stroke | Notes |
|---|---|---|---|
| Tab bar | 20 | 1.75 inactive / 2.25 active | Plus labels |
| Row/list icons in a 36px box | 18 | 2 | `Dumbbell`, activity glyphs |
| Chevron affordance | 16 | 2 | `ChevronRight`, `text-muted` |
| History edit `Add set`, `+` | 14 | 2 | With a mono label |
| Log arrow | 20 | 2 | `CornerDownLeft` |
| Logged tick | 22 | 3 | `Check`, `text-accent` |
| Week-strip check | 14 | 3 | On ink tiles |
| Header icon buttons | 20 | 2 | In 48px buttons (`Upload`, `Download`, `Repeat`, `Settings`) |
| Empty-state icon | 24 | 2 | In a 48px tile |

Meanings: `Check` = done/logged; `CornerDownLeft` = commit this entry; `Plus` = add; `ChevronRight` = opens; `ChevronLeft` / `ArrowLeft` = back; `ChevronDown` = expand; `Trophy` = record (amber); `GripVertical` = drag; `Trash2` = delete; `Pencil` = edit; `Upload` / `Download` = import / export; `Repeat` = switch program; `Dumbbell` = workout; `Footprints`, `Bike`, `Waves`, `PersonStanding`, `Mountain`, `Users`, `Activity` = activity types (a sport uses `Trophy`). Colour: `text-muted` at rest, `text-ink` when actionable in a strip, `text-accent` for the logged tick and accent links. Always `aria-hidden` beside text.

### 9.2 App icon

Square 512x512 `#0a0c10` (Graphite `--bg`) with three ascending rounded bars (72px wide, 8px radius, bottoms aligned at y=384) in lime `#c6ff3d` at increasing heights and opacity, plus a thin baseline:

| Element | x | y | w x h | Fill |
|---|---|---|---|---|
| Baseline | 104 | 408 | 304 x 6 (rx 2) | `#e8edf2` @ 0.35 |
| Bar 1 | 112 | 296 | 72 x 88 | `#c6ff3d` @ 0.4 |
| Bar 2 | 220 | 224 | 72 x 160 | `#c6ff3d` @ 0.7 |
| Bar 3 | 328 | 128 | 72 x 256 | `#c6ff3d` @ 1.0 |

It reads as a progress meter: the same lime-on-graphite "indicator" language as the UI.

Maskable (`icon-maskable.svg`, `icon-512-maskable.png`): the same artwork wrapped in `translate(256 256) scale(0.8) translate(-256 -256)` so the glyph sits inside the central 80% safe zone; the square background fills the full bleed.

Files in `public/icons/`: `icon.svg` (favicon), `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png`, `icon-maskable.svg` (source).

### 9.3 Manifest and theme colours

| Setting | Value | Source |
|---|---|---|
| `name` / `short_name` | trakr | `vite.config.ts` |
| `display` / `orientation` | `standalone` / `portrait` | `vite.config.ts` |
| `theme_color`, `background_color` | `#0A0C10` (Graphite bg) | `vite.config.ts` |
| `<meta name="theme-color">` | Two tags: `#eef1f4` for `(prefers-color-scheme: light)`, `#0a0c10` for `dark` | `index.html` |
| Runtime | `applyTheme()` rewrites every theme-color tag to the applied `--bg`, so the status bar follows the in-app toggle, not only the OS | `src/lib/theme.ts` |
| iOS | `apple-mobile-web-app-capable`, status bar `default`, title trakr | `index.html` |

---

## 10. Voice & content

Terse, factual, lowercase-friendly. The app states facts about the user's data and never coaches.

### 10.1 Casing

| Surface | Casing | Example |
|---|---|---|
| Micro-labels, section labels, chips, tab labels, exercise headers | Authored in sentence case, **rendered uppercase** by CSS | `This week` renders `THIS WEEK` |
| Page and sheet titles | Sentence case | `Workout summary`, `Today` |
| Buttons | Sentence case, 1 to 3 words | `Start`, `Finish workout`, `Keep logging`, `Choose another workout` |
| Row titles | As authored (names keep their case) | `Upper B`, `Cable lateral raise` |
| Body copy | Sentence case, ends with a full stop | `Nothing has been logged in this session.` |
| Never | Title Case, ALL CAPS in source, exclamation marks | |

Write labels in normal case in source and let `.micro` / `uppercase` do the shouting, so screen readers read words, not letters.

### 10.2 Numbers, units and dates

| Context | Format | Example |
|---|---|---|
| Typing / editing an entry | Two separate fields, no separator to type | weight `135`, `62.5`, `+25`, `bw`; reps `8` |
| Read views (history, preview, finish, charts) | Weight with unit, multiplication sign `×` | `105 lb × 9`, `100 kg × 5`, `12 reps` |
| Per-hand load | Unit + ` ea` | `30 lb ea` |
| Bodyweight plus | `BW` / `BW + 25 lb` | |
| Target | Sets `×` reps with an en dash range | `4 × 6–8` |
| Previous session line | `LAST` plus one entry when the sets were identical; otherwise the sets joined by ` · ` | `LAST 135 x 8`; `LAST 135 lb × 8 · 145 lb × 6` |
| Volume | Thousands separator, unit | `12,480 lb` |
| Duration (activities) | `45m`, `1h 05m` | |
| Finish-summary duration | `m:ss` or `h:mm:ss` | `52:10` |
| Clock time | 24h, `HH:MM` | `12:04` |
| Dates in lists | Short month + day; weekday names within the last week | `Mar 4`, `Yesterday`, `Thursday`; add year if not this year |
| Header date | Weekday, month, day, comma removed | `Mon Mar 4` |
| Counters | Zero-padded 2-digit indices, `n/total` | `04`, `3/5` |
| Meta lines | Parts joined with ` · ` | `Mon, Mar 4 · 52m · 18 sets` |

Rule of thumb: nothing is typed with an `x` any more; the compact `LAST 105 x 9` line is a read-only display, and every other display of a stored set uses `×` (`3 × 100 lb × 8` in History for identical sets). Dates and numbers are always mono.

### 10.3 Emoji and symbols

🏆 is the only emoji. It appears in one place, the PR list of the finish summary (`role="img" aria-label="Personal record"`). Everywhere else a PR is the amber `Trophy` icon (plus the word `PR`). Typographic characters in use: `×`, `·`, en dash `–`, ellipsis `…` in loading text. No other emoji, no decorative symbols.

### 10.4 Empty, error and confirmation copy

| Kind | Style | Examples from the app |
|---|---|---|
| Empty screen | Title states the absence; description says what fills it; at most one action | `Nothing logged yet` / `Your finished workouts and activities will show up here.` |
| Empty inline | A `micro` line | `Nothing to show for this filter.`, `No data`, `No sessions in this range.` |
| Missing prerequisite | Say what to do, one link | `No workouts available` / `Import or create a program to get started.` |
| Invalid input | Show the expected form, not blame | `weight (e.g. 135)`, `+25, or bw`, `whole reps (e.g. 8)` |
| Confirm | Title is the question; message states consequence; buttons are verbs | `Delete item?` / `This cannot be undone.` / `Delete` + `Cancel` |
| Positive state | Plain, no cheering | `New version available`, `Workout summary` |

No exclamation marks, no "Oops", no second-person pep talk, no advice about weights or training.

---

## 11. Do / Don't gallery

| # | Do | Don't |
|---|---|---|
| 1 | Separate layers with a 1px `border-hairline` and the `bg` / `surface` / `raised` steps. | Add `shadow-*`, blur or glow for depth. |
| 2 | Use lime for 2px bars, 8px squares, ticks and thin fills. | Fill a card, header, banner or button area with lime (except Graphite's `primary` button). |
| 3 | Use `text-accent` (maps to `--accent-ink`) for accent-coloured text. | Put lime text on Paper (1.04:1) or hard-code `#c6ff3d` for text. |
| 4 | Use 4px-radius rectangular `Chip`s. | Use pill chips or `rounded-full` buttons. |
| 5 | Set every weight, rep, date, duration and count in `.num` / `<Mono>`. | Put numbers in the Geist UI font, or mix proportional digits into a data column. |
| 6 | Write the label in sentence case and let `.micro` uppercase it. | Type `THIS WEEK` or Title Case in source. |
| 7 | Keep one weight field and one reps field per exercise, both text inputs with number keypads. | Add steppers, +/- buttons, a combined `weight x reps` box, or per-set rows on the session screen. |
| 8 | Show last session's numbers as plain data (`LAST 135 x 8`). | Suggest weights, show "try +5 lb", deload hints, or streak nagging. |
| 9 | Show elapsed values only as recorded stats (`52:10` on finish). | Add a running clock, rest timer or countdown. |
| 10 | Make every control at least 48x48px (`min-h-touch`). | Ship a 32px icon button because the glyph is small; pad the hit area instead. |
| 11 | Use Chart colours from tokens (`var(--accent-ink)`, `var(--hairline)`, `var(--muted)`). | Hard-code hex in components, or add chart gradients and area fills. |
| 12 | Use `buttonClass(...)` on a `<Link>` for navigation buttons. | Nest a `<Button>` inside a `<Link>` (two tab stops) in new code. |
| 13 | Use `danger` as outlined text-on-raised. | Fill buttons solid red or use red for non-destructive emphasis. |
| 14 | Pair state colour with a shape/text cue (check, underline, hint). | Rely on colour alone (e.g. red/green only). |
| 15 | Use 🏆 only in the finish summary's PR list. | Add celebratory emoji, confetti or animated badges. |
| 16 | Keep section headers indexed and ruled (`01 / LABEL ────`). | Use bold H2s with no rule or index on a new screen. |

---

## 12. Implementation cookbook

### 12.1 Add a new screen in this style

1. Create `src/routes/Name.tsx`, `lazy`-import it in `src/App.tsx`, and add a `<Route>` inside `Layout` (which supplies `max-w-app`, `pb-28`, and the tab bar).
2. Start with `<PageHeader title="…" subtitle="…" action={…} />` (subtitle = micro data context).
3. Body wrapper: `<div className="flex flex-col gap-5 px-gutter pb-6">`.
4. Number each logical block with `<SectionLabel index={n}>…</SectionLabel>` and put content `mt-2` beneath it in a `Card` or a hairline list container.
5. Rows: `min-h-touch px-3 py-2`, UI-font title + `num text-xs text-muted` meta, `ChevronRight` if navigable, `active:bg-bg` for pressed.
6. Forms: `Field` + `inputClass` / `numInputClass`; actions as `fullWidth` Buttons, primary last in the thumb zone.
7. Numbers and dates through `Mono` / `.num`; labels through `.micro`.
8. Provide loading (`aria-busy` skeleton or bare `PageHeader`), empty (`EmptyState`) and error states.
9. Use only tokens and existing primitives. If you need something new, build it from tokens, then add it to `src/dev/UiDemo.tsx` and this document.
10. Check it (12.4).

### 12.2 Add or change a token

1. Add the variable in **both** `:root, [data-theme='light']` and `[data-theme='dark']` in `src/styles/index.css`.
2. Map it in `tailwind.config.ts` under `theme.extend.colors` (`name: 'var(--name)'`).
3. Compute contrast for every text/background pair it will meet in both themes (use the formula in 2.5) and record it in section 2.5.
4. Add a swatch to `SWATCHES` in `src/dev/UiDemo.tsx`.
5. Update section 2 here. If the theme-colour meta values change, update `index.html` (both tags), `src/lib/theme.ts` and `vite.config.ts`.

### 12.3 Contrast script (reference)

```js
const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = h => { const n = parseInt(h, 16); return .2126 * lin(n >> 16) + .7152 * lin((n >> 8) & 255) + .0722 * lin(n & 255); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
ratio('3d5a00', 'f8fafb'); // accent-ink on Paper surface -> 7.54
```

### 12.4 Verify

- Run the dev server and open `/dev/ui` (use "Compare both themes" or the Paper/Graphite toggle). Check at **360, 390 and 430px** wide in both themes: no horizontal scroll, no clipped text, dot grid faint, hairlines visible.
- Exercise the screen with the keyboard (Tab order, visible focus ring, Escape on sheets) and with reduced motion enabled.
- Seed realistic data via `/dev/seed` to see long names, many sets and charts.

### 12.5 Gates

- **Touch targets:** every interactive element at least 48px in both dimensions (`min-h-touch` / `min-w-touch`).
- **Focus and zoom:** every focusable control shows a >= 3:1 ring in both themes; every text-entry control is >= 16px; form-control borders use `--hairline-strong` (>= 3:1). Guarded by `tests/e2e/p1-polish.spec.ts`.
- **Contrast:** AA text (4.5:1) in both themes; `--pr` and lime are never small text on Paper.
- **No horizontal scroll** at 390px (`tests/e2e/f00-shell.spec.ts`).
- **No hard-coded colours outside the token layer:** no hex or `rgb()` in `src/**/*.tsx` (currently none; only `index.css` and the app icons contain hex). Charts pass `var(--token)` strings.
- **No shadows, no gradients** except the dot grid.
- **Mono for data** (`.num`), `.micro` for labels, only the three sanctioned segmented-control forms.
- **Labelled controls and graphics** per 8.3.
- Primitives are covered by `tests/unit/ui/primitives.test.tsx`; run the unit and e2e suites for behavioural changes.
