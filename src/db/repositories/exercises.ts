import type { Exercise } from '../../domain/types';
import { db } from '../schema';

export async function list(): Promise<Exercise[]> {
  return db.exercises.orderBy('name').toArray();
}

export async function get(id: string): Promise<Exercise | null> {
  return (await db.exercises.get(id)) ?? null;
}

export async function upsert(exercise: Exercise): Promise<Exercise> {
  await db.exercises.put(exercise);
  return exercise;
}
