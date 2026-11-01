import type { Activity } from '../../domain/types';
import { newId } from '../../lib/ids';
import { db } from '../schema';

export interface ActivityRange {
  /** Inclusive ISO lower bound on `startedAt`. */
  from?: string;
  /** Inclusive ISO upper bound on `startedAt`. */
  to?: string;
}

export async function add(input: Omit<Activity, 'id'>): Promise<Activity> {
  const activity: Activity = { ...input, id: newId() };
  await db.activities.add(activity);
  return activity;
}

export async function get(id: string): Promise<Activity | null> {
  return (await db.activities.get(id)) ?? null;
}

export async function update(id: string, patch: Partial<Omit<Activity, 'id'>>): Promise<Activity> {
  return db.transaction('rw', db.activities, async () => {
    await db.activities.update(id, patch);
    const activity = await db.activities.get(id);
    if (!activity) throw new Error(`Activity not found: ${id}`);
    return activity;
  });
}

export async function remove(id: string): Promise<void> {
  await db.activities.delete(id);
}

/** Activities in the range, newest first. */
export async function list(range: ActivityRange = {}): Promise<Activity[]> {
  return db.activities
    .where('startedAt')
    .between(range.from ?? '', range.to ?? '￿', true, true)
    .reverse()
    .toArray();
}
