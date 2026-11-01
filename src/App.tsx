import { lazy, Suspense } from 'react';
import { BrowserRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { TabBar } from './components/ui';
import UpdatePrompt from './components/UpdatePrompt';
import { useApplyTheme } from './hooks/useApplyTheme';
import Today from './routes/Today';

// Everything except the landing route is split out so first paint ships less JS (charts, markdown, dnd).
const Session = lazy(() => import('./routes/Session'));
const History = lazy(() => import('./routes/History'));
const SessionDetail = lazy(() => import('./routes/SessionDetail'));
const Exercises = lazy(() => import('./routes/Exercises'));
const ExerciseProgress = lazy(() => import('./routes/ExerciseProgress'));
const ActivityForm = lazy(() => import('./routes/ActivityForm'));
const Program = lazy(() => import('./routes/Program'));
const WorkoutEditor = lazy(() => import('./routes/WorkoutEditor'));
const Settings = lazy(() => import('./routes/Settings'));

// Dev-only routes: the dynamic imports are dead-code-eliminated from production builds.
const UiDemo = import.meta.env.DEV ? lazy(() => import('./dev/UiDemo')) : null;
const SeedDemo = import.meta.env.DEV ? lazy(() => import('./dev/SeedDemo')) : null;

function Layout() {
  const { pathname } = useLocation();
  const inSession = pathname.startsWith('/session/');
  return (
    <div className="mx-auto min-h-screen max-w-app">
      <main className={inSession ? 'pb-8' : 'pb-28'}>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>
      {inSession ? null : <TabBar />}
    </div>
  );
}

export default function App() {
  useApplyTheme();
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Today />} />
          <Route path="/session/:id" element={<Session />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/session/:id" element={<SessionDetail />} />
          <Route path="/progress" element={<Exercises />} />
          <Route path="/progress/:exerciseId" element={<ExerciseProgress />} />
          <Route path="/activity/new" element={<ActivityForm />} />
          <Route path="/activity/:id" element={<ActivityForm />} />
          <Route path="/program" element={<Program />} />
          <Route path="/program/edit/:workoutId" element={<WorkoutEditor />} />
          <Route path="/settings" element={<Settings />} />
          {UiDemo ? <Route path="/dev/ui" element={<UiDemo />} /> : null}
          {SeedDemo ? <Route path="/dev/seed" element={<SeedDemo />} /> : null}
        </Route>
      </Routes>
      <UpdatePrompt />
    </BrowserRouter>
  );
}
