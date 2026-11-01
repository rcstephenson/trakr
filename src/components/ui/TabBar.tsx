import { NavLink } from 'react-router-dom';
import { CalendarCheck, History, LineChart, ListChecks } from 'lucide-react';

const tabs = [
  { to: '/', label: 'Today', Icon: CalendarCheck, end: true },
  { to: '/history', label: 'History', Icon: History, end: false },
  { to: '/progress', label: 'Progress', Icon: LineChart, end: false },
  { to: '/program', label: 'Program', Icon: ListChecks, end: false },
] as const;

export function TabBar() {
  return (
    <nav
      aria-label="Primary"
      className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface"
    >
      <ul className="mx-auto flex max-w-app">
        {tabs.map(({ to, label, Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-medium',
                  isActive ? 'text-accent' : 'text-muted',
                ].join(' ')
              }
            >
              <Icon size={22} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
