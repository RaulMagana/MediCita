/**
 * pages/ReportsPage.jsx
 * Generación de reportes con autenticación (solo médico).
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { reportApi } from '../services/api';
import { Icons } from '../components/shared/Icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function ReportSection({ title, icon: Icon, children }) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function ReportsPage() {
  const [patients, setPatients]   = useState(null);
  const [calendar, setCalendar]   = useState(null);
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [loadingP, setLoadingP]   = useState(false);
  const [loadingC, setLoadingC]   = useState(false);

  const loadPatients = async () => {
    setLoadingP(true);
    try {
      const { data } = await reportApi.patients();
      setPatients(data.data);
    } catch { /* error silencioso */ }
    finally { setLoadingP(false); }
  };

  const loadCalendar = async () => {
    setLoadingC(true);
    try {
      const { data } = await reportApi.calendar({ from: dateFrom || undefined, to: dateTo || undefined });
      setCalendar(data.data);
    } catch { /* error silencioso */ }
    finally { setLoadingC(false); }
  };

  const fmtDate = (d) => {
    try { return format(new Date(d), "d 'de' MMMM yyyy", { locale: es }); }
    catch { return d; }
  };

  const statusLabel = { available: 'Disponible', booked: 'Reservada', cancelled: 'Cancelada' };
  const statusConfig = {
    available: { bg: 'bg-emerald-100', text: 'text-emerald-700', badge: 'badge-success' },
    booked:    { bg: 'bg-blue-100', text: 'text-blue-700', badge: 'badge-info' },
    cancelled: { bg: 'bg-slate-100', text: 'text-slate-500', badge: 'badge-warning' },
  };

  return (
    <Layout title="Reportes y Análisis">
      <div className="max-w-6xl space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 rounded-2xl p-8 text-white shadow-lg">
          <h2 className="text-3xl font-bold mb-2">Centro de Reportes</h2>
          <p className="text-blue-100">Genera y analiza reportes de pacientes y citas</p>
        </div>

        {/* ── Reporte A: Lista de pacientes ── */}
        <ReportSection title="Listado de Pacientes" icon={Icons.Users}>
          <button
            onClick={loadPatients}
            disabled={loadingP}
            className="btn-primary mb-6 inline-flex items-center gap-2"
          >
            {loadingP ? (
              <>
                <Icons.Spinner className="w-5 h-5 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Icons.Download className="w-5 h-5" />
                Generar reporte
              </>
            )}
          </button>

          {patients !== null && (
            patients.length === 0 ? (
              <div className="py-8 text-center">
                <Icons.Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No hay pacientes registrados</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700 text-sm">Nombre</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700 text-sm">Correo</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700 text-sm">Teléfono</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700 text-sm">Sexo</th>
                      <th className="px-6 py-3 text-center font-semibold text-slate-700 text-sm">Citas</th>
                      <th className="px-6 py-3 text-center font-semibold text-slate-700 text-sm">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {patients.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-medium text-slate-900">{p.full_name}</td>
                        <td className="px-6 py-3 text-slate-600 text-sm">{p.email}</td>
                        <td className="px-6 py-3 text-slate-600 text-sm">{p.phone || '—'}</td>
                        <td className="px-6 py-3 text-sm">
                          <span className="badge badge-info">
                            {{ M: 'Masculino', F: 'Femenino', O: 'Otro' }[p.sex]}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className="badge badge-success">
                            {p.total_appointments}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <Link
                            to={`/history/${p.id}`}
                            className="btn-ghost text-blue-600 hover:bg-blue-50 text-sm"
                          >
                            Ver historial
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {patients !== null && patients.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              Total: <span className="font-bold">{patients.length}</span> paciente(s)
            </div>
          )}
        </ReportSection>

        {/* ── Reporte B: Calendario de citas ── */}
        <ReportSection title="Calendario de Citas" icon={Icons.Calendar}>
          <div className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-label">Desde</label>
                <input
                  type="date" 
                  value={dateFrom} 
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="input-modern"
                />
              </div>
              <div>
                <label className="text-label">Hasta</label>
                <input
                  type="date" 
                  value={dateTo} 
                  onChange={(e) => setDateTo(e.target.value)}
                  className="input-modern"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadCalendar}
                  disabled={loadingC}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loadingC ? (
                    <>
                      <Icons.Spinner className="w-5 h-5 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Icons.Download className="w-5 h-5" />
                      Generar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {calendar !== null && (
            calendar.length === 0 ? (
              <div className="py-8 text-center">
                <Icons.Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No hay citas en ese rango</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700 text-sm">Fecha</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700 text-sm">Hora</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700 text-sm">Estado</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700 text-sm">Paciente</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700 text-sm">Reservado por</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {calendar.map((slot) => {
                      const config = statusConfig[slot.status] || statusConfig.available;
                      return (
                        <tr key={slot.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 font-medium text-slate-900">{fmtDate(slot.slot_date)}</td>
                          <td className="px-6 py-3 text-slate-600 font-mono">{slot.slot_time?.slice(0, 5)}</td>
                          <td className="px-6 py-3">
                            <span className={`badge ${config.badge}`}>
                              {statusLabel[slot.status] || slot.status}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-slate-600">{slot.patient_name || '—'}</td>
                          <td className="px-6 py-3 text-slate-600 capitalize text-sm">{slot.booked_by || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {calendar !== null && calendar.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="p-3 bg-emerald-50 rounded-lg text-sm">
                <p className="text-emerald-600 font-semibold">
                  {calendar.filter(s => s.status === 'available').length} disponibles
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-sm">
                <p className="text-blue-600 font-semibold">
                  {calendar.filter(s => s.status === 'booked').length} reservadas
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg text-sm">
                <p className="text-slate-600 font-semibold">
                  {calendar.filter(s => s.status === 'cancelled').length} canceladas
                </p>
              </div>
            </div>
          )}
        </ReportSection>
      </div>
    </Layout>
  );
}
