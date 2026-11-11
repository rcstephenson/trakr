import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActivityGrid } from '../../../src/components/history/ActivityGrid';

// Wednesday 2025-01-15 local time.
const TODAY = new Date(2025, 0, 15, 12, 0, 0);
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 10).toISOString();

describe('ActivityGrid', () => {
  it('renders 14 weeks of days, marking workout and activity-only days', () => {
    render(
      <ActivityGrid
        today={TODAY}
        sessions={[{ startedAt: at(2025, 1, 15) }]}
        activities={[{ startedAt: at(2025, 1, 13) }]}
      />,
    );

    const days = screen.getAllByTestId('activity-grid-day');
    expect(days).toHaveLength(98);

    const workoutDays = days.filter((d) => d.dataset.state === 'workout');
    const activityDays = days.filter((d) => d.dataset.state === 'activity');
    expect(workoutDays).toHaveLength(1);
    expect(activityDays).toHaveLength(1);
    expect(workoutDays[0]).toHaveAccessibleName(/Wednesday, Jan 15 \(today\): workout done/);
    expect(activityDays[0]).toHaveAccessibleName(/Monday, Jan 13: activity logged/);
  });

  it('a day with both a session and an activity gets its own "both" state', () => {
    render(
      <ActivityGrid
        today={TODAY}
        sessions={[{ startedAt: at(2025, 1, 15) }]}
        activities={[{ startedAt: at(2025, 1, 15) }]}
      />,
    );
    const days = screen.getAllByTestId('activity-grid-day');
    const both = days.filter((d) => d.dataset.state === 'both');
    expect(both).toHaveLength(1);
    expect(both[0]).toHaveClass('bg-grid-both');
    expect(both[0]).toHaveAccessibleName(
      /Wednesday, Jan 15 \(today\): workout done and activity logged/,
    );
    expect(days.filter((d) => d.dataset.state === 'workout')).toHaveLength(0);
    expect(days.filter((d) => d.dataset.state === 'activity')).toHaveLength(0);
  });

  it('colours workout, activity and empty days distinctly', () => {
    render(
      <ActivityGrid
        today={TODAY}
        sessions={[{ startedAt: at(2025, 1, 15) }]}
        activities={[{ startedAt: at(2025, 1, 13) }]}
      />,
    );
    const days = screen.getAllByTestId('activity-grid-day');
    const byState = (s: string) => days.find((d) => d.dataset.state === s);
    expect(byState('workout')).toHaveClass('bg-grid-workout');
    expect(byState('activity')).toHaveClass('bg-grid-activity');
    expect(byState('none')).toHaveClass('bg-grid-empty');
  });

  it('shows the logged/total day count in the heading', () => {
    render(
      <ActivityGrid
        today={TODAY}
        sessions={[{ startedAt: at(2025, 1, 15) }]}
        activities={[{ startedAt: at(2025, 1, 13) }]}
      />,
    );
    expect(screen.getByText('Last 14 weeks')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('98')).toBeInTheDocument();
  });
});
