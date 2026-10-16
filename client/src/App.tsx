import { Navigate, Route, Routes, Link } from 'react-router-dom';
import { Protected } from './components/Protected';
import { ToastProvider } from './components/Toast';
import { Analyze } from './pages/Analyze';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { LeadDetail } from './pages/LeadDetail';
import { LeadNew } from './pages/LeadNew';
import { LeadsList } from './pages/LeadsList';

function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-gray-50 dark:bg-gray-950">
      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Page not found
      </p>
      <Link
        to="/dashboard"
        className="text-sm text-blue-600 underline dark:text-blue-400"
      >
        Go to dashboard
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route element={<Protected />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leads" element={<LeadsList />} />
          <Route path="/leads/new" element={<LeadNew />} />
          <Route path="/ai/analyze" element={<Analyze />} />
          <Route path="/leads/:id" element={<LeadDetail />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ToastProvider>
  );
}
