/* eslint-disable no-undef */

import { Suspense } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import ErrorBoundary from './components/common/ErrorBoundary';
import Navbar from './components/common/Navbar';
import { useAppInit } from './hooks/useAppInit';
import { components } from './styles/components';
import GlobalCommandPalette from './components/common/GlobalCommandPalette';
import LoadingScreen from './components/common/LoadingScreen';
import AppRoutes from './routes/AppRoutes';
import ScrollToTop from './components/common/ui/ScrollToTop';






function App() {
  useAppInit();
  return (
    <ErrorBoundary>
      <Router>
        <div className={components.appShell}>
          <GlobalCommandPalette />
          <Navbar />
          <main className={components.appMain}>
            <Suspense fallback={<LoadingScreen />}>
              <AppRoutes />
            </Suspense>
          </main>
          <ScrollToTop />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;

