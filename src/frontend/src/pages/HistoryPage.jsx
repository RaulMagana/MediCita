/**
 * pages/HistoryPage.jsx
 * Historial clínico completo de un paciente con diseño moderno.
 * Accesible por el médico (cualquier paciente) y por el propio paciente.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { recordApi, patientApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Icons } from '../components/shared/Icons';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function HistoryPage() {
  const { patientId } = useParams();
  const { isDoctor, user } = useAuth();

  const [patient, setPatient]   = useState(null);
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [resolvedId, setResolvedId] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        let pid = patientId;

        // El paciente accede con "me" como patientId
        if (patientId === 'me') {
          const { data } = await patientApi.me();
          pid = data.data.id;
          setPatient(data.data);
        } else {
          const { data } = await patientApi.getById(patientId);
          setPatient(data.data);
        }

        setResolvedId(pid);
        const { data: recs } = await recordApi.getByPatient(pid);
        setRecords(recs.data);
      } catch {
        /* silencioso */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [patientId]);

  const toggle = (id) => setExpanded((prev) => (prev === id ? null : id));

  const fmtDate = (d) => {
    try { return format(parseISO(d), "d 'de' MMMM yyyy", { locale: es }); }
    catch { return d; }
  };

  if (loading) {
    return (
      <Layout title="Historial Clínico">
        <div className="flex items-center justify-center py-12">
          <Icons.Spinner className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Historial Clínico">
      <div className="max-w-4xl space-y-6">
        {/* Encabezado del paciente */}
        {patient && (
          <div className="card-elevated p-6 bg-gradient-to-br from-blue-50 to-white">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 
                              flex items-center justify-center text-white font-bold text-lg">
                {patient.full_name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900">{patient.full_name}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Icons.Mail className="w-4 h-4" />
                    <span className="text-sm">{patient.email}</span>
                  </div>
                  {patient.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Icons.Settings className="w-4 h-4" />
                      <span className="text-sm">{patient.phone}</span>
                    </div>
                  )}
                  {patient.birth_date && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Icons.Calendar className="w-4 h-4" />
                      <span className="text-sm">{fmtDate(patient.birth_date)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className={`badge ${patient.sex === 'M' ? 'badge-info' : patient.sex === 'F' ? 'badge-success' : 'badge-warning'}`}>
                      {{ M: 'Masculino', F: 'Femenino', O: 'Otro' }[patient.sex] || patient.sex}
                    </span>
                  </div>
                  {patient.address && (
                    <div className="col-span-2 flex items-start gap-2 text-slate-600">
                      <Icons.Download className="w-4 h-4 mt-0.5" />
                      <span className="text-sm">{patient.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Registros clínicos */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Consultas registradas</h3>
              <p className="text-sm text-slate-500 mt-1">{records.length} consulta(s) en historial</p>
            </div>
          </div>

          {records.length === 0 && (
            <div className="card p-12 flex flex-col items-center justify-center gap-3">
              <Icons.FileText className="w-12 h-12 text-slate-300" />
              <p className="text-slate-500 text-center">No hay registros clínicos aún</p>
            </div>
          )}

          <div className="space-y-4">
            {records.map((rec, idx) => (
              <div
                key={rec.id}
                className="card overflow-hidden hover:shadow-lg transition-all duration-300 slide-in-right"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Cabecera del registro */}
                <button
                  onClick={() => toggle(rec.id)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="text-left flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Icons.Calendar className="w-5 h-5 text-blue-600" />
                      <p className="font-bold text-slate-900">
                        {rec.slotDate ? fmtDate(rec.slotDate) : '—'}
                      </p>
                      <span className="text-slate-500 font-normal">
                        {rec.slotTime ? rec.slotTime.slice(0, 5) + 'hs' : ''}
                      </span>
                    </div>
                    {rec.diagnosis && (
                      <p className="text-sm text-slate-600 truncate max-w-2xl">
                        <span className="font-semibold">Diagnóstico:</span> {rec.diagnosis}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isDoctor && (
                      <Link
                        to={`/records/${rec.slotId || rec.id}`}
                        className="btn-ghost text-blue-600 hover:bg-blue-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Icons.Settings className="w-4 h-4" />
                      </Link>
                    )}
                    <span className={`text-slate-400 transition-transform ${expanded === rec.id ? 'rotate-180' : ''}`}>
                      <Icons.ChevronRight className="w-5 h-5" />
                    </span>
                  </div>
                </button>

                {/* Detalle expandible */}
                {expanded === rec.id && (
                  <div className="border-t border-slate-200 px-6 py-5 space-y-6 bg-slate-50">
                    {/* Signos vitales */}
                    {rec.vitalSigns && (
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                          <Icons.AlertCircle className="w-4 h-4 text-emerald-600" />
                          Signos vitales
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { label: 'Temperatura', value: `${rec.vitalSigns.temperature}°C`, icon: '🌡️' },
                            { label: 'Peso', value: `${rec.vitalSigns.weight} kg`, icon: '⚖️' },
                            { label: 'Estatura', value: `${rec.vitalSigns.height} m`, icon: '📏' },
                            { label: 'Presión', value: `${rec.vitalSigns.systolic}/${rec.vitalSigns.diastolic}`, icon: '💪' },
                          ].map(({ label, value }) => (
                            <div key={label} className="bg-white rounded-lg px-4 py-3 border border-slate-200">
                              <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
                              <p className="font-bold text-slate-900 text-sm">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Campos clínicos */}
                    <div className="space-y-4">
                      {[
                        { label: 'Diagnóstico', value: rec.diagnosis, Icon: Icons.FileText },
                        { label: 'Prescripciones', value: rec.prescriptions, Icon: Icons.Download },
                        { label: 'Análisis clínicos', value: rec.labResults, Icon: Icons.BarChart },
                        { label: 'Notas adicionales', value: rec.notes, Icon: Icons.FileText },
                      ].map(({ label, value, Icon }) =>
                        value ? (
                          <div key={label}>
                            <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                              <Icon className="w-4 h-4 text-blue-600" />
                              {label}
                            </h4>
                            <div className="bg-white rounded-lg p-4 border border-slate-200">
                              <p className="text-sm text-slate-700 whitespace-pre-wrap">{value}</p>
                            </div>
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
