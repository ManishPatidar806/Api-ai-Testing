import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import AppLayout from '../layouts/AppLayout';
import AuthLayout from '../layouts/AuthLayout';
import RouteErrorBoundary from '../components/common/RouteErrorBoundary';
import LoadingState from '../components/common/LoadingState';

const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const ApiWorkspacePage = lazy(() => import('../pages/app/ApiWorkspacePage'));

function AppRouter() {
  return (
    <Suspense fallback={<LoadingState text="Loading page..." />}>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
        </Route>

        <Route
          element={
            <PrivateRoute>
              <RouteErrorBoundary>
                <AppLayout />
              </RouteErrorBoundary>
            </PrivateRoute>
          }
        >
          <Route path="/" element={<Navigate to="/workspace" replace state={{ workspaceSection: 'dashboard' }} />} />
          <Route path="/workspace" element={<ApiWorkspacePage />} />
          <Route path="/test-cases" element={<Navigate to="/workspace" replace state={{ workspaceSection: 'testcases' }} />} />
          <Route path="/ai-error-analyzer" element={<Navigate to="/workspace" replace state={{ workspaceSection: 'analyzer' }} />} />
          <Route path="/ai-chat" element={<Navigate to="/workspace" replace state={{ workspaceSection: 'chat' }} />} />
          <Route path="/security-testing" element={<Navigate to="/workspace" replace state={{ workspaceSection: 'security' }} />} />
          <Route path="/performance" element={<Navigate to="/workspace" replace state={{ workspaceSection: 'dashboard' }} />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default AppRouter;
