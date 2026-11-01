// Dev-only demo data generator. Writes through the repositories; demo rows are tagged via `notes`.
import { activities, programs, sessions, sets } from '../db/repositories';
import type { Activity, Equipment, Exercise, Program, SetEntry } from '../domain/types';

export const DEMO_MARKER = '[trakr-demo]';

export interface DemoSession {
  workoutId: string;
  startedAt: Date;
  sets: Array<Omit<SetEntry, 'id' | 'sessionId' | 'completedAt'> & { completedAt: Date }>;
}

export interface DemoData {
  sessions: DemoSession[];
  activities: Array<Omit<Activity, 'id'>>;
}

/** Small deterministic PRNG so demo data is reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const START_RANGE: Record<Equipment, [number, number]> = {
  barbell: [95, 185],
  dumbbell: [20, 50],
  cable: [20, 60],
  machine: [40, 120],
  bodyweight: [0, 25],
  other: [20, 50],
};

const INCREMENT: Record<Equipment, number> = {
  barbell: 5,
  dumbbell: 5,
  cable: 2.5,
  machine: 5,
  bodyweight: 5,
  other: 5,
};

interface Plan {
  start: number;
  inc: number;
  /** Sessions between weight increases. */
  every: number;
}

function planFor(ex: Exercise | undefined, rand: () => number): Plan {
  const equipment = ex?.equipment ?? 'other';
  const [lo, hi] = START_RANGE[equipment];
  const inc = INCREMENT[equipment];
  const start = Math.round((lo + rand() * (hi - lo)) / inc) * inc;
  return { start, inc, every: 3 + Math.floor(rand() * 3) };
}

/** Pure generator: ~6 months of sessions following the program rotation, plus a few activities. */
export function generateDemoData(program: Program, now: Date = new Date(), seed = 8): DemoData {
  const rand = mulberry32(seed);
  const catalog = new Map(program.exercises.map((e) => [e.id, e]));
  const plans = new Map<string, Plan>();
  const counts = new Map<string, number>();
  const rotation = program.schedule.filter((s) => s !== 'rest');
  const workouts = new Map(program.workouts.map((w) => [w.id, w]));

  const out: DemoData = { sessions: [], activities: [] };
  let pointer = 0;
  const first = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 182);

  for (let day = 0; day <= 182; day++) {
    const date = new Date(first.getFullYear(), first.getMonth(), first.getDate() + day);
    if (date.getTime() > now.getTime()) break;
    if (program.schedule[day % program.schedule.length] === 'rest') continue;
    if (rand() < 0.15) continue; // missed day: the rotation is sequence-based, so it just slips.
    const workout = workouts.get(rotation[pointer % rotation.length]);
    pointer += 1;
    if (!workout) continue;

    const startedAt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17, 30);
    startedAt.setMinutes(startedAt.getMinutes() + Math.floor(rand() * 90));
    if (startedAt.getTime() > now.getTime()) continue;
    let clock = startedAt.getTime();
    const demo: DemoSession = { workoutId: workout.id, startedAt, sets: [] };

    workout.items.forEach((item, slotIndex) => {
      const ex = catalog.get(item.exerciseId);
      let plan = plans.get(item.exerciseId);
      if (!plan) {
        plan = planFor(ex, rand);
        plans.set(item.exerciseId, plan);
      }
      const n = counts.get(item.exerciseId) ?? 0;
      counts.set(item.exerciseId, n + 1);
      const weight = plan.start + Math.floor(n / plan.every) * plan.inc;
      const phase = n % plan.every;
      const target = Math.min(item.repMax, item.repMin + 1 + phase);

      let setIndex = 0;
      if (slotIndex === 0 && ex?.kind === 'compound' && weight > 0) {
        clock += 150_000;
        demo.sets.push({
          exerciseId: item.exerciseId,
          slotIndex,
          setIndex: setIndex++,
          weight: Math.round((weight * 0.6) / 2.5) * 2.5,
          unit: 'lb',
          reps: 8,
          isWarmup: true,
          completedAt: new Date(clock),
        });
      }
      for (let i = 0; i < item.sets; i++) {
        let reps = target - Math.floor(i / 2);
        if (rand() < 0.1) reps -= 1 + Math.floor(rand() * 3); // occasional missed reps
        clock += (ex?.kind === 'compound' ? 150_000 : 90_000) + Math.floor(rand() * 30_000);
        demo.sets.push({
          exerciseId: item.exerciseId,
          slotIndex,
          setIndex: setIndex++,
          weight,
          unit: 'lb',
          reps: Math.max(1, reps),
          isWarmup: false,
          completedAt: new Date(clock),
        });
      }
    });
    out.sessions.push(demo);
  }

  const kinds: Array<
    Pick<Activity, 'type' | 'title' | 'distanceUnit'> & { km?: [number, number] }
  > = [
    { type: 'run', title: 'Easy run', distanceUnit: 'km', km: [3, 8] },
    { type: 'walk', title: 'Evening walk', distanceUnit: 'km', km: [2, 5] },
    { type: 'class', title: 'Yoga class' },
    { type: 'cycle', title: 'Bike ride', distanceUnit: 'km', km: [10, 25] },
  ];
  for (let i = 0; i < 12; i++) {
    const kind = kinds[i % kinds.length];
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7 - i * 14);
    date.setHours(7, 30, 0, 0);
    if (date.getTime() > now.getTime()) continue;
    const distance = kind.km
      ? Math.round((kind.km[0] + rand() * (kind.km[1] - kind.km[0])) * 10) / 10
      : undefined;
    out.activities.push({
      type: kind.type,
      title: kind.title,
      startedAt: date.toISOString(),
      durationMin: distance ? Math.round(distance * (kind.type === 'cycle' ? 3 : 6)) : 45,
      ...(distance ? { distance, distanceUnit: kind.distanceUnit } : {}),
      intensity: 2 + Math.floor(rand() * 3),
    });
  }
  return out;
}

/** Deletes all demo-tagged sessions (with their sets) and activities. */
export async function clearDemoData(): Promise<{ sessions: number; activities: number }> {
  const demoSessions = (await sessions.list()).filter((s) => s.notes === DEMO_MARKER);
  for (const s of demoSessions) await sessions.remove(s.id);
  const demoActivities = (await activities.list()).filter((a) => a.notes === DEMO_MARKER);
  for (const a of demoActivities) await activities.remove(a.id);
  return { sessions: demoSessions.length, activities: demoActivities.length };
}

/** Replaces any previous demo data with freshly generated history for the active program. */
export async function seedDemoData(): Promise<{
  sessions: number;
  sets: number;
  activities: number;
}> {
  const program = await programs.getActive();
  if (!program) throw new Error('No active program');
  if (await sessions.getActive()) {
    throw new Error('Finish or discard the active session before generating demo data');
  }
  await clearDemoData();
  const data = generateDemoData(program);
  let setCount = 0;
  for (const demo of data.sessions) {
    const session = await sessions.start(program.id, demo.workoutId);
    for (const s of demo.sets) {
      await sets.add({
        sessionId: session.id,
        exerciseId: s.exerciseId,
        slotIndex: s.slotIndex,
        setIndex: s.setIndex,
        weight: s.weight,
        unit: s.unit,
        reps: s.reps,
        isWarmup: s.isWarmup,
        completedAt: s.completedAt.toISOString(),
      });
      setCount += 1;
    }
    const last = demo.sets[demo.sets.length - 1];
    await sessions.update(session.id, {
      startedAt: demo.startedAt.toISOString(),
      finishedAt: (last?.completedAt ?? demo.startedAt).toISOString(),
      status: 'completed',
      notes: DEMO_MARKER,
    });
  }
  for (const a of data.activities) await activities.add({ ...a, notes: DEMO_MARKER });
  return { sessions: data.sessions.length, sets: setCount, activities: data.activities.length };
}
