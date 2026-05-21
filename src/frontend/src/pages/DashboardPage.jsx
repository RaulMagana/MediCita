/**
 * pages/DashboardPage.jsx
 * Panel principal: muestra notificaciones pendientes y accesos rápidos.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { useAuth } from '../context/AuthContext';
import { notificationApi } from '../services/api';

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

  return (
    <Layout title="Panel principal">
      <div className="max-w-3xl space-y-6">
        {/* Saludo */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-xl p-6 text-white">
          <h2 className="text-xl font-semibold">
            Bienvenido, {user?.username} 👋
          </h2>
          <p className="text-teal-100 text-sm mt-1">
            {isDoctor ? 'Panel de administración del consultorio' : 'Tu portal de salud personal'}
          </p>
        </div>

        {/* Notificaciones */}
        {!loading && notifications.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-amber-800 text-sm">
                🔔 Tienes {notifications.length} notificación(es)
              </h3>
              <button
                onClick={dismissAll}
                className="text-amber-600 hover:text-amber-800 text-xs"
              >
                Marcar todas como leídas
              </button>
            </div>
            <ul className="space-y-2">
              {notifications.map((n) => (
                <li key={n.id} className="text-sm text-amber-700 bg-amber-100 rounded-lg px-3 py-2">
                  {n.message}
                  <span className="block text-xs text-amber-500 mt-0.5">
                    {new Date(n.created_at).toLocaleString('es-MX')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Accesos rápidos */}
        <div>
          <h3 className="text-sm font-medium text-slate-500 mb-3">Accesos rápidos</h3>
          <div className="grid grid-cols-2 gap-4">
            <Link
              to="/appointments"
              className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <span className="text-2xl block mb-2">📅</span>
              <p className="font-medium text-slate-800 text-sm">
                {isDoctor ? 'Gestionar citas' : 'Mis citas'}
              </p>
            </Link>

            {isDoctor ? (
              <>
                <Link to="/patients" className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                  <span className="text-2xl block mb-2">👤</span>
                  <p className="font-medium text-slate-800 text-sm">Lista de pacientes</p>
                </Link>
                <Link to="/reports" className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                  <span className="text-2xl block mb-2">📊</span>
                  <p className="font-medium text-slate-800 text-sm">Reportes</p>
                </Link>
              </>
            ) : (
              <Link
                to={`/history/me`}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <span className="text-2xl block mb-2">📋</span>
                <p className="font-medium text-slate-800 text-sm">Mi historial clínico</p>
              </Link>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
