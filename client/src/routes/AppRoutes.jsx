
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
const QuizSessionPage = lazy(() => import('../pages/quiz/QuizSessionPage'));

// Organizer
const OrganizerLayout = lazy(() => import('../layouts/OrganizerLayout'));
const OrganizerDashboard = lazy(() => import('../pages/organizer/OrganizerDashboard'));
const StudioDashboardPage = lazy(() => import('../pages/studio/StudioDashboardPage'));
const QuizLaunchPage = lazy(() => import('../pages/studio/QuizLaunchPage'));
const QuizLobbyPage = lazy(() => import('../pages/studio/QuizLobbyPage'));
const QuizEditorPage = lazy(() => import('../pages/studio/QuizEditorPage'));
const LiveSessionPage = lazy(() => import('../pages/studio/LiveSessionPage'));
const AnalyticsDashboardPage = lazy(() => import('../pages/analytics/AnalyticsDashboardPage'));
const SessionHistoryPage = lazy(() => import('../pages/history/SessionHistoryPage'));
const SessionHistoryDetailPage = lazy(() => import('../pages/history/SessionHistoryDetailPage'));

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
        <Route path="/p" element={<Navigate to="/join" replace />} />
        <Route path="/p/dashboard" element={<Navigate to="/join" replace />} />
        <Route path="/p/history" element={<Navigate to="/history" replace />} />
        <Route path="/quiz/:code" element={<QuizSessionPage />} />
        <Route path="/quiz/sessions/:id" element={<SessionHistoryDetailPage />} />
      </Route>

      {/* Global Shared Routes */}
      <Route element={
        <RoleGuard roles={['organizer', 'admin', 'participant']}>
          <ParticipantLayout />
        </RoleGuard>
      }>
        <Route path="/history" element={<SessionHistoryPage />} />
      </Route>

      {/* Organizer */}
      <Route element={
        <RoleGuard roles={['organizer', 'admin']}>
          <OrganizerLayout />
        </RoleGuard>
      }>
        <Route path="/o" element={<Navigate to="/studio" replace />} />
        <Route path="/o/dashboard" element={<OrganizerDashboard />} />
        <Route path="/studio" element={<StudioDashboardPage />} />
        <Route path="/quiz/templates/:quizId" element={<QuizEditorPage />} />
        <Route path="/launch/quiz/:id" element={<QuizLaunchPage />} />
        <Route path="/quiz/templates/:id/launch" element={<QuizLaunchPage />} />
        <Route path="/invite/:id" element={<QuizLobbyPage />} />
        <Route path="/quiz/templates/:id/session" element={<QuizLobbyPage />} />
        <Route path="/live/:quizId" element={<LiveSessionPage />} />
        <Route path="/analytics" element={<AnalyticsDashboardPage />} />
        <Route path="/history/template_id/:id" element={<SessionHistoryDetailPage />} />
      </Route>

      {/* Profile — accessible to every authenticated role */}
      <Route path="/profile" element={
        <RoleGuard roles={['participant', 'organizer', 'admin']}>
          <UserProfilePage />
        </RoleGuard>
      } />
      <Route path="/profile/edit" element={
        <RoleGuard roles={['participant', 'organizer', 'admin']}>
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
