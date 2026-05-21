/**
 * components/shared/Layout.jsx
 * Layout principal con sidebar de navegación, diferenciado por rol.
 */

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import { notificationApi } from '../../services/api';

const doctorNav = [
  { path: '/dashboard',    label: 'Inicio',       icon: '🏠' },
  { path: '/patients',     label: 'Pacientes',    icon: '👤' },
  { path: '/appointments', label: 'Citas',        icon: '📅' },
  { path: '/reports',      label: 'Reportes',     icon: '📊' },
];

const patientNav = [
  { path: '/dashboard',    label: 'Inicio',       icon: '🏠' },
  { path: '/appointments', label: 'Mis citas',    icon: '📅' },
];

export default function Layout({ children, title }) {
  const { user, logout, isDoctor } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifCount, setNotifCount] = useState(0);

  const nav = isDoctor ? doctorNav : patientNav;

  useEffect(() => {
    notificationApi.getUnread()
      .then(({ data }) => setNotifCount(data.data.length))
      .catch(() => {});
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-800 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-700">
          <span className="text-white font-bold text-lg">MediCita</span>
          <p className="text-slate-400 text-xs mt-0.5 capitalize">
            {isDoctor ? '👨‍⚕️ Médico' : '🧑 Paciente'}
          </p>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {nav.map(({ path, label, icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                ${location.pathname === path
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
            >
              <span>{icon}</span> {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <p className="text-slate-400 text-xs truncate mb-2">{user?.username}</p>
          <button
            onClick={handleLogout}
            className="w-full text-left text-slate-400 hover:text-white text-xs transition-colors"
          >
            Cerrar sesión →
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
          <div className="flex items-center gap-4">
            {notifCount > 0 && (
              <Link
                to="/dashboard"
                className="relative text-slate-500 hover:text-slate-800 text-sm"
              >
                🔔
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs
                                 rounded-full w-4 h-4 flex items-center justify-center">
                  {notifCount}
                </span>
              </Link>
            )}
            <span className="text-sm text-slate-500">{user?.username}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
