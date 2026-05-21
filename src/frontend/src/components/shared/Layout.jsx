/**
 * components/shared/Layout.jsx
 * Layout principal con sidebar de navegación, diferenciado por rol.
 * Diseño moderno, profesional y minimalista.
 */

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import { notificationApi } from '../../services/api';
import { Icons } from './Icons';

const doctorNav = [
  { path: '/dashboard',    label: 'Inicio',       Icon: Icons.Home },
  { path: '/patients',     label: 'Pacientes',    Icon: Icons.Users },
  { path: '/appointments', label: 'Citas',        Icon: Icons.Calendar },
  { path: '/reports',      label: 'Reportes',     Icon: Icons.BarChart },
];

const patientNav = [
  { path: '/dashboard',    label: 'Inicio',       Icon: Icons.Home },
  { path: '/appointments', label: 'Mis citas',    Icon: Icons.Calendar },
];

export default function Layout({ children, title }) {
  const { user, logout, isDoctor } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifCount, setNotifCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className={`transition-all duration-300 flex flex-col border-r border-slate-200 bg-white
        ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        
        {/* Logo */}
        <div className="px-6 py-5 border-b border-slate-200">
          {sidebarOpen ? (
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                MediCita
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {isDoctor ? 'Panel Médico' : 'Portal del Paciente'}
              </p>
            </div>
          ) : (
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent text-center">
              MC
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 space-y-1 px-3">
          {nav.map(({ path, label, Icon }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm
                  transition-all duration-200 group
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                title={sidebarOpen ? '' : label}
              >
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {sidebarOpen && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="border-t border-slate-200 p-4 space-y-3">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg
              text-slate-600 hover:bg-red-50 hover:text-red-700
              transition-colors duration-200 font-medium text-sm
              ${!sidebarOpen && 'justify-center'}`}
            title={sidebarOpen ? '' : 'Cerrar sesión'}
          >
            <Icons.LogOut className="w-5 h-5" />
            {sidebarOpen && 'Cerrar sesión'}
          </button>
          
          {sidebarOpen && (
            <div className="px-2 py-2 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 truncate">Conectado como</p>
              <p className="text-sm font-medium text-slate-800 truncate">{user?.username}</p>
            </div>
          )}
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <div className="flex items-center gap-6">
            {notifCount > 0 && (
              <Link
                to="/dashboard"
                className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors duration-200"
              >
                <Icons.Bell className="w-5 h-5 text-slate-600 hover:text-slate-900" />
                <span className="absolute top-1 right-1 bg-red-500 text-white text-xs
                                 rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {notifCount}
                </span>
              </Link>
            )}
            <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 
                              flex items-center justify-center text-white font-bold text-sm">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-slate-700 font-medium">{user?.username}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
