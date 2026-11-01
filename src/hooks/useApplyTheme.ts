import { useEffect } from 'react';
import { applyTheme } from '../lib/theme';
import { useSettings } from './useSettings';

/**
 * Keeps `<html data-theme>` in sync with `settings.theme`, and re-applies when the OS
 * colour scheme changes (only matters for `system`). Call once at the app root.
 */
export function useApplyTheme(): void {
  const theme = useSettings()?.theme;

  useEffect(() => {
    if (!theme) return;
    applyTheme(theme);
    if (theme !== 'system' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [theme]);
}
