
import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import RoleGuard from '../guards/RoleGuard';

// Shared (all authenticated roles)
const UserProfilePage = lazy(() => import('../pages/public/profile/UserProfilePage'));

// Public
const PublicLandingPage = lazy(() => import('../pages/public/landingPage/PublicLandingPage'));
const JoinSessionPage = lazy(() => import('../pages/participant/quiz/QuizJoinRoom'));
const UnauthorizedPage = lazy(() => import('../pages/public/error/UnauthorizedPage'));
const AuthLoginPage = lazy(() => import('../pages/public/auth/AuthLoginPage'));
const AuthRegisterPage = lazy(() => import('../pages/public/auth/AuthRegisterPage'));

// Legal
const TermsPage = lazy(() => import('../pages/public/legal/TermsPage'));
const PrivacyPolicyPage = lazy(() => import('../pages/public/legal/PrivacyPolicyPage'));
const RefundPolicyPage = lazy(() => import('../pages/public/legal/RefundPolicyPage'));
const CookiePolicyPage = lazy(() => import('../pages/public/legal/CookiePolicyPage'));
const DisclaimerPage = lazy(() => import('../pages/public/legal/DisclaimerPage'));

// Participant
const ParticipantLayout = lazy(() => import('../layouts/ParticipantLayout'));
const ParticipantSessionPage = lazy(() => import('../pages/participant/ParticipantSessionPage'));
const ParticipantHistoryPage = lazy(() => import('../pages/participant/quiz/QuizSessionHistory'));

// Host
const HostLayout = lazy(() => import('../layouts/HostLayout'));
const Studio = lazy(() => import('../pages/host/studio/Studio'));
const LaunchQuiz = lazy(() => import('../pages/host/launchQuiz/LaunchQuiz'));
const QuizTemplateEditor = lazy(() => import('../pages/host/template/QuizTemplateEditor'));
const HostLivePage = lazy(() => import('../pages/host/quiz/LiveSessionPage'));
const HostAnalyticsPage = lazy(() => import('../pages/host/analytics/HostAnalyticsPage'));
const SessionHistoryPage = lazy(() => import('../pages/host/history/SessionHistoryPage'));
const TemplateQuizHistory = lazy(() => import('../pages/host/templateQuizHistory/TemplateQuizHistory'));
const InviteRoom = lazy(() => import('../pages/host/inviteRoom/InviteRoom'));
const SessionHistoryDetailPage = lazy(() => import('../pages/host/history/SessionHistoryDetailPage'));

// Admin
const AdminLayout = lazy(() => import('../layouts/AdminLayout'));
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const AdminUserManagement = lazy(() => import('../pages/admin/AdminUserManagement'));
const BillingOverviewPage = lazy(() => import('../pages/host/billing/BillingOverviewPage'));

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<PublicLandingPage />} />
      <Route path="/login" element={<AuthLoginPage />} />
      <Route path="/register" element={<AuthRegisterPage />} />
      <Route path="/join/:code" element={<JoinSessionPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Legal */}
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/refund" element={<RefundPolicyPage />} />
      <Route path="/cookies" element={<CookiePolicyPage />} />
      <Route path="/disclaimer" element={<DisclaimerPage />} />

      {/* Join Route */}
      <Route path="/join" element={<JoinSessionPage />} />

      {/* Participant */}
      <Route element={
        <RoleGuard roles={['participant']}>
          <ParticipantLayout />
        </RoleGuard>
      }>
        <Route path="/p/history" element={<ParticipantHistoryPage />} />
        <Route path="/quiz/:code" element={<ParticipantSessionPage />} />
      </Route>

      {/* Global Shared Routes */}
      <Route element={
        <RoleGuard roles={['host', 'admin', 'participant']}>
          <ParticipantLayout />
        </RoleGuard>
      }>
        <Route path="/history" element={<SessionHistoryPage />} />
      </Route>

      {/* Host */}
      <Route element={
        <RoleGuard roles={['host', 'admin']}>
          <HostLayout />
        </RoleGuard>
      }>
        <Route path="/o" element={<Navigate to="/studio" replace />} />
        <Route path="/o/dashboard" element={<Studio />} />
        <Route path="/studio" element={<Studio />} />
        <Route path="/quiz/templates/:quizId" element={<QuizTemplateEditor />} />
        <Route path="/launch/quiz/:id" element={<LaunchQuiz />} />
        <Route path="/quiz/templates/:id/launch" element={<LaunchQuiz />} />
        <Route path="/invite/:id" element={<InviteRoom />} />
        <Route path="/quiz/templates/:id/session" element={<InviteRoom />} />
        <Route path="/live/:id" element={<HostLivePage />} />
        <Route path="/analytics" element={<HostAnalyticsPage />} />
        <Route path="/quiz/templates/:id/sessions" element={<TemplateQuizHistory />} />
        <Route path="/history/template_id/:id" element={<SessionHistoryDetailPage />} />
        <Route path="/billing" element={<BillingOverviewPage />} />
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
