import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { MainLayout } from './components/layout/MainLayout';

// Pages
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UserDashboard } from './pages/user/UserDashboard';
import { SurveyCatalog } from './pages/survey/SurveyCatalog';
import { SurveyFormPage } from './pages/survey/SurveyFormPage';
import { SurveyDataList } from './pages/survey/SurveyDataList';
import { SurveyDetail } from './pages/survey/SurveyDetail';
import { UserManagement } from './pages/admin/UserManagement';
import { ReportsPage } from './pages/reports/ReportsPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { SettingsPage } from './pages/settings/SettingsPage';

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode; requireAdmin?: boolean }> = ({
  children,
  requireAdmin = false,
}) => {
  const { currentUser, isAdmin } = useAuth();

  if (!currentUser) {
    const search = window.location.search;
    const hash = window.location.hash;
    return <Navigate to={`/login${search}${hash}`} replace />;
  }

  // Hanya akun berstatus 'active' yang diizinkan mengakses sistem
  if (currentUser.status !== 'active') {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Smart Dashboard Route: renders Admin or User dashboard depending on current role
const DashboardDispatcher: React.FC = () => {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminDashboard /> : <UserDashboard />;
};

import { GoogleOAuthProvider } from '@react-oauth/google';

export const App: React.FC = () => {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || '473712698344-9v9fvq6bgjir5de48pnpjc8qfeqg8c75.apps.googleusercontent.com'}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Login Route */}
              <Route path="/login" element={<Login />} />

              {/* Authenticated Protected Routes inside MainLayout */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardDispatcher />} />

                {/* Data Survey */}
                <Route path="data-survey" element={<SurveyDataList />} />

                {/* Form Survey Catalog & Individual Category Form Pages */}
                <Route path="form-survey" element={<SurveyCatalog />} />
                <Route path="survey/form/diskominfo" element={<SurveyFormPage />} />
                <Route path="survey/form/bappeda" element={<SurveyFormPage />} />
                <Route path="survey/form/bpksdm" element={<SurveyFormPage />} />
                <Route path="survey/form/organisasi" element={<SurveyFormPage />} />
                <Route path="survey/form/dinas" element={<SurveyFormPage />} />
                <Route path="survey/form/:categorySlug" element={<SurveyFormPage />} />

                {/* Survey Detail */}
                <Route path="survey/detail/:id" element={<SurveyDetail />} />

                {/* Admin Exclusives */}
                <Route
                  path="users"
                  element={
                    <ProtectedRoute requireAdmin>
                      <UserManagement />
                    </ProtectedRoute>
                  }
                />
                <Route path="opd" element={<Navigate to="/dashboard" replace />} />

                {/* Laporan & Settings & Profile */}
                <Route path="laporan" element={<ReportsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
