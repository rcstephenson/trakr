import current from '../../programs/5day-upperlower-rev2.json';
import type { Program } from '../domain/types';

/**
 * Programs shipped inside the app. Listed explicitly (not globbed) so scratch files in `programs/`
 * (`_template.json`, personal backups) are never bundled. The first entry is seeded on a fresh
 * install; every one can be added later from Program > Import > Built-in programs.
 *
 * Currently a single bundled program (5-day upper/lower rev 2). To bundle another routine: add its
 * file to `programs/` and list it here.
 */
export const BUNDLED_PROGRAMS: ReadonlyArray<Program> = [current as unknown as Program];

/** The program installed and activated on a fresh install. */
export const DEFAULT_PROGRAM: Program = BUNDLED_PROGRAMS[0];
