import { Link } from 'react-router-dom';
import { Settings as SettingsIcon } from 'lucide-react';
import { EmptyState, PageHeader } from '../components/ui';

export default function Program() {
  return (
    <>
      <PageHeader
        title="Program"
        action={
          <Link
            to="/settings"
            aria-label="Settings"
            className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-btn text-muted"
          >
            <SettingsIcon size={22} aria-hidden="true" />
          </Link>
        }
      />
      <EmptyState title="Coming soon" description="Built in F10." />
    </>
  );
}
