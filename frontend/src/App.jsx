import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Accounts from './pages/Accounts';
import Offers from './pages/Offers';
import Bundles from './pages/Bundles';
import Videos from './pages/Videos';
import Metrics from './pages/Metrics';
import Tasks from './pages/Tasks';
import Ideas        from './pages/research/Ideas';
import Patterns     from './pages/research/Patterns';
import Hypotheses   from './pages/research/Hypotheses';
import Experiments  from './pages/research/Experiments';
import ResResults   from './pages/research/Results';
import Winners      from './pages/research/Winners';
import Workers          from './pages/team/Workers';
import WorkerProfile    from './pages/team/WorkerProfile';
import Proxies          from './pages/team/Proxies';
import MyProxies        from './pages/worker/MyProxies';

function ProxiesRoute() {
  const { user } = useAuth();
  return user?.role === 'admin' ? <Proxies /> : <MyProxies />;
}
import AssignmentCenter    from './pages/AssignmentCenter';
import WorkerAssignment    from './pages/WorkerAssignment';
import ResultUploads       from './pages/ResultUploads';
import ResultUploadNew     from './pages/ResultUploadNew';
import ResultUploadDetail  from './pages/ResultUploadDetail';

function Protected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function PublicOnly({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/" element={<Protected><Dashboard /></Protected>} />
          <Route path="/users" element={<Protected><Users /></Protected>} />
          <Route path="/accounts" element={<Protected><Accounts /></Protected>} />
          <Route path="/offers" element={<Protected><Offers /></Protected>} />
          <Route path="/bundles" element={<Protected><Bundles /></Protected>} />
          <Route path="/videos" element={<Protected><Videos /></Protected>} />
          <Route path="/metrics" element={<Protected><Metrics /></Protected>} />
          <Route path="/tasks" element={<Protected><Tasks /></Protected>} />
          {/* Research Engine */}
          <Route path="/research/ideas"       element={<Protected><Ideas /></Protected>} />
          <Route path="/research/patterns"    element={<Protected><Patterns /></Protected>} />
          <Route path="/research/hypotheses"  element={<Protected><Hypotheses /></Protected>} />
          <Route path="/research/experiments" element={<Protected><Experiments /></Protected>} />
          <Route path="/research/results"     element={<Protected><ResResults /></Protected>} />
          <Route path="/research/winners"     element={<Protected><Winners /></Protected>} />
          {/* Team */}
          <Route path="/workers"                          element={<Protected><Workers /></Protected>} />
          <Route path="/workers/:id"                      element={<Protected><WorkerProfile /></Protected>} />
          <Route path="/proxies"                          element={<Protected><ProxiesRoute /></Protected>} />
          <Route path="/assignment-center"                element={<Protected><AssignmentCenter /></Protected>} />
          <Route path="/assignment-center/:workerId"      element={<Protected><WorkerAssignment /></Protected>} />
          {/* Result Upload Center */}
          <Route path="/result-uploads"                   element={<Protected><ResultUploads /></Protected>} />
          <Route path="/result-uploads/new"               element={<Protected><ResultUploadNew /></Protected>} />
          <Route path="/result-uploads/:id"               element={<Protected><ResultUploadDetail /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
