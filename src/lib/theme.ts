export type ThemePreference = 'light' | 'dark' | 'system';

/** Page background per theme; mirrors `--bg` in src/styles/index.css (used when CSS is unavailable). */
const THEME_COLOR = { light: '#eef1f4', dark: '#0a0c10' } as const;

/**
 * Points every `<meta name="theme-color">` at the *applied* theme's background. index.html ships
 * two media-queried tags (OS preference); once the in-app toggle overrides the OS, both must agree.
 */
function syncThemeColor(resolved: 'light' | 'dark'): void {
  const fromCss = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  const color = fromCss || THEME_COLOR[resolved];
  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute('content', color));
}

/** Sets `data-theme` on <html>, resolving `system` via matchMedia, and syncs the browser theme colour. */
export function applyTheme(theme: ThemePreference): void {
  const resolved =
    theme === 'system'
      ? typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;
  document.documentElement.setAttribute('data-theme', resolved);
  syncThemeColor(resolved);
}
