import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';

// Pages — shared
import Login      from './pages/Login';
import Dashboard  from './pages/Dashboard';
import Tasks      from './pages/Tasks';
import Videos     from './pages/Videos';
import Metrics    from './pages/Metrics';
import Accounts   from './pages/Accounts';
import ResultUploads       from './pages/ResultUploads';
import ResultUploadNew     from './pages/ResultUploadNew';
import ResultUploadDetail  from './pages/ResultUploadDetail';
import TestBundles         from './pages/TestBundles';
import TestBundleDetail    from './pages/TestBundleDetail';

// Pages — shared results workflow
import Results          from './pages/Results';
import ResultNew        from './pages/ResultNew';
import MyResults        from './pages/MyResults';

// Pages — admin only
import Tests            from './pages/Tests';
import Users            from './pages/Users';
import Offers           from './pages/Offers';
import Bundles          from './pages/Bundles';
import Ideas            from './pages/research/Ideas';
import Patterns         from './pages/research/Patterns';
import Hypotheses       from './pages/research/Hypotheses';
import Experiments      from './pages/research/Experiments';
import ResResults       from './pages/research/Results';
import Winners          from './pages/research/Winners';
import Workers          from './pages/team/Workers';
import WorkerProfile    from './pages/team/WorkerProfile';
import Proxies          from './pages/team/Proxies';
import MyProxies        from './pages/worker/MyProxies';
import AssignmentCenter from './pages/AssignmentCenter';
import WorkerAssignment from './pages/WorkerAssignment';

// ── Route guards ─────────────────────────────────────────────────────────────

/** Any authenticated user — redirect to /login if not logged in. */
function Protected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

/** Admin only — redirect workers to / instead of showing an error. */
function AdminOnly({ children }) {
  const { user } = useAuth();
  if (!user)                   return <Navigate to="/login" replace />;
  if (user.role !== 'admin')   return <Navigate to="/"      replace />;
  return <Layout>{children}</Layout>;
}

/** Public only — redirect logged-in users away from login page. */
function PublicOnly({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return children;
}

/** /proxies renders the admin Proxies page or worker MyProxies page by role. */
function ProxiesRoute() {
  const { user } = useAuth();
  return user?.role === 'admin' ? <Proxies /> : <MyProxies />;
}

/** /results renders admin Results or worker MyResults by role. */
function ResultsRoute() {
  const { user } = useAuth();
  return user?.role === 'admin' ? <Results /> : <MyResults />;
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />

            {/* Shared — auth required, role-filtered server-side */}
            <Route path="/"                  element={<Protected><Dashboard /></Protected>} />
            <Route path="/accounts"          element={<Protected><Accounts /></Protected>} />
            <Route path="/videos"            element={<Protected><Videos /></Protected>} />
            <Route path="/metrics"           element={<Protected><Metrics /></Protected>} />
            <Route path="/tasks"             element={<Protected><Tasks /></Protected>} />
            <Route path="/test-bundles"      element={<Protected><TestBundles /></Protected>} />
            <Route path="/test-bundles/:id"  element={<Protected><TestBundleDetail /></Protected>} />
            {/* New experiment results workflow */}
            <Route path="/results"            element={<Protected><ResultsRoute /></Protected>} />
            <Route path="/results/new"        element={<Protected><ResultNew /></Protected>} />
            {/* Legacy result uploads — kept for backward compat */}
            <Route path="/result-uploads"     element={<Protected><ResultUploads /></Protected>} />
            <Route path="/result-uploads/new" element={<Protected><ResultUploadNew /></Protected>} />
            <Route path="/result-uploads/:id" element={<Protected><ResultUploadDetail /></Protected>} />
            <Route path="/proxies"            element={<Protected><ProxiesRoute /></Protected>} />

            {/* Admin only */}
            <Route path="/tests"             element={<AdminOnly><Tests /></AdminOnly>} />
            <Route path="/users"             element={<AdminOnly><Users /></AdminOnly>} />
            <Route path="/offers"            element={<AdminOnly><Offers /></AdminOnly>} />
            <Route path="/bundles"           element={<AdminOnly><Bundles /></AdminOnly>} />
            <Route path="/workers"           element={<AdminOnly><Workers /></AdminOnly>} />
            <Route path="/workers/:id"       element={<AdminOnly><WorkerProfile /></AdminOnly>} />
            <Route path="/assignment-center"            element={<AdminOnly><AssignmentCenter /></AdminOnly>} />
            <Route path="/assignment-center/:workerId"  element={<AdminOnly><WorkerAssignment /></AdminOnly>} />

            {/* Research Engine — admin only, accessible via direct URL */}
            <Route path="/research/ideas"        element={<AdminOnly><Ideas /></AdminOnly>} />
            <Route path="/research/patterns"     element={<AdminOnly><Patterns /></AdminOnly>} />
            <Route path="/research/hypotheses"   element={<AdminOnly><Hypotheses /></AdminOnly>} />
            <Route path="/research/experiments"  element={<AdminOnly><Experiments /></AdminOnly>} />
            <Route path="/research/results"      element={<AdminOnly><ResResults /></AdminOnly>} />
            <Route path="/research/winners"      element={<AdminOnly><Winners /></AdminOnly>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
