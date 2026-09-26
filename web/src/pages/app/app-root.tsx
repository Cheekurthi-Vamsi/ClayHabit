import './app.css';

import { useAuth, useUser } from '@clerk/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router';

import { Spinner } from '../../components/ui';
import { setDriveLoginHint } from '../../lib/google-drive';
import { AppLayout } from './app-layout';
import { ChooseCopyScreen, ConnectScreen, CreatePasscodeScreen, UnlockScreen, WorkingScreen } from './gate-screens';
import { CalendarPage } from './screens/calendar-page';
import { DashboardPage } from './screens/dashboard-page';
import { FocusPage } from './screens/focus-page';
import { GoalsPage } from './screens/goals-page';
import { HabitsPage } from './screens/habits-page';
import { MoneyPage } from './screens/money-page';
import { NoteEditorPage } from './screens/note-editor-page';
import { NotesPage } from './screens/notes-page';
import { SettingsPage } from './screens/settings-page';
import { StatsPage } from './screens/stats-page';
import { TasksPage } from './screens/tasks-page';
import { SessionContext, useAccountSession, useSessionSnapshot } from './session-context';

/** Signed out → sign in. Signed in → this account's session (connect, unlock, restore) → the app. */
export default function AppRoot() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  if (!isLoaded) {
    return (
      <div className="gate">
        <Spinner />
      </div>
    );
  }
  if (!isSignedIn || !userId) return <Navigate to="/sign-in" replace />;
  return <AccountSession key={userId} userId={userId} />;
}

function AccountSession({ userId }: { userId: string }) {
  const { user } = useUser();
  const session = useAccountSession(userId);

  useEffect(() => {
    setDriveLoginHint(user?.primaryEmailAddress?.emailAddress);
  }, [user]);

  // The data lives only in this tab: warn before it closes with edits that haven't reached the Cloud.
  useEffect(() => {
    if (!session) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!session.hasUnsavedChanges()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [session]);

  if (!session) return <WorkingScreen message="Getting your space ready…" />;

  return (
    <SessionContext.Provider value={session}>
      <SessionGate />
    </SessionContext.Provider>
  );
}

function SessionGate() {
  const { phase, db } = useSessionSnapshot();
  switch (phase.name) {
    case 'connect':
      return <ConnectScreen phase={phase} />;
    case 'working':
      return <WorkingScreen message={phase.message} />;
    case 'unlock':
      return <UnlockScreen phase={phase} />;
    case 'create':
      return <CreatePasscodeScreen phase={phase} />;
    case 'choose':
      return <ChooseCopyScreen phase={phase} />;
    case 'ready':
      return db ? <ReadyApp /> : <WorkingScreen message="Opening your space…" />;
  }
}

function ReadyApp() {
  const { db, revision } = useSessionSnapshot();
  const queryClient = useMemo(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false, refetchOnWindowFocus: false } } }),
    [],
  );

  // A Cloud copy replaced the data (another device saved): every screen reads again.
  useEffect(() => {
    if (revision > 0) void queryClient.invalidateQueries();
  }, [queryClient, revision]);

  return (
    <SQLiteContext.Provider value={db}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="habits" element={<HabitsPage />} />
            <Route path="notes" element={<NotesPage />} />
            <Route path="notes/:id" element={<NoteEditorPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="focus" element={<FocusPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="money" element={<MoneyPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Route>
        </Routes>
      </QueryClientProvider>
    </SQLiteContext.Provider>
  );
}
