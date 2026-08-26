import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AppLayout } from './AppLayout';
import { useAuth } from './providers/AuthProvider';
import { IS_CAREGIVER } from '../services/config';
import { LoginPage } from '../pages/Login/LoginPage';
import { DashboardPage } from '../pages/Dashboard/DashboardPage';
import { CaredDashboardPage } from '../pages/CaredDashboard/CaredDashboardPage';
import { EldersPage } from '../pages/Elders/EldersPage';
import { ElderProfilePage } from '../pages/ElderProfile/ElderProfilePage';
import { EmergenciesPage } from '../pages/Emergencies/EmergenciesPage';
import { RequestsPage } from '../pages/Requests/RequestsPage';
import { AppointmentsPage } from '../pages/Appointments/AppointmentsPage';
import { RemindersPage } from '../pages/Reminders/RemindersPage';
import { NotificationsPage } from '../pages/Notifications/NotificationsPage';
import { HomeHubPage } from '../pages/HomeHub/HomeHubPage';
import { SettingsPage } from '../pages/Settings/SettingsPage';
import { NotFoundPage } from '../pages/NotFound/NotFoundPage';
import { LocationPage } from '../pages/Location/LocationPage';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function CaregiverRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/elders" element={<EldersPage />} />
        <Route path="/elders/:id" element={<ElderProfilePage />} />
        <Route path="/emergencies" element={<EmergenciesPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/reminders" element={<RemindersPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/homehub" element={<HomeHubPage />} />
        <Route path="/location" element={<LocationPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

function CaredRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<CaredDashboardPage />} />
        <Route path="/reminders" element={<RemindersPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/emergencies" element={<EmergenciesPage />} />
        <Route path="/location" element={<LocationPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export function AppRoutes() {
  return IS_CAREGIVER ? <CaregiverRoutes /> : <CaredRoutes />;
}
