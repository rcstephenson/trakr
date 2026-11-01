/** Pure rest-timer maths. Time is always derived from timestamps, never counted ticks. */
export interface RestTimerState {
  /** Epoch ms at which the rest period ends. */
  endsAt: number;
}

export function start(now: number, seconds: number): RestTimerState {
  return { endsAt: now + Math.max(0, seconds) * 1000 };
}

export function remainingMs(state: RestTimerState, now: number): number {
  return Math.max(0, state.endsAt - now);
}

/** Shift the end time by `deltaMs`, clamped so it never ends before `now` (default 0). */
export function adjust(state: RestTimerState, deltaMs: number, now = 0): RestTimerState {
  return { endsAt: Math.max(now, state.endsAt + deltaMs) };
}

export function isDone(state: RestTimerState, now: number): boolean {
  return now >= state.endsAt;
}

/** m:ss for a remaining duration (rounded up to whole seconds). */
export function formatRemaining(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
