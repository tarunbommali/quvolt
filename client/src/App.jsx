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

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const StudioDashboard = lazy(() => import('./pages/StudioDashboard'));
const OrganizerEdit = lazy(() => import('./pages/OrganizerEdit'));
const OrganizerLaunch = lazy(() => import('./pages/OrganizerLaunch'));
const OrganizerLive = lazy(() => import('./pages/OrganizerLive'));
const OrganizerInviteRoom = lazy(() => import('./pages/OrganizerInviteRoom'));
const JoinRoom = lazy(() => import('./pages/JoinRoom'));
const QuizRoom = lazy(() => import('./pages/QuizRoom'));
const History = lazy(() => import('./pages/History'));
const HistoryDetail = lazy(() => import('./pages/HistoryDetail'));
const QuizResults = lazy(() => import('./pages/QuizResults'));
const Profile = lazy(() => import('./pages/Profile'));
const Billing = lazy(() => import('./pages/Billing'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Home = lazy(() => import('./pages/Home'));
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
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
                <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />
                <Route path="/join" element={<ProtectedRoute><JoinRoom /></ProtectedRoute>} />
                <Route path="/quiz/:roomCode" element={<ProtectedRoute><QuizRoom /></ProtectedRoute>} />
                <Route path="/studio" element={<ProtectedRoute role="organizer"><StudioDashboard /></ProtectedRoute>} />
                <Route path="/studio/:folderId" element={<ProtectedRoute role="organizer"><StudioDashboard /></ProtectedRoute>} />
                <Route path="/edit/:id" element={<ProtectedRoute role="organizer"><OrganizerEdit /></ProtectedRoute>} />
                <Route path="/results/:quizId" element={<ProtectedRoute role="organizer"><QuizResults /></ProtectedRoute>} />
                <Route path="/launch/:id" element={<ProtectedRoute role="organizer"><RouteGuard><OrganizerLaunch /></RouteGuard></ProtectedRoute>} />
                <Route path="/invite/:id" element={<ProtectedRoute role="organizer"><RouteGuard><OrganizerInviteRoom /></RouteGuard></ProtectedRoute>} />
                <Route path="/live/:id" element={<ProtectedRoute role="organizer"><RouteGuard><OrganizerLive /></RouteGuard></ProtectedRoute>} />
                <Route path="/inviteroom/:id" element={<LegacyInviteRedirect />} />
                <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
                <Route path="/histroy/template_id/:quizid" element={<ProtectedRoute><HistoryDetail /></ProtectedRoute>} />
                <Route path="/history/template_id/:quizid" element={<ProtectedRoute><HistoryDetail /></ProtectedRoute>} />
                <Route path="/history/:id" element={<ProtectedRoute><HistoryDetail /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile initialMode="view" /></ProtectedRoute>} />
                <Route path="/profile/edit" element={<ProtectedRoute><Profile initialMode="edit" /></ProtectedRoute>} />
                <Route path="/billing" element={<ProtectedRoute role="organizer"><Billing /></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
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
