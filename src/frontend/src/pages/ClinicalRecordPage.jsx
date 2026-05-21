/**
 * pages/ClinicalRecordPage.jsx
 * Formulario para que el médico registre la historia clínica de una consulta.
 * Todos los campos sensibles se cifran en el backend (AES-256-CBC).
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { recordApi } from '../services/api';

const INITIAL_VITALS = {
  temperature: '',
  weight: '',
  height: '',
  systolic: '',
  diastolic: '',
};

export default function ClinicalRecordPage() {
  const { slotId }  = useParams();
  const navigate    = useNavigate();

  const [vitals, setVitals]             = useState(INITIAL_VITALS);
  const [diagnosis, setDiagnosis]       = useState('');
  const [prescriptions, setPrescriptions] = useState('');
  const [labResults, setLabResults]     = useState('');
  const [notes, setNotes]               = useState('');
  const [patientId, setPatientId]       = useState('');
  const [existing, setExisting]         = useState(null);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [msg, setMsg]                   = useState('');

  // Cargar registro existente (si lo hay) para edición
  useEffect(() => {
    recordApi.getBySlot(slotId)
      .then(({ data }) => {
        const r = data.data;
        setExisting(r);
        setPatientId(r.patient_id || '');
        if (r.vitalSigns) setVitals(r.vitalSigns);
        setDiagnosis(r.diagnosis     || '');
        setPrescriptions(r.prescriptions || '');
        setLabResults(r.labResults   || '');
        setNotes(r.notes             || '');
      })
      .catch(() => {
        // No existe registro aún — necesitamos patient_id del slot
        // Se obtiene de state de navegación o desde la API de appointments
        import('../services/api').then(({ appointmentApi }) => {
          appointmentApi.getSlots({ status: 'booked' })
            .then(({ data }) => {
              const slot = data.data.find((s) => s.id === slotId);
              if (slot) setPatientId(slot.patient_id);
            })
            .catch(() => {});
        });
      })
      .finally(() => setLoading(false));
  }, [slotId]);

  const handleVital = (e) =>
    setVitals((v) => ({ ...v, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await recordApi.create({
        slotId,
        patientId,
        vitalSigns: {
          temperature: Number(vitals.temperature),
          weight:      Number(vitals.weight),
          height:      Number(vitals.height),
          systolic:    Number(vitals.systolic),
          diastolic:   Number(vitals.diastolic),
        },
        diagnosis,
        prescriptions,
        labResults,
        notes,
      });
      setMsg('✅ Registro guardado correctamente');
      setTimeout(() => navigate(-1), 1500);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Error al guardar'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Historia Clínica">
        <p className="text-slate-500 text-sm">Cargando...</p>
      </Layout>
    );
  }

  return (
    <Layout title="Registro de Historia Clínica">
      <div className="max-w-2xl">
        {existing && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700 mb-4">
            Este registro ya existe. Los cambios lo actualizarán.
          </div>
        )}

        {msg && (
          <div className="bg-slate-100 rounded-lg px-4 py-2 text-sm text-slate-700 mb-4">
            {msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Signos vitales — siempre requeridos */}
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span>🩺</span> Signos vitales
              <span className="text-xs font-normal text-slate-400 ml-1">(cifrados en reposo)</span>
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'temperature', label: 'Temperatura (°C)', min: 30, max: 45, step: 0.1 },
                { name: 'weight',      label: 'Peso (kg)',         min: 1,  max: 300, step: 0.1 },
                { name: 'height',      label: 'Estatura (m)',      min: 0.3, max: 2.5, step: 0.01 },
                { name: 'systolic',    label: 'Presión sistólica (mmHg)', min: 50, max: 300 },
                { name: 'diastolic',   label: 'Presión diastólica (mmHg)', min: 30, max: 200 },
              ].map(({ name, label, min, max, step = 1 }) => (
                <div key={name}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                  <input
                    type="number" name={name} value={vitals[name]}
                    onChange={handleVital}
                    min={min} max={max} step={step} required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                               focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Relatoría clínica */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <span>📋</span> Relatoría de consulta
            </h2>

            {[
              { label: 'Diagnóstico', value: diagnosis, set: setDiagnosis },
              { label: 'Prescripciones / Medicamentos', value: prescriptions, set: setPrescriptions },
              { label: 'Resultados de análisis clínicos', value: labResults, set: setLabResults },
              { label: 'Notas adicionales', value: notes, set: setNotes },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                <textarea
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-y
                             focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            ))}
          </section>

          <div className="flex gap-3">
            <button
              type="submit" disabled={saving}
              className="bg-teal-600 hover:bg-teal-700 disabled:opacity-60
                         text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar registro'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="border border-slate-300 text-slate-700 px-6 py-2.5 rounded-lg text-sm hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
