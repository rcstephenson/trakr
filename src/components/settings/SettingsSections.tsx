import { settings as settingsRepo } from '../../db/repositories';
import type { Settings } from '../../domain/types';
import { Segmented, SettingsGroup, SettingsRow } from './SettingsGroup';

export function UnitsSection({ settings }: { settings: Settings }) {
  return (
    <SettingsGroup title="Units" index={1}>
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

export function AppearanceSection({ settings }: { settings: Settings }) {
  return (
    <SettingsGroup title="Appearance" index={2}>
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
