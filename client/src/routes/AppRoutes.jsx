
import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import RoleGuard from '../guards/RoleGuard';
 
// Shared (all authenticated roles)
const UserProfilePage = lazy(() => import('../pages/profile/UserProfilePage'));
 
// Public
const PublicLandingPage = lazy(() => import('../pages/public/PublicLandingPage'));
const JoinSessionPage = lazy(() => import('../pages/public/JoinSessionPage'));
const UnauthorizedPage = lazy(() => import('../pages/public/UnauthorizedPage'));
const AuthLoginPage = lazy(() => import('../pages/public/auth/AuthLoginPage'));
const AuthRegisterPage = lazy(() => import('../pages/public/auth/AuthRegisterPage'));
 
// Participant
const ParticipantLayout = lazy(() => import('../layouts/ParticipantLayout'));
const ParticipantDashboard = lazy(() => import('../pages/participant/ParticipantDashboard'));
const ParticipantSessionPage = lazy(() => import('../pages/participant/ParticipantSessionPage'));
const ParticipantHistoryPage = lazy(() => import('../pages/participant/ParticipantHistoryPage'));
 
// Host
const HostLayout = lazy(() => import('../layouts/HostLayout'));
const HostDashboard = lazy(() => import('../pages/host/HostDashboard'));
const HostStudioPage = lazy(() => import('../pages/host/HostStudioPage'));
const HostLaunchPage = lazy(() => import('../pages/host/HostLaunchPage'));
const HostLobbyPage = lazy(() => import('../pages/host/HostLobbyPage'));
const HostEditPage = lazy(() => import('../pages/host/HostEditPage'));
const HostLivePage = lazy(() => import('../pages/host/HostLivePage'));
const HostAnalyticsPage = lazy(() => import('../pages/host/HostAnalyticsPage'));
const HostHistoryPage = lazy(() => import('../pages/host/HostHistoryPage'));
 
// Session Details (Shared/Refactored)
const HostSessionDetailPage = lazy(() => import('../pages/history/SessionHistoryDetailPage'));
 
// Admin
const AdminLayout = lazy(() => import('../layouts/AdminLayout'));
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const AdminUserManagement = lazy(() => import('../pages/admin/AdminUserManagement'));
const BillingOverviewPage = lazy(() => import('../pages/billing/BillingOverviewPage'));
 
export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<PublicLandingPage />} />
      <Route path="/login" element={<AuthLoginPage />} />
      <Route path="/register" element={<AuthRegisterPage />} />
      <Route path="/join/:code" element={<JoinSessionPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
 
      {/* Join Route */}
      <Route path="/join" element={<JoinSessionPage />} />
 
      {/* Participant */}
      <Route element={
        <RoleGuard roles={['participant']}>
          <ParticipantLayout />
        </RoleGuard>
      }>
        <Route path="/p" element={<ParticipantDashboard />} />
        <Route path="/p/dashboard" element={<ParticipantDashboard />} />
        <Route path="/p/history" element={<ParticipantHistoryPage />} />
        <Route path="/quiz/:code" element={<ParticipantSessionPage />} />
        <Route path="/quiz/sessions/:id" element={<HostSessionDetailPage />} />
      </Route>
 
      {/* Global Shared Routes */}
      <Route element={
        <RoleGuard roles={['host', 'admin', 'participant']}>
          <ParticipantLayout />
        </RoleGuard>
      }>
        <Route path="/history" element={<HostHistoryPage />} />
      </Route>
 
      {/* Host */}
      <Route element={
        <RoleGuard roles={['host', 'admin']}>
          <HostLayout />
        </RoleGuard>
      }>
        <Route path="/o" element={<Navigate to="/studio" replace />} />
        <Route path="/o/dashboard" element={<HostDashboard />} />
        <Route path="/studio" element={<HostStudioPage />} />
        <Route path="/quiz/templates/:quizId" element={<HostEditPage />} />
        <Route path="/launch/quiz/:id" element={<HostLaunchPage />} />
        <Route path="/quiz/templates/:id/launch" element={<HostLaunchPage />} />
        <Route path="/invite/:id" element={<HostLobbyPage />} />
        <Route path="/quiz/templates/:id/session" element={<HostLobbyPage />} />
        <Route path="/live/:quizId" element={<HostLivePage />} />
        <Route path="/analytics" element={<HostAnalyticsPage />} />
        <Route path="/history/template_id/:id" element={<HostSessionDetailPage />} />
      </Route>
 
      {/* Profile â€” accessible to every authenticated role */}
      <Route path="/profile" element={
        <RoleGuard roles={['participant', 'host', 'admin']}>
          <UserProfilePage />
        </RoleGuard>
      } />
      <Route path="/profile/edit" element={
        <RoleGuard roles={['participant', 'host', 'admin']}>
          <UserProfilePage initialMode="edit" />
        </RoleGuard>
      } />
 
      {/* Admin */}
      <Route element={
        <RoleGuard roles={['admin']}>
          <AdminLayout />
        </RoleGuard>
      }>
        <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/users" element={<AdminUserManagement />} />
        <Route path="/billing" element={<BillingOverviewPage />} />
      </Route>
    </Routes>
  );
}
