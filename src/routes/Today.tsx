import { EmptyState, PageHeader } from '../components/ui';

export default function Today() {
  return (
    <>
      <PageHeader title="Today" />
      <EmptyState title="Coming soon" description="Built in F04." />
    </>
  );
}
