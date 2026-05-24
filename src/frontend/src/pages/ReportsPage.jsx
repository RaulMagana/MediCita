/**
 * pages/ReportsPage.jsx
 * Generación de reportes con autenticación (solo médico).
 * Incluye: A) Lista de pacientes, B) Calendario de citas, C) Historial clínico.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { reportApi, patientApi, recordApi } from '../services/api';
import { Icons } from '../components/shared/Icons';
import { format, parseISO } from 'date-fns';
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
  // ── A: Lista de pacientes
  const [patients,  setPatients]  = useState(null);
  const [loadingP,  setLoadingP]  = useState(false);

  // ── B: Calendario
  const [calendar,  setCalendar]  = useState(null);
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');
  const [loadingC,  setLoadingC]  = useState(false);

  // ── C: Historial clínico
  const [allPatients,   setAllPatients]   = useState([]);
  const [selectedPat,   setSelectedPat]   = useState('');
  const [history,       setHistory]       = useState(null);
  const [histPatient,   setHistPatient]   = useState(null);
  const [loadingH,      setLoadingH]      = useState(false);
  const [loadingPList,  setLoadingPList]  = useState(false);
  const [patListLoaded, setPatListLoaded] = useState(false);

  const fmtDate = (d) => {
    try { return format(new Date(d), "d 'de' MMMM yyyy", { locale: es }); }
    catch { return d; }
  };

  const fmtDateTime = (d) => {
    try { return format(parseISO(d), "d 'de' MMMM yyyy, HH:mm 'hs'", { locale: es }); }
    catch { return d; }
  };

  // ── Loaders
  const loadPatients = async () => {
    setLoadingP(true);
    try { const { data } = await reportApi.patients(); setPatients(data.data); }
    catch { /* silencioso */ }
    finally { setLoadingP(false); }
  };

  const loadCalendar = async () => {
    setLoadingC(true);
    try {
      const { data } = await reportApi.calendar({ from: dateFrom || undefined, to: dateTo || undefined });
      setCalendar(data.data);
    } catch { /* silencioso */ }
    finally { setLoadingC(false); }
  };

  const loadPatientList = async () => {
    if (patListLoaded) return;
    setLoadingPList(true);
    try {
      const { data } = await patientApi.list();
      setAllPatients(data.data);
      setPatListLoaded(true);
    } catch { /* silencioso */ }
    finally { setLoadingPList(false); }
  };

  const loadHistory = async () => {
    if (!selectedPat) return;
    setLoadingH(true);
    setHistory(null);
    setHistPatient(null);
    try {
      const patient = allPatients.find(p => p.id === selectedPat);
      setHistPatient(patient || null);
      const { data } = await recordApi.getByPatient(selectedPat);
      setHistory(data.data);
    } catch { /* silencioso */ }
    finally { setLoadingH(false); }
  };

  const statusLabel  = { available: 'Disponible', booked: 'Reservada', cancelled: 'Cancelada' };
  const statusConfig = {
    available: { badge: 'badge-success' },
    booked:    { badge: 'badge-info' },
    cancelled: { badge: 'badge-warning' },
  };

  return (
    <Layout title="Reportes y Análisis">
      <div className="max-w-6xl space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 rounded-2xl p-8 text-white shadow-lg">
          <h2 className="text-3xl font-bold mb-2">Centro de Reportes</h2>
          <p className="text-blue-100">Genera y analiza reportes de pacientes y citas</p>
        </div>

        {/* ── A: Lista de pacientes ── */}
        <ReportSection title="A. Listado de Pacientes" icon={Icons.Users}>
          <button
            onClick={loadPatients}
            disabled={loadingP}
            className="btn-primary mb-6 inline-flex items-center gap-2"
          >
            {loadingP
              ? <><Icons.Spinner className="w-5 h-5 animate-spin" /> Generando...</>
              : <><Icons.Download className="w-5 h-5" /> Generar reporte</>}
          </button>

          {patients !== null && (
            patients.length === 0 ? (
              <div className="py-8 text-center">
                <Icons.Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No hay pacientes registrados</p>
              </div>
            ) : (
              <>
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
                            <span className="badge badge-success">{p.total_appointments}</span>
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
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  Total: <span className="font-bold">{patients.length}</span> paciente(s) activos
                </div>
              </>
            )
          )}
        </ReportSection>

        {/* ── B: Calendario de citas ── */}
        <ReportSection title="B. Calendario de Citas" icon={Icons.Calendar}>
          <div className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-label">Desde</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-modern" />
              </div>
              <div>
                <label className="text-label">Hasta</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-modern" />
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadCalendar}
                  disabled={loadingC}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loadingC
                    ? <><Icons.Spinner className="w-5 h-5 animate-spin" /> Generando...</>
                    : <><Icons.Download className="w-5 h-5" /> Generar</>}
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
              <>
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
                        const cfg = statusConfig[slot.status] || statusConfig.available;
                        return (
                          <tr key={slot.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-3 font-medium text-slate-900">{fmtDate(slot.slot_date)}</td>
                            <td className="px-6 py-3 text-slate-600 font-mono">{slot.slot_time?.slice(0, 5)}</td>
                            <td className="px-6 py-3">
                              <span className={`badge ${cfg.badge}`}>{statusLabel[slot.status] || slot.status}</span>
                            </td>
                            <td className="px-6 py-3 text-slate-600">{slot.patient_name || '—'}</td>
                            <td className="px-6 py-3 text-slate-600 capitalize text-sm">{slot.booked_by || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="p-3 bg-emerald-50 rounded-lg text-sm">
                    <p className="text-emerald-600 font-semibold">{calendar.filter(s => s.status === 'available').length} disponibles</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg text-sm">
                    <p className="text-blue-600 font-semibold">{calendar.filter(s => s.status === 'booked').length} reservadas</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg text-sm">
                    <p className="text-slate-600 font-semibold">{calendar.filter(s => s.status === 'cancelled').length} canceladas</p>
                  </div>
                </div>
              </>
            )
          )}
        </ReportSection>

        {/* ── C: Historial clínico ── */}
        <ReportSection title="C. Historial Clínico de Paciente" icon={Icons.FileText}>
          <p className="text-sm text-slate-500 mb-4">
            Selecciona un paciente para generar su historial completo (datos generales + consultas).
          </p>

          <div className="flex gap-3 mb-6">
            <div className="flex-1">
              <select
                value={selectedPat}
                onChange={(e) => setSelectedPat(e.target.value)}
                onFocus={loadPatientList}
                className="input-modern"
              >
                <option value="">
                  {loadingPList ? 'Cargando pacientes...' : 'Seleccionar paciente...'}
                </option>
                {allPatients.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name} — {p.email}</option>
                ))}
              </select>
            </div>
            <button
              onClick={loadHistory}
              disabled={!selectedPat || loadingH}
              className="btn-primary flex items-center gap-2 px-6"
            >
              {loadingH
                ? <><Icons.Spinner className="w-5 h-5 animate-spin" /> Generando...</>
                : <><Icons.Download className="w-5 h-5" /> Generar</>}
            </button>
          </div>

          {/* Resultado del reporte C */}
          {history !== null && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              {/* Encabezado: datos generales del paciente */}
              {histPatient && (
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-3">
                    Historial Clínico — Datos del Paciente
                  </p>
                  <h3 className="text-2xl font-bold mb-4">{histPatient.full_name}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-blue-200 text-xs">Correo</p>
                      <p className="font-medium">{histPatient.email}</p>
                    </div>
                    <div>
                      <p className="text-blue-200 text-xs">Teléfono</p>
                      <p className="font-medium">{histPatient.phone || '—'}</p>
                    </div>
                    <div>
                      <p className="text-blue-200 text-xs">Fecha de nacimiento</p>
                      <p className="font-medium">{histPatient.birth_date ? fmtDate(histPatient.birth_date) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-blue-200 text-xs">Sexo</p>
                      <p className="font-medium">{{ M: 'Masculino', F: 'Femenino', O: 'Otro' }[histPatient.sex] || histPatient.sex}</p>
                    </div>
                    <div>
                      <p className="text-blue-200 text-xs">Dirección</p>
                      <p className="font-medium">{histPatient.address || '—'}</p>
                    </div>
                    <div>
                      <p className="text-blue-200 text-xs">Total de consultas</p>
                      <p className="font-bold text-lg">{history.length}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Cuerpo: consultas */}
              {history.length === 0 ? (
                <div className="p-12 text-center">
                  <Icons.FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">Este paciente no tiene consultas registradas aún.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {history.map((rec, idx) => (
                    <div key={rec.id} className="p-6">
                      {/* Cabecera de la consulta */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 capitalize">
                              {rec.slotDate ? fmtDate(rec.slotDate) : '—'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {rec.slotTime ? rec.slotTime.slice(0, 5) + ' hs' : ''}
                              {rec.recordedAt ? ` · Registrado: ${fmtDateTime(rec.recordedAt)}` : ''}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Signos vitales */}
                      {rec.vitalSigns && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Signos vitales</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {[
                              { label: 'Temperatura', value: `${rec.vitalSigns.temperature} °C` },
                              { label: 'Peso',        value: `${rec.vitalSigns.weight} kg` },
                              { label: 'Estatura',    value: `${rec.vitalSigns.height} m` },
                              { label: 'Presión',     value: `${rec.vitalSigns.systolic}/${rec.vitalSigns.diastolic} mmHg` },
                            ].map(({ label, value }) => (
                              <div key={label} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                <p className="text-xs text-slate-500">{label}</p>
                                <p className="font-semibold text-slate-900 text-sm">{value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Campos clínicos */}
                      <div className="space-y-3">
                        {[
                          { label: 'Diagnóstico',           value: rec.diagnosis },
                          { label: 'Prescripciones',        value: rec.prescriptions },
                          { label: 'Análisis clínicos',     value: rec.labResults },
                          { label: 'Notas adicionales',     value: rec.notes },
                        ].map(({ label, value }) =>
                          value ? (
                            <div key={label}>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{value}</p>
                              </div>
                            </div>
                          ) : null
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ReportSection>
      </div>
    </Layout>
  );
}