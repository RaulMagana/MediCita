/**
 * pages/ReportsPage.jsx
 * Generación de reportes con autenticación (solo médico).
 * a) Lista de pacientes  b) Calendario de citas
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { reportApi } from '../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function Section({ title, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
        <h2 className="font-semibold text-slate-800 text-sm">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
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
    try { return format(new Date(d), "d MMM yyyy", { locale: es }); }
    catch { return d; }
  };

  const statusLabel = { available: 'Disponible', booked: 'Reservado', cancelled: 'Cancelado' };
  const statusColor = {
    available: 'bg-emerald-50 text-emerald-700',
    booked:    'bg-blue-50 text-blue-700',
    cancelled: 'bg-slate-100 text-slate-500',
  };

  return (
    <Layout title="Reportes">
      <div className="max-w-4xl space-y-6">

        {/* ── Reporte A: Lista de pacientes ── */}
        <Section title="a) Lista de Pacientes">
          <button
            onClick={loadPatients}
            disabled={loadingP}
            className="mb-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-60
                       text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            {loadingP ? 'Generando...' : 'Generar reporte'}
          </button>

          {patients !== null && (
            patients.length === 0 ? (
              <p className="text-slate-400 text-sm">No hay pacientes registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="pb-2 font-medium text-slate-600">Nombre</th>
                      <th className="pb-2 font-medium text-slate-600">Correo</th>
                      <th className="pb-2 font-medium text-slate-600">Teléfono</th>
                      <th className="pb-2 font-medium text-slate-600">Sexo</th>
                      <th className="pb-2 font-medium text-slate-600">Citas</th>
                      <th className="pb-2 font-medium text-slate-600">Historial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {patients.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-2 font-medium text-slate-800">{p.full_name}</td>
                        <td className="py-2 text-slate-600">{p.email}</td>
                        <td className="py-2 text-slate-600">{p.phone || '—'}</td>
                        <td className="py-2 text-slate-600">
                          {{ M: 'M', F: 'F', O: 'Otro' }[p.sex]}
                        </td>
                        <td className="py-2 text-slate-600">{p.total_appointments}</td>
                        <td className="py-2">
                          <Link
                            to={`/history/${p.id}`}
                            className="text-teal-600 hover:underline text-xs"
                          >
                            Ver →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </Section>

        {/* ── Reporte B: Calendario de citas ── */}
        <Section title="b) Calendario de Citas">
          <div className="flex items-end gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Desde</label>
              <input
                type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Hasta</label>
              <input
                type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <button
              onClick={loadCalendar}
              disabled={loadingC}
              className="bg-teal-600 hover:bg-teal-700 disabled:opacity-60
                         text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
              {loadingC ? 'Generando...' : 'Generar'}
            </button>
          </div>

          {calendar !== null && (
            calendar.length === 0 ? (
              <p className="text-slate-400 text-sm">No hay citas en ese rango.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="pb-2 font-medium text-slate-600">Fecha</th>
                      <th className="pb-2 font-medium text-slate-600">Hora</th>
                      <th className="pb-2 font-medium text-slate-600">Estado</th>
                      <th className="pb-2 font-medium text-slate-600">Paciente</th>
                      <th className="pb-2 font-medium text-slate-600">Agendado por</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {calendar.map((slot) => (
                      <tr key={slot.id} className="hover:bg-slate-50">
                        <td className="py-2 text-slate-800">{fmtDate(slot.slot_date)}</td>
                        <td className="py-2 text-slate-600">{slot.slot_time?.slice(0, 5)}</td>
                        <td className="py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                                           ${statusColor[slot.status]}`}>
                            {statusLabel[slot.status] || slot.status}
                          </span>
                        </td>
                        <td className="py-2 text-slate-600">{slot.patient_name || '—'}</td>
                        <td className="py-2 text-slate-600 capitalize">{slot.booked_by || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </Section>
      </div>
    </Layout>
  );
}
