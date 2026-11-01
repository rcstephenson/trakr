import { ConfirmDialog } from '../ui';

export interface DiscardWorkoutDialogProps {
  open: boolean;
  /** Number of sets logged in the session (they are deleted with it). */
  setCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

/** The one confirmation used everywhere an in-progress workout can be thrown away. */
export function DiscardWorkoutDialog({
  open,
  setCount,
  onConfirm,
  onCancel,
}: DiscardWorkoutDialogProps) {
  const message =
    setCount === 0
      ? 'Nothing logged yet.'
      : `${setCount} logged ${setCount === 1 ? 'set' : 'sets'} will be deleted.`;
  return (
    <ConfirmDialog
      open={open}
      title="Discard this workout?"
      message={message}
      confirmLabel="Discard"
      cancelLabel="Keep logging"
      destructive
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
