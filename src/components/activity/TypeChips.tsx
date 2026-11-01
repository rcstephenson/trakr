import { ACTIVITY_LABELS, ACTIVITY_TYPES } from '../../domain/activity';
import type { ActivityType } from '../../domain/types';
import { Chip } from '../ui';
import { ActivityTypeIcon } from './ActivityTypeIcon';

export function TypeChips({
  value,
  onChange,
}: {
  value: ActivityType;
  onChange: (type: ActivityType) => void;
}) {
  return (
    <div role="group" aria-label="Activity type" className="flex flex-wrap gap-2">
      {ACTIVITY_TYPES.map((t) => (
        <Chip key={t} selected={value === t} onClick={() => onChange(t)} className="gap-2">
          <ActivityTypeIcon type={t} />
          {ACTIVITY_LABELS[t]}
        </Chip>
      ))}
    </div>
  );
}
