/**
 * pages/DashboardPage.jsx
 * Panel principal con diseño moderno y efectos visuales.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { useAuth } from '../context/AuthContext';
import { notificationApi } from '../services/api';
import { Icons } from '../components/shared/Icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function DashboardPage() {
  const { user, isDoctor } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    notificationApi.getUnread()
      .then(({ data }) => setNotifications(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const dismissAll = async () => {
    await notificationApi.markRead();
    setNotifications([]);
  };

  const quickAccessItems = [
    {
      label: isDoctor ? 'Gestionar citas' : 'Mis citas',
      href: '/appointments',
      Icon: Icons.Calendar,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    ...(!isDoctor ? [{
      label: 'Mi historial clínico',
      href: '/history/me',
      Icon: Icons.FileText,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
    }] : []),
    ...(isDoctor ? [
      {
        label: 'Gestionar Relatorías',
        href: '/appointments',
        Icon: Icons.FileText,
        color: 'from-red-500 to-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
      },
      {
        label: 'Lista de pacientes',
        href: '/patients',
        Icon: Icons.Users,
        color: 'from-purple-500 to-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
      },
      {
        label: 'Reportes',
        href: '/reports',
        Icon: Icons.BarChart,
        color: 'from-amber-500 to-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
      },
    ] : []),
  ];

  return (
    <Layout title="Panel principal">
      <div className="space-y-6 max-w-6xl">
        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 shadow-lg">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-3xl" />
          </div>
          <div className="relative px-8 py-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  Bienvenido, {user?.username}
                </h2>
                <p className="text-blue-100 text-lg">
                  {isDoctor 
                    ? 'Panel de administración del consultorio' 
                    : 'Tu portal de salud personal'}
                </p>
                {!isDoctor && (
                  <p className="text-blue-100 text-sm mt-2">
                    {format(new Date(), 'EEEE, d MMMM yyyy', { locale: es })}
                  </p>
                )}
              </div>
              <div className="hidden md:block text-8xl opacity-10">
                {isDoctor ? '👨‍⚕️' : '🏥'}
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {!loading && notifications.length > 0 && (
          <div className="fade-in card border-l-4 border-l-blue-500 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Icons.Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Notificaciones</h3>
                  <p className="text-sm text-slate-500">{notifications.length} notificación(es) sin leer</p>
                </div>
              </div>
              <button
                onClick={dismissAll}
                className="btn-ghost text-xs"
              >
                Marcar todas como leídas
              </button>
            </div>
            <div className="space-y-2 mt-4">
              {notifications.slice(0, 5).map((n) => (
                <div key={n.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors">
                  <p className="text-sm text-slate-700">{n.message}</p>
                  <span className="text-xs text-slate-500 mt-2 block">
                    {format(new Date(n.created_at), 'PPpp', { locale: es })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Access Grid */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Accesos rápidos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickAccessItems.map((item, idx) => (
              <Link
                key={idx}
                to={item.href}
                className={`card p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 border-l-4 group slide-in-right`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br ${item.color} text-white mb-4 group-hover:scale-110 transition-transform`}>
                  <item.Icon className="w-6 h-6" />
                </div>
                <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {item.label}
                </p>
                <p className="text-sm text-slate-500 mt-1">Acceder →</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Stats o Información adicional */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-6 border-t-2 border-t-emerald-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Icons.Check className="w-6 h-6 text-emerald-600" />
              </div>
              <h4 className="font-semibold text-slate-900">Estado</h4>
            </div>
            <p className="text-2xl font-bold text-slate-900">Todo en orden</p>
            <p className="text-sm text-slate-500 mt-1">Tu cuenta está funcionando correctamente</p>
          </div>

          <div className="card p-6 border-t-2 border-t-blue-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Icons.Settings className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-slate-900">Ayuda</h4>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              ¿Necesitas ayuda? Contáctanos en support@medicita.com
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
