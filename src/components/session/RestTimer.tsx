import { useEffect, useRef } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { formatRemaining, isDone, remainingMs } from '../../domain/restTimer';
import { useRestTimer } from '../../hooks/useRestTimer';
import { useSettings } from '../../hooks/useSettings';
import { useNow } from './hooks';

const DONE_VISIBLE_MS = 3000;

function beep(): void {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => void ctx.close();
  } catch {
    /* audio unavailable */
  }
}

/** Floating rest-timer pill. Start it with `startRestTimer()` from `useRestTimer`. */
export function RestTimer() {
  const settings = useSettings();
  const { timer, doneAt, adjustBy, dismiss, markDone } = useRestTimer();
  const now = useNow(250);
  const fired = useRef<number | null>(null);
  const sound = settings?.restTimerSound ?? false;

  const finished = timer !== null && isDone(timer, now);

  useEffect(() => {
    if (!timer || !finished || doneAt !== null || fired.current === timer.endsAt) return;
    fired.current = timer.endsAt;
    navigator.vibrate?.([200, 100, 200]);
    if (sound) beep();
    markDone();
  }, [timer, finished, doneAt, sound, markDone]);

  useEffect(() => {
    if (doneAt === null) return;
    const t = setTimeout(dismiss, DONE_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [doneAt, dismiss]);

  if (!settings?.restTimerEnabled || !timer) return null;

  const showDone = finished && doneAt !== null;
  const iconBtn =
    'inline-flex h-12 w-12 items-center justify-center rounded-full text-muted active:bg-accent-soft';

  return (
    <>
      {/* Spacer so the floating pill never covers the last set row. */}
      <div aria-hidden="true" className="h-24" />
      <div
        role="timer"
        data-testid="rest-timer"
        aria-live="off"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-app justify-center px-gutter pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-surface px-2 shadow-lg">
          {showDone ? (
            <p className="px-4 text-base font-semibold text-accent" role="status">
              Rest done
            </p>
          ) : (
            <>
              <button
                type="button"
                aria-label="Subtract 15 seconds"
                className={iconBtn}
                onClick={() => adjustBy(-15_000)}
              >
                <Minus size={18} aria-hidden="true" />
              </button>
              <p
                className="tabular min-w-16 text-center text-lg font-semibold text-text"
                aria-label="Rest remaining"
                data-testid="rest-remaining"
              >
                {formatRemaining(remainingMs(timer, now))}
              </p>
              <button
                type="button"
                aria-label="Add 15 seconds"
                className={iconBtn}
                onClick={() => adjustBy(15_000)}
              >
                <Plus size={18} aria-hidden="true" />
              </button>
            </>
          )}
          <button type="button" aria-label="Dismiss rest timer" className={iconBtn} onClick={dismiss}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  );
}
