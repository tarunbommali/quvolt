import { lazy, Suspense, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import ErrorBoundary from './components/common/ErrorBoundary';
import Navbar from './components/Navbar';
import { Zap, Shield, BarChart3, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';
import { useUIStore } from './stores/useUIStore';
import { useQuizStore } from './stores/useQuizStore';
import { useSocketStore } from './stores/useSocketStore';
import { components } from './styles/components';

const AuthLoginPage = lazy(() => import('./pages/auth/AuthLoginPage'));
const AuthRegisterPage = lazy(() => import('./pages/auth/AuthRegisterPage'));
const StudioDashboardPage = lazy(() => import('./pages/studio/StudioDashboardPage'));
const QuizEditorPage = lazy(() => import('./pages/studio/QuizEditorPage'));
const QuizLaunchPage = lazy(() => import('./pages/studio/QuizLaunchPage'));
const LiveSessionPage = lazy(() => import('./pages/studio/LiveSessionPage'));
const QuizLobbyPage = lazy(() => import('./pages/studio/QuizLobbyPage'));
const JoinSessionPage = lazy(() => import('./pages/quiz/JoinSessionPage'));
const QuizSessionPage = lazy(() => import('./pages/quiz/QuizSessionPage'));
const SessionHistoryPage = lazy(() => import('./pages/history/SessionHistoryPage'));
const SessionHistoryDetailPage = lazy(() => import('./pages/history/SessionHistoryDetailPage'));
const QuizResultsPage = lazy(() => import('./pages/quiz/QuizResultsPage'));
const UserProfilePage = lazy(() => import('./pages/profile/UserProfilePage'));
const BillingOverviewPage = lazy(() => import('./pages/billing/BillingOverviewPage'));
const AnalyticsDashboardPage = lazy(() => import('./pages/analytics/AnalyticsDashboardPage'));
const PublicLandingPage = lazy(() => import('./pages/public/PublicLandingPage'));
const NotFound = lazy(() => import('./components/errors/NotFound'));
import LoadingScreen from './components/common/LoadingScreen';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AuthRoute from './components/auth/AuthRoute';
import RouteGuard from './components/RouteGuard';




const AppBootstrap = () => {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const initializeTheme = useUIStore((state) => state.initializeTheme);
  const loading = useAuthStore((state) => state.loading);
  const token = useAuthStore((state) => state.token);
  const userId = useAuthStore((state) => state.user?._id || null);
  const connectSocket = useSocketStore((state) => state.connectSocket);
  const disconnectSocket = useSocketStore((state) => state.disconnectSocket);
  const clearUserData = useQuizStore((state) => state.clearUserData);
  const previousUserIdRef = useRef(userId);

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (loading || !token) {
      disconnectSocket();
      return;
    }

    connectSocket();
    return () => {
      disconnectSocket();
    };
  }, [loading, token, connectSocket, disconnectSocket]);

  useEffect(() => {
    if (previousUserIdRef.current !== userId) {
      clearUserData();
      previousUserIdRef.current = userId;
    }
  }, [userId, clearUserData]);

  return null;
};

const LegacyInviteRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/invite/${id}`} replace />;
};

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppBootstrap />
        <div className={components.appShell}>
          <Navbar />
          <main className={components.appMain}>
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                <Route path="/" element={<PublicLandingPage />} />
                <Route path="/login" element={<AuthRoute><AuthLoginPage /></AuthRoute>} />
                <Route path="/register" element={<AuthRoute><AuthRegisterPage /></AuthRoute>} />
                <Route path="/join" element={<ProtectedRoute><JoinSessionPage /></ProtectedRoute>} />
                <Route path="/quiz/:roomCode" element={<ProtectedRoute><QuizSessionPage /></ProtectedRoute>} />
                <Route path="/studio" element={<ProtectedRoute role="organizer"><StudioDashboardPage /></ProtectedRoute>} />
                <Route path="/studio/:folderId" element={<ProtectedRoute role="organizer"><StudioDashboardPage /></ProtectedRoute>} />
                <Route path="/edit/:id" element={<ProtectedRoute role="organizer"><QuizEditorPage /></ProtectedRoute>} />
                <Route path="/results/:quizId" element={<ProtectedRoute role="organizer"><QuizResultsPage /></ProtectedRoute>} />
                <Route path="/launch/:id" element={<ProtectedRoute role="organizer"><RouteGuard><QuizLaunchPage /></RouteGuard></ProtectedRoute>} />
                <Route path="/invite/:id" element={<ProtectedRoute role="organizer"><RouteGuard><QuizLobbyPage /></RouteGuard></ProtectedRoute>} />
                <Route path="/live/:id" element={<ProtectedRoute role="organizer"><RouteGuard><LiveSessionPage /></RouteGuard></ProtectedRoute>} />
                <Route path="/inviteroom/:id" element={<LegacyInviteRedirect />} />
                <Route path="/history" element={<ProtectedRoute><SessionHistoryPage /></ProtectedRoute>} />
                <Route path="/histroy/template_id/:quizid" element={<ProtectedRoute><SessionHistoryDetailPage /></ProtectedRoute>} />
                <Route path="/history/template_id/:quizid" element={<ProtectedRoute><SessionHistoryDetailPage /></ProtectedRoute>} />
                <Route path="/history/:id" element={<ProtectedRoute><SessionHistoryDetailPage /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><UserProfilePage initialMode="view" /></ProtectedRoute>} />
                <Route path="/profile/edit" element={<ProtectedRoute><UserProfilePage initialMode="edit" /></ProtectedRoute>} />
                <Route path="/billing" element={<ProtectedRoute role="organizer"><BillingOverviewPage /></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute><AnalyticsDashboardPage /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
