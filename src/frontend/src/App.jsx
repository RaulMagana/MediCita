/**
 * App.jsx
 * Árbol de rutas principal de la aplicación.
 * Usa React Router v6 con rutas protegidas por rol.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Páginas
import LoginPage          from './pages/LoginPage';
import RegisterPage       from './pages/RegisterPage';
import DashboardPage      from './pages/DashboardPage';
import AppointmentsPage   from './pages/AppointmentsPage';
import PatientsPage       from './pages/PatientsPage';
import ClinicalRecordPage from './pages/ClinicalRecordPage';
import HistoryPage        from './pages/HistoryPage';
import ReportsPage        from './pages/ReportsPage';
import NotFoundPage       from './pages/NotFoundPage';

// Guard de rutas protegidas
function PrivateRoute({ children, role }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && user?.role !== role) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Rutas protegidas — cualquier usuario autenticado */}
          <Route path="/dashboard"    element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/appointments" element={<PrivateRoute><AppointmentsPage /></PrivateRoute>} />
          <Route path="/history/:patientId" element={<PrivateRoute><HistoryPage /></PrivateRoute>} />

          {/* Solo médico */}
          <Route path="/patients" element={
            <PrivateRoute role="doctor"><PatientsPage /></PrivateRoute>
          } />
          <Route path="/records/:slotId" element={
            <PrivateRoute role="doctor"><ClinicalRecordPage /></PrivateRoute>
          } />
          <Route path="/reports" element={
            <PrivateRoute role="doctor"><ReportsPage /></PrivateRoute>
          } />

          {/* Redireccionamientos */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
