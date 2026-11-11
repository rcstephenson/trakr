# Trakr

Trakr is a local-first, mobile-first progressive web app for logging gym workouts against a predefined program and visualising your progress. It records and charts what you did; it does not give advice. Everything runs in the browser and works fully offline once installed.

Stack: React 18, TypeScript (strict), Tailwind, Dexie (IndexedDB), Zod, Recharts, Vitest, Playwright, `vite-plugin-pwa`.

## Data lives on your device

All data is stored in IndexedDB on the device and browser you use. There is no server and no account. Clearing site data, uninstalling the app or switching phones loses it unless you have a backup. **Export a JSON backup regularly** from Settings, and import it to restore or move to a new device.

## Logging a workout

Each exercise is one row with a weight field and a reps field (`135` and `8`; `+25` or `bw` for bodyweight exercises; reps alone for core work), and that one entry applies to all of the exercise's sets. Fields start filled with what you did last time: press Enter to log them as they are, or type over them. Enter in weight moves to reps, Enter in reps logs the exercise and moves to the next one, so a whole workout can be entered without leaving the keyboard. There are no timers and no suggestions. The screen is kept awake during a session where the browser supports the Wake Lock API, which needs HTTPS (so it works on the deployed site and `localhost`, but not over plain `http://` on a LAN address).

## Local development

```bash
npm ci
npx playwright install chromium   # once, for e2e tests
npm run dev                        # http://localhost:5173
```

Dev-only demo routes (`/dev/ui`, `/dev/seed`) exist in `npm run dev` and are excluded from production builds. The service worker is only active in production builds.

## Scripts

| Script              | What it does                                                                 |
| ------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`       | Vite dev server                                                              |
| `npm run build`     | Type-check, then build to `dist/` (manifest + service worker)                |
| `npm run preview`   | Serve `dist/` on port 4173 (use this to test the PWA)                        |
| `npm run typecheck` | `tsc --noEmit`                                                               |
| `npm run lint`      | ESLint                                                                       |
| `npm run test`      | Vitest unit tests                                                            |
| `npm run e2e`       | Playwright (builds and serves a preview; set `E2E_PORT` to use another port) |
| `npm run format`    | Prettier                                                                     |

## Deployment

Trakr is static files, so any HTTPS static host works (HTTPS is required for service workers and installation). The app uses `BrowserRouter`, so the host must fall back to `index.html` for unknown paths. `public/_redirects` does this for Cloudflare Pages and Netlify.

### GitHub Pages

`.github/workflows/deploy.yml` builds and deploys on every push to `main` (or run it by hand from the Actions tab). The site is served from a sub-path, `https://<user>.github.io/<repo>/`, so the workflow builds with `BASE_PATH=/<repo>/`; Vite's `base`, the manifest `start_url`/`scope`, the service worker fallback and the router `basename` all follow it. GitHub Pages has no rewrites, so the workflow copies `index.html` to `404.html` to keep deep links and refreshes working.

1. Push the repository to GitHub. On a free account the repository must be public to use Pages.
2. Repository Settings, Pages, Source: **GitHub Actions**.
3. Push to `main`. The Actions tab shows the deploy and its URL when it finishes.

To check a sub-path build locally: `BASE_PATH=/trakr/ npm run build && npm run preview`, then open `http://localhost:4173/trakr/`.

### Cloudflare Pages

1. Push the repository to GitHub/GitLab.
2. In the Cloudflare dashboard: Workers & Pages, Create, Pages, Connect to Git, pick the repo.
3. Build command: `npm run build`. Build output directory: `dist`. Node version 20 or later (set `NODE_VERSION` if needed).
4. Deploy. `_redirects` (`/*  /index.html  200`) provides the SPA fallback.

Or with Wrangler: `npm run build && npx wrangler pages deploy dist`.

### Netlify

1. New site from Git, same build command (`npm run build`) and publish directory (`dist`).
2. The same `_redirects` file is honoured by Netlify. Alternatively add a `netlify.toml` with a `[[redirects]]` rule from `/*` to `/index.html` with status 200.

### Updates

The service worker uses a prompt strategy. When a new version is deployed, installed users see a "New version available" toast with a Reload button. Their data is not affected.

## Install to the home screen

**iOS (Safari):** open the site in Safari, tap Share, then "Add to Home Screen", then Add. (Other iOS browsers cannot install web apps on older iOS versions.)

**Android (Chrome):** open the site, tap the menu, then "Install app" (or "Add to Home screen"), then confirm.

After the first load the app is cached and opens offline.
