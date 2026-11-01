import { useEffect } from 'react';

/**
 * Keeps the screen awake while `active` (SPEC 6.2). Re-acquires the lock when the tab becomes
 * visible again; does nothing where the Wake Lock API is unsupported or the request is refused.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) void lock.release().catch(() => undefined);
        else sentinel = lock;
      } catch {
        // Denied (battery saver, hidden tab, ...): the session works fine without it.
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void sentinel?.release().catch(() => undefined);
    };
  }, [active]);
}
