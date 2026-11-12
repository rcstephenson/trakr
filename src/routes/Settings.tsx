import { PageHeader } from '../components/ui';
import { AppearanceSection, UnitsSection } from '../components/settings/SettingsSections';
import { AccountSection } from '../components/settings/AccountSection';
import { DataSection } from '../components/settings/DataSection';
import { useSettings } from '../hooks/useSettings';

export default function Settings() {
  const settings = useSettings();
  return (
    <>
      <PageHeader title="Settings" />
      {settings ? (
        <div className="flex flex-col gap-6 pb-6">
          <UnitsSection settings={settings} />
          <AppearanceSection settings={settings} />
          <DataSection />
          <AccountSection />
        </div>
      ) : null}
    </>
  );
}
