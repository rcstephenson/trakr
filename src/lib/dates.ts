// Date helpers. Weeks start on Monday. All dates are handled in local time.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local midnight of the given date. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Monday 00:00 (local) of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const offset = (d.getDay() + 6) % 7; // Mon=0 ... Sun=6
  d.setDate(d.getDate() - offset);
  return d;
}

/** Sunday 23:59:59.999 (local) of the week containing `date`. */
export function endOfWeek(date: Date): Date {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 7);
  return new Date(d.getTime() - 1);
}

/** The seven days (Mon-Sun) of the week containing `date`. */
export function weekDays(date: Date): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Local calendar date as `YYYY-MM-DD`. */
export function toDateKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Current instant as an ISO-8601 string. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** ISO-8601 string of the Monday that starts the week containing `date`. */
export function weekStartIso(date: Date): string {
  return startOfWeek(date).toISOString();
}

/** Whole calendar days from `from` to `to` (positive when `to` is later). */
export function diffInDays(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

/** "Today", "Yesterday", weekday name within the last week, otherwise "Mar 4". */
export function formatRelativeDay(input: Date | string, now: Date = new Date()): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const diff = diffInDays(date, now);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff === -1) return 'Tomorrow';
  if (diff > 1 && diff < 7) return date.toLocaleDateString('en-US', { weekday: 'long' });
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(
    'en-US',
    sameYear
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' },
  );
}
