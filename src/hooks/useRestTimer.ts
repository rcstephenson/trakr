import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { adjust, start, type RestTimerState } from '../domain/restTimer';

/** Module-level store so the timer survives re-renders and set-completion callbacks. */
let state: RestTimerState | null = null;
let doneAt: number | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}
function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Start (or restart) the timer. Called after a set is completed. */
export function startRestTimer(seconds: number): void {
  state = start(Date.now(), seconds);
  doneAt = null;
  emit();
}
export function dismissRestTimer(): void {
  state = null;
  doneAt = null;
  emit();
}
function adjustRestTimer(deltaMs: number): void {
  if (!state) return;
  state = adjust(state, deltaMs, Date.now());
  doneAt = null;
  emit();
}
function markDone(): void {
  doneAt = Date.now();
  emit();
}

export interface RestTimerView {
  timer: RestTimerState | null;
  /** Epoch ms when the timer finished and the alert fired, once it has. */
  doneAt: number | null;
  adjustBy: (deltaMs: number) => void;
  dismiss: () => void;
  markDone: () => void;
}

export function useRestTimer(): RestTimerView {
  const timer = useSyncExternalStore(subscribe, () => state);
  const done = useSyncExternalStore(subscribe, () => doneAt);
  // Reset when the session screen goes away.
  useEffect(() => dismissRestTimer, []);
  const adjustBy = useCallback((d: number) => adjustRestTimer(d), []);
  return { timer, doneAt: done, adjustBy, dismiss: dismissRestTimer, markDone };
}
