import { useEffect, useState } from 'react';
import { Button, Sheet } from '../ui';

export interface NoteSheetProps {
  open: boolean;
  exerciseName: string;
  value: string;
  onClose: () => void;
  /** Called on every change: notes persist immediately. */
  onChange: (text: string) => void;
}

export function NoteSheet({ open, exerciseName, value, onClose, onChange }: NoteSheetProps) {
  const [text, setText] = useState(value);
  useEffect(() => {
    if (open) setText(value);
    // Only re-seed when the sheet opens; typing must not be overwritten by the live query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} title={`Note: ${exerciseName}`}>
      <label htmlFor="exercise-note" className="sr-only">
        Note for {exerciseName}
      </label>
      <textarea
        id="exercise-note"
        value={text}
        rows={4}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value);
        }}
        className="mb-3 w-full rounded-btn border border-hairline bg-bg p-3 text-sm text-ink placeholder:text-muted"
      />
      <Button fullWidth onClick={onClose}>
        Done
      </Button>
    </Sheet>
  );
}
