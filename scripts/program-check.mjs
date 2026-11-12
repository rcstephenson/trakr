// Validates program files: npm run program:check -- programs/my-routine.json
// With no arguments, checks every program in programs/ (files starting with "_" are skipped).
// Exit code 1 when a file is invalid; warnings (lookalike exercise ids etc.) do not fail the run.
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { programWarnings } from '../src/domain/programCheck.ts';
import { parseProgram } from '../src/domain/programSchema.ts';

const dir = resolve(import.meta.dirname, '..', 'programs');

function load(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    return { __error: e instanceof Error ? e.message : String(e) };
  }
}

/** Every real program in programs/ (skips "_" files and anything that is not a program, such as a backup). */
function siblings() {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.json') || name.startsWith('_')) continue;
    const parsed = parseProgram(load(join(dir, name)));
    if (parsed.ok) out.push({ file: name, program: parsed.program });
  }
  return out;
}

const args = process.argv.slice(2);
const targets =
  args.length > 0 ? args.map((a) => resolve(a)) : siblings().map((s) => join(dir, s.file));
const all = siblings();
let failed = false;

for (const path of targets) {
  const name = basename(path);
  const data = load(path);
  if (data.__error) {
    console.error(`FAIL ${name}: not valid JSON (${data.__error})`);
    failed = true;
    continue;
  }
  const result = parseProgram(data);
  if (!result.ok) {
    console.error(`FAIL ${name}`);
    for (const err of result.errors) console.error(`  - ${err}`);
    failed = true;
    continue;
  }
  const { program } = result;
  const others = all.filter((s) => s.file !== name);
  const warnings = programWarnings(program, others);
  if (name !== `${program.id}.json` && !name.startsWith('_')) {
    warnings.push(`file is named ${name}; name it ${program.id}.json to match its id.`);
  }
  const slots = program.workouts.reduce((n, w) => n + w.items.length, 0);
  console.log(
    `OK   ${name}: "${program.id}", ${program.workouts.length} workouts, ${slots} exercise slots, ${program.exercises.length} exercises`,
  );
  for (const w of warnings) console.warn(`  warning: ${w}`);
}

process.exit(failed ? 1 : 0);
