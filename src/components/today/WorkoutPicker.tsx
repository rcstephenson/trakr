import type { WorkoutTemplate } from '../../domain/types';
import { Sheet } from '../ui';

export interface WorkoutPickerProps {
  open: boolean;
  onClose: () => void;
  workouts: WorkoutTemplate[];
  onPick: (workoutId: string) => void;
}

export function WorkoutPicker({ open, onClose, workouts, onPick }: WorkoutPickerProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Choose a workout">
      <ul className="flex flex-col gap-2 pb-2">
        {workouts.map((w) => (
          <li key={w.id}>
            <button
              type="button"
              onClick={() => onPick(w.id)}
              className="flex min-h-touch w-full items-center justify-between rounded-btn border border-hairline bg-surface px-4 py-2 text-left active:bg-bg"
            >
              <span className="text-base font-medium tracking-tight text-ink">{w.name}</span>
              <span className="micro">{w.items.length} exercises</span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
