import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ActivityFormBody, type ActivityInput } from '../components/activity/ActivityFormBody';
import { EmptyState, PageHeader } from '../components/ui';
import * as activities from '../db/repositories/activities';
import type { Activity } from '../domain/types';
import { useSettings } from '../hooks/useSettings';

export default function ActivityForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const settings = useSettings();
  // undefined = loading, null = not found.
  const [existing, setExisting] = useState<Activity | null | undefined>(id ? undefined : null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void activities.get(id).then((a) => {
      if (!cancelled) setExisting(a);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Go back; fall back to History when the form was opened directly.
  const goBack = () => {
    if (location.key === 'default') navigate('/history', { replace: true });
    else navigate(-1);
  };

  const save = async (input: ActivityInput) => {
    if (id) await activities.update(id, input);
    else await activities.add(input);
    goBack();
  };

  const remove = async () => {
    if (!id) return;
    await activities.remove(id);
    goBack();
  };

  const title = id ? 'Edit activity' : 'Log activity';

  if (!settings || existing === undefined) return <PageHeader title={title} />;
  if (id && existing === null) {
    return (
      <>
        <PageHeader title="Activity" />
        <EmptyState title="Activity not found" description="It may have been deleted." />
      </>
    );
  }

  return (
    <>
      <PageHeader title={title} />
      <ActivityFormBody
        initial={existing ?? undefined}
        weightUnit={settings.unit}
        onSave={save}
        onDelete={id ? remove : undefined}
      />
    </>
  );
}
