export type ThemePreference = 'light' | 'dark' | 'system';

/** Sets `data-theme` on <html>, resolving `system` via matchMedia. */
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
}
