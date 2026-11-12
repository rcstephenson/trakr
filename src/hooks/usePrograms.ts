import { useLiveQuery } from 'dexie-react-hooks';
import * as programs from '../db/repositories/programs';
import type { StoredProgram } from '../domain/types';

/** Live list of every installed program (active or not). `undefined` while loading. */
export function usePrograms(): StoredProgram[] | undefined {
  return useLiveQuery(() => programs.list(), []);
}
