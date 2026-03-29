import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Toaster } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';

const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Analysis = lazy(() => import('@/pages/Analysis'));
const Suppliers = lazy(() => import('@/pages/Suppliers'));
const Calculator = lazy(() => import('@/pages/Calculator'));
const Settings = lazy(() => import('@/pages/Settings'));
const Deals = lazy(() => import('@/pages/Deals'));
const Chat = lazy(() => import('@/pages/Chat'));
const Alerts = lazy(() => import('@/pages/Alerts'));
const NotFound = lazy(() => import('@/pages/NotFound'));

function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
      <Spinner size="lg" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route path="/login" element={<ErrorBoundary><Login /></ErrorBoundary>} />
        <Route path="/register" element={<ErrorBoundary><Register /></ErrorBoundary>} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ErrorBoundary><Deals /></ErrorBoundary>} />
          <Route path="dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
          <Route path="analise" element={<ErrorBoundary><Analysis /></ErrorBoundary>} />
          <Route path="fornecedores" element={<ErrorBoundary><Suppliers /></ErrorBoundary>} />
          <Route path="calculadora" element={<ErrorBoundary><Calculator /></ErrorBoundary>} />
          <Route path="configuracoes" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
          <Route path="assistente" element={<ErrorBoundary><Chat /></ErrorBoundary>} />
          <Route path="alertas" element={<ErrorBoundary><Alerts /></ErrorBoundary>} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster position="top-right" />
    </AuthProvider>
  );
}
