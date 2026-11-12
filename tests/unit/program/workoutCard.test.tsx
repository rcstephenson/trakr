import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { WorkoutCard } from '../../../src/components/program/ProgramOverview';
import type { Program } from '../../../src/domain/types';
import bundled from '../../../programs/5day-upperlower-rev2.json';

const program = bundled as unknown as Program;

function renderWorkout(id: string) {
  const workout = program.workouts.find((w) => w.id === id)!;
  render(
    <MemoryRouter>
      <WorkoutCard program={program} workout={workout} />
    </MemoryRouter>,
  );
}

describe('WorkoutCard', () => {
  it('shows primary lifts in bold and labels them for screen readers', () => {
    renderWorkout('upper-a');
    const bench = screen.getByText('Barbell Bench Press');
    expect(bench.className).toContain('font-bold');
    expect(bench).toHaveTextContent('(primary lift)');
    const curl = screen.getByText('Dumbbell Curl');
    expect(curl.className).not.toContain('font-bold');
    expect(curl).not.toHaveTextContent('(primary lift)');
  });

  it('has no primary lifts on the Full Body day', () => {
    renderWorkout('full-body');
    expect(screen.queryByText(/\(primary lift\)/)).toBeNull();
  });

  it('lists alternatives as "alt. x, y" in plain text', () => {
    const names = new Map(program.exercises.map((e) => [e.id, e.name]));
    const workout = program.workouts.find((w) => w.items.some((i) => i.alternatives.length > 1))!;
    const item = workout.items.find((i) => i.alternatives.length > 1)!;
    renderWorkout(workout.id);
    const expected = `alt. ${item.alternatives.map((a) => names.get(a)).join(', ')}`;
    const line = screen.getByText(expected);
    expect(line.className).not.toContain('italic');
    expect(line.textContent).not.toContain('"');
    expect(screen.queryByText(/^or /)).toBeNull();
  });
});
