import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { WorkoutCard } from '../../../src/components/program/ProgramOverview';
import { altId } from '../../../src/domain/alternatives';
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
    // Bench Press has an alternative, so its name is a dropdown; Rear Delt Fly has none.
    const rows = screen.getAllByRole('listitem');
    const bench = within(rows[0]).getByRole('combobox');
    expect(bench).toHaveValue('barbell-bench-press');
    expect(bench.parentElement!.className).toContain('font-bold');
    expect(rows[0]).toHaveTextContent('(primary lift)');
    const fly = screen.getByText('Rear-Delt Fly');
    expect(fly.className).not.toContain('font-bold');
    expect(fly.closest('li')).not.toHaveTextContent('(primary lift)');
    const curl = screen.getByText('Bicep Curl');
    expect(curl.className).not.toContain('font-bold');
  });

  it('has no primary lifts on the Full Body day', () => {
    renderWorkout('full-body');
    expect(screen.queryByText(/\(primary lift\)/)).toBeNull();
  });

  it('offers alternatives in a dropdown instead of an "alt." text line', () => {
    const names = new Map(program.exercises.map((e) => [e.id, e.name]));
    const workout = program.workouts.find((w) => w.items.some((i) => i.alternatives.length > 1))!;
    const index = workout.items.findIndex((i) => i.alternatives.length > 1);
    const item = workout.items[index];
    renderWorkout(workout.id);
    expect(screen.queryByText(/^alt\. /)).toBeNull();
    const select = screen.getByRole('combobox', {
      name: `Exercise ${index + 1} and its alternatives`,
    });
    expect(select).toHaveValue(item.exerciseId);
    const labels = within(select)
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(labels).toEqual(
      [item.exerciseId, ...item.alternatives.map(altId)].map((id) => names.get(id)),
    );
  });

  it("previews an alternative's own sets, reps and notes", () => {
    const custom: Program = {
      ...program,
      workouts: [
        {
          id: 'w',
          name: 'W',
          items: [
            {
              exerciseId: 'lat-pulldown',
              sets: 3,
              repMin: 6,
              repMax: 10,
              notes: '',
              alternatives: [
                'seated-cable-row',
                {
                  exerciseId: 'pull-up',
                  sets: 4,
                  repMin: 5,
                  repMax: 8,
                  notes: 'Add weight past 8',
                },
              ],
            },
          ],
        },
      ],
    };
    render(
      <MemoryRouter>
        <WorkoutCard program={custom} workout={custom.workouts[0]} />
      </MemoryRouter>,
    );
    const row = screen.getByRole('listitem');
    expect(row).toHaveTextContent('3 × 6–10');
    const select = within(row).getByRole('combobox');
    fireEvent.change(select, { target: { value: 'pull-up' } });
    expect(row).toHaveTextContent('4 × 5–8');
    expect(row).toHaveTextContent('Add weight past 8');
    // A bare-id alternative inherits the default's prescription.
    fireEvent.change(select, { target: { value: 'seated-cable-row' } });
    expect(row).toHaveTextContent('3 × 6–10');
    expect(row).not.toHaveTextContent('Add weight past 8');
  });
});
