import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './ui';

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-24 z-50 mx-auto flex w-[calc(100%-32px)] max-w-app items-center justify-between gap-3 rounded-card border border-border bg-surface p-3 pl-4 shadow-card"
    >
      <span className="text-sm font-medium text-text">New version available</span>
      <span className="flex items-center gap-1">
        <Button variant="ghost" onClick={() => setNeedRefresh(false)}>
          Later
        </Button>
        <Button onClick={() => void updateServiceWorker(true)}>Reload</Button>
      </span>
    </div>
  );
}
