/**
 * pages/ClinicalRecordPage.jsx
 * Formulario para que el médico registre la historia clínica de una consulta.
 * Todos los campos sensibles se cifran en el backend (AES-256-CBC).
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { recordApi } from '../services/api';
import { Icons } from '../components/shared/Icons';

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
        setPatientId(r.patientId || r.patient_id || '');
        if (r.vitalSigns) setVitals(r.vitalSigns);
        setDiagnosis(r.diagnosis     || '');
        setPrescriptions(r.prescriptions || '');
        setLabResults(r.labResults   || '');
        setNotes(r.notes             || '');
      })
      .catch(() => {
        // No existe registro aún
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
      const payload = {
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
      };

      if (existing) {
        // Actualizar registro existente
        await recordApi.update(existing.id, payload);
      } else {
        // Crear nuevo registro
        await recordApi.create({
          slotId,
          patientId,
          ...payload,
        });
      }
      setMsg('Registro guardado correctamente');
      setTimeout(() => navigate(-1), 1500);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Error al guardar';
      setMsg(errorMsg.replace(/^Error: /, ''));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Historia Clínica">
        <div className="flex items-center justify-center py-12">
          <Icons.Spinner className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Registro de Historia Clínica">
      <div className="max-w-3xl">
        {existing && (
          <div className="fade-in card p-4 bg-blue-50 border-l-4 border-l-blue-500 mb-6 flex items-start gap-3">
            <Icons.AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-900 font-semibold text-sm">Registro existente</p>
              <p className="text-blue-700 text-xs mt-1">Este registro ya existe. Los cambios lo actualizarán.</p>
            </div>
          </div>
        )}

        {msg && (
          <div className="fade-in card p-4 bg-emerald-50 border-l-4 border-l-emerald-500 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icons.Check className="w-5 h-5 text-emerald-600" />
              <p className="text-emerald-900 font-medium">{msg}</p>
            </div>
            <button onClick={() => setMsg('')} className="btn-ghost">
              <Icons.X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Signos vitales */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Icons.Settings className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Signos vitales</h2>
                <p className="text-xs text-slate-500 mt-0.5">Cifrados en reposo (AES-256-CBC)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'temperature', label: 'Temperatura (°C)', min: 30, max: 45, step: 0.1, Icon: Icons.AlertCircle },
                { name: 'weight',      label: 'Peso (kg)',         min: 1,  max: 300, step: 0.1 },
                { name: 'height',      label: 'Estatura (m)',      min: 0.3, max: 2.5, step: 0.01 },
                { name: 'systolic',    label: 'Presión sistólica (mmHg)', min: 50, max: 300 },
                { name: 'diastolic',   label: 'Presión diastólica (mmHg)', min: 30, max: 200 },
              ].map(({ name, label, min, max, step = 1 }) => (
                <div key={name}>
                  <label className="text-label">{label}</label>
                  <input
                    type="number" 
                    name={name} 
                    value={vitals[name]}
                    onChange={handleVital}
                    min={min} max={max} step={step} 
                    required
                    className="input-modern"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Relatoría clínica */}
          <div className="card p-6 space-y-5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Icons.FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="font-bold text-slate-900">Relatoría de consulta</h2>
            </div>

            {[
              { label: 'Diagnóstico', value: diagnosis, set: setDiagnosis, placeholder: 'Describe el diagnóstico...' },
              { label: 'Prescripciones / Medicamentos', value: prescriptions, set: setPrescriptions, placeholder: 'Lista de medicamentos prescritos...' },
              { label: 'Resultados de análisis clínicos', value: labResults, set: setLabResults, placeholder: 'Resultados de laboratorio...' },
              { label: 'Notas adicionales', value: notes, set: setNotes, placeholder: 'Observaciones importantes...' },
            ].map(({ label, value, set, placeholder }) => (
              <div key={label}>
                <label className="text-label">{label}</label>
                <textarea
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  rows={4}
                  placeholder={placeholder}
                  className="input-modern resize-y"
                />
              </div>
            ))}
          </div>

          {/* Acciones */}
          <div className="flex gap-3">
            <button
              type="submit" 
              disabled={saving}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Icons.Spinner className="w-5 h-5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Icons.Check className="w-5 h-5" />
                  Guardar registro
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
