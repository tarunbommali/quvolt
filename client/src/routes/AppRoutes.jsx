import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import RoleGuard from '../guards/RoleGuard';
import { useAuthStore } from '../stores/useAuthStore';
import { ROLE_ROUTES } from './roleConfig';

// Internal component to redirect authenticated users away from public pages like Landing
const AuthenticatedRedirect = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated && user?.role) {
    return <Navigate to={ROLE_ROUTES[user.role] || '/'} replace />;
  }
  return children;
};

// Shared (all authenticated roles)
const UserProfilePage = lazy(() => import('../features/profile/pages/UserProfilePage'));

// Public
const PublicLandingPage = lazy(() => import('../pages/public/landingPage/PublicLandingPage'));
const JoinSessionPage = lazy(() => import('../features/quiz/pages/QuizJoinRoom'));
const UnauthorizedPage = lazy(() => import('../pages/public/error/UnauthorizedPage'));
const AuthLoginPage = lazy(() => import('../features/auth/pages/AuthLoginPage'));
const AuthRegisterPage = lazy(() => import('../features/auth/pages/AuthRegisterPage'));
const UpgradePlansPage = lazy(() => import('../pages/public/UpgradePlansPage'));
const CheckoutPage = lazy(() => import('../pages/public/CheckoutPage'));

// Legal
const TermsPage = lazy(() => import('../pages/public/legal/TermsPage'));
const PrivacyPolicyPage = lazy(() => import('../pages/public/legal/PrivacyPolicyPage'));
const RefundPolicyPage = lazy(() => import('../pages/public/legal/RefundPolicyPage'));
const CookiePolicyPage = lazy(() => import('../pages/public/legal/CookiePolicyPage'));
const DisclaimerPage = lazy(() => import('../pages/public/legal/DisclaimerPage'));

// Participant
const ParticipantLayout = lazy(() => import('../layouts/ParticipantLayout'));
const ParticipantSessionPage = lazy(() => import('../features/participant/pages/ParticipantSessionPage'));
const ParticipantHistoryPage = lazy(() => import('../features/quiz/pages/QuizSessionHistory'));

// Host
const HostLayout = lazy(() => import('../layouts/HostLayout'));
const Studio = lazy(() => import('../features/host/pages/Studio'));
const LaunchQuiz = lazy(() => import('../features/quiz/pages/LaunchQuiz'));
const QuizTemplateEditor = lazy(() => import('../features/quiz/pages/QuizTemplateEditor'));
const HostLivePage = lazy(() => import('../features/quiz/pages/LiveSessionPage'));
const HostAnalyticsPage = lazy(() => import('../features/host/pages/HostAnalyticsPage'));
const SessionHistoryPage = lazy(() => import('../features/host/pages/SessionHistoryPage'));
const TemplateQuizHistory = lazy(() => import('../features/host/pages/TemplateQuizHistory'));
const InviteRoom = lazy(() => import('../features/host/pages/InviteRoom'));
const SessionHistoryDetailPage = lazy(() => import('../features/host/pages/SessionHistoryDetailPage'));
const TemplateConfigPage = lazy(() => import('../features/quiz/pages/TemplateConfigPage'));

// Admin
const AdminLayout = lazy(() => import('../layouts/AdminLayout'));
const AdminDashboard = lazy(() => import('../features/admin/pages/AdminDashboard'));
const AdminUserManagement = lazy(() => import('../features/admin/pages/AdminUserManagement'));
const BillingControlPage = lazy(() => import('../features/admin/pages/BillingControlPage'));
const BillingOverviewPage = lazy(() => import('../features/billing/pages/BillingOverviewPage'));
const SubscriptionSuccessPage = lazy(() => import('../features/billing/pages/SubscriptionSuccessPage'));

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={
        <AuthenticatedRedirect>
          <PublicLandingPage />
        </AuthenticatedRedirect>
      } />
      <Route path="/login" element={
        <AuthenticatedRedirect>
          <AuthLoginPage />
        </AuthenticatedRedirect>
      } />
      <Route path="/register" element={
        <AuthenticatedRedirect>
          <AuthRegisterPage />
        </AuthenticatedRedirect>
      } />
      <Route path="/join/:code" element={<JoinSessionPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/upgrade" element={<UpgradePlansPage />} />
      <Route path="/upgrade/:plan" element={<CheckoutPage />} />

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
        <Route path="/quiz/sessions/:id" element={<SessionHistoryDetailPage />} />
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
        <Route path="/subscription-success" element={<SubscriptionSuccessPage />} />
        {/* Template Config routes */}
        <Route path="/studio/settings" element={<TemplateConfigPage />} />
        <Route path="/quiz/templates/:id/settings" element={<TemplateConfigPage />} />
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
        <Route path="/billing" element={<BillingControlPage />} />
      </Route>
    </Routes>
  );
}
