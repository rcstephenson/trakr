import { Stepper } from '../ui';
import { settings as settingsRepo } from '../../db/repositories';
import type { Equipment, Settings } from '../../domain/types';
import { Segmented, SettingsGroup, SettingsRow, Toggle } from './SettingsGroup';

const EQUIPMENT: { key: Equipment; label: string }[] = [
  { key: 'barbell', label: 'Barbell' },
  { key: 'dumbbell', label: 'Dumbbell' },
  { key: 'cable', label: 'Cable' },
  { key: 'machine', label: 'Machine' },
  { key: 'bodyweight', label: 'Bodyweight' },
  { key: 'other', label: 'Other' },
];

export function UnitsSection({ settings }: { settings: Settings }) {
  return (
    <SettingsGroup title="Units">
      <SettingsRow label="Weight unit" description="Stored data is never changed">
        <Segmented
          label="Weight unit"
          value={settings.unit}
          options={[
            { value: 'lb', label: 'lb' },
            { value: 'kg', label: 'kg' },
          ]}
          onChange={(unit) => void settingsRepo.update({ unit })}
        />
      </SettingsRow>
    </SettingsGroup>
  );
}

export function IncrementsSection({ settings }: { settings: Settings }) {
  const step = settings.unit === 'kg' ? 0.5 : 2.5;
  return (
    <SettingsGroup title="Weight increments">
      {EQUIPMENT.map(({ key, label }) => (
        <SettingsRow key={key} label={label}>
          <Stepper
            label={`${label} increment`}
            value={settings.increments[key]}
            step={step}
            min={step}
            unit={settings.unit}
            onChange={(v) => void settingsRepo.update({ increments: { [key]: v } })}
          />
        </SettingsRow>
      ))}
    </SettingsGroup>
  );
}

export function RestTimerSection({ settings }: { settings: Settings }) {
  return (
    <SettingsGroup title="Rest timer">
      <SettingsRow label="Rest timer">
        <Toggle
          label="Rest timer"
          checked={settings.restTimerEnabled}
          onChange={(restTimerEnabled) => void settingsRepo.update({ restTimerEnabled })}
        />
      </SettingsRow>
      <SettingsRow label="Sound">
        <Toggle
          label="Rest timer sound"
          checked={settings.restTimerSound}
          onChange={(restTimerSound) => void settingsRepo.update({ restTimerSound })}
        />
      </SettingsRow>
    </SettingsGroup>
  );
}

export function AppearanceSection({ settings }: { settings: Settings }) {
  return (
    <SettingsGroup title="Appearance">
      <SettingsRow label="Theme">
        <Segmented
          label="Theme"
          value={settings.theme}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' },
          ]}
          onChange={(theme) => void settingsRepo.update({ theme })}
        />
      </SettingsRow>
    </SettingsGroup>
  );
}
