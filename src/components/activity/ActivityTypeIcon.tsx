import {
  Activity as ActivityGlyph,
  Bike,
  Footprints,
  Mountain,
  PersonStanding,
  Trophy,
  Users,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { activityIcon, type ActivityIconName } from '../../domain/activity';
import type { ActivityType } from '../../domain/types';

const COMPONENTS: Record<ActivityIconName, LucideIcon> = {
  footprints: Footprints,
  bike: Bike,
  waves: Waves,
  'person-standing': PersonStanding,
  mountain: Mountain,
  trophy: Trophy,
  users: Users,
  activity: ActivityGlyph,
};

export function ActivityTypeIcon({ type, size = 18 }: { type: ActivityType; size?: number }) {
  const Icon = COMPONENTS[activityIcon(type)];
  return <Icon size={size} aria-hidden="true" />;
}
