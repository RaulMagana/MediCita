/**
 * pages/HistoryPage.jsx
 * Historial clínico completo de un paciente.
 * Accesible por el médico (cualquier paciente) y por el propio paciente.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { recordApi, patientApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
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
        <p className="text-slate-500 text-sm">Cargando historial...</p>
      </Layout>
    );
  }

  return (
    <Layout title="Historial Clínico">
      <div className="max-w-3xl space-y-5">
        {/* Encabezado del paciente */}
        {patient && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-semibold text-slate-800 text-lg">{patient.full_name}</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2 text-sm text-slate-600">
              <span>📧 {patient.email}</span>
              <span>📱 {patient.phone || '—'}</span>
              <span>🎂 {patient.birth_date ? fmtDate(patient.birth_date) : '—'}</span>
              <span>⚧ {{ M: 'Masculino', F: 'Femenino', O: 'Otro' }[patient.sex] || patient.sex}</span>
              {patient.address && <span className="col-span-2">📍 {patient.address}</span>}
            </div>
          </div>
        )}

        {/* Registros clínicos */}
        <h3 className="font-medium text-slate-700 text-sm">
          {records.length} consulta(s) registrada(s)
        </h3>

        {records.length === 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
            No hay registros clínicos aún.
          </div>
        )}

        {records.map((rec) => (
          <div
            key={rec.id}
            className="bg-white border border-slate-200 rounded-xl overflow-hidden"
          >
            {/* Cabecera del registro — siempre visible */}
            <button
              onClick={() => toggle(rec.id)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
            >
              <div className="text-left">
                <p className="font-medium text-slate-800 text-sm">
                  📅 {rec.slotDate ? fmtDate(rec.slotDate) : '—'}{' '}
                  <span className="text-slate-400 font-normal">
                    {rec.slotTime ? rec.slotTime.slice(0, 5) : ''}
                  </span>
                </p>
                {rec.diagnosis && (
                  <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">
                    Dx: {rec.diagnosis}
                  </p>
                )}
              </div>
              <span className="text-slate-400 text-sm">{expanded === rec.id ? '▲' : '▼'}</span>
            </button>

            {/* Detalle expandible */}
            {expanded === rec.id && (
              <div className="border-t border-slate-100 px-5 py-4 space-y-4">
                {/* Signos vitales */}
                {rec.vitalSigns && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                      🩺 Signos vitales
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Temperatura', value: `${rec.vitalSigns.temperature} °C` },
                        { label: 'Peso',        value: `${rec.vitalSigns.weight} kg` },
                        { label: 'Estatura',    value: `${rec.vitalSigns.height} m` },
                        { label: 'Presión',     value: `${rec.vitalSigns.systolic}/${rec.vitalSigns.diastolic} mmHg` },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-slate-50 rounded-lg px-3 py-2">
                          <p className="text-xs text-slate-500">{label}</p>
                          <p className="font-medium text-slate-800 text-sm">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Campos clínicos */}
                {[
                  { label: '📋 Diagnóstico',     value: rec.diagnosis },
                  { label: '💊 Prescripciones',  value: rec.prescriptions },
                  { label: '🔬 Análisis clínicos', value: rec.labResults },
                  { label: '📝 Notas',            value: rec.notes },
                ].map(({ label, value }) =>
                  value ? (
                    <div key={label}>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">{label}</h4>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg px-3 py-2">
                        {value}
                      </p>
                    </div>
                  ) : null
                )}

                {/* Botón para editar (solo médico) */}
                {isDoctor && (
                  <div className="pt-2">
                    <Link
                      to={`/records/${rec.slotId || rec.id}`}
                      className="text-teal-600 hover:text-teal-800 text-xs font-medium"
                    >
                      ✏️ Editar registro
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </Layout>
  );
}
