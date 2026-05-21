/**
 * pages/AppointmentsPage.jsx
 * Calendario de slots y reserva/cancelación de citas.
 */

import { useState, useEffect } from 'react';
import { format, parseISO, addDays, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import Layout from '../components/shared/Layout';
import { useAuth } from '../context/AuthContext';
import { appointmentApi, patientApi } from '../services/api';

const STATUS_COLOR = {
  available: 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 cursor-pointer',
  booked:    'bg-red-50 border-red-300 text-red-700 cursor-default',
  cancelled: 'bg-slate-100 border-slate-200 text-slate-400 cursor-default line-through',
};

export default function AppointmentsPage() {
  const { isDoctor } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [slots, setSlots]         = useState([]);
  const [patients, setPatients]   = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [loading, setLoading]     = useState(false);
  const [msg, setMsg]             = useState('');

  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  const loadSlots = async () => {
    setLoading(true);
    try {
      const from = format(weekStart, 'yyyy-MM-dd');
      const to   = format(addDays(weekStart, 4), 'yyyy-MM-dd');
      const { data } = await appointmentApi.getSlots({ from, to });
      setSlots(data.data);
    } catch { /* ignorar */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadSlots(); }, [weekStart]);

  useEffect(() => {
    if (isDoctor) {
      patientApi.list().then(({ data }) => setPatients(data.data)).catch(() => {});
    }
  }, [isDoctor]);

  const handleBook = async () => {
    if (!selectedSlot) return;
    try {
      const payload = { slotId: selectedSlot.id };
      if (isDoctor) payload.patientId = selectedPatient;
      await appointmentApi.book(payload);
      setMsg('✅ Cita reservada exitosamente');
      setSelectedSlot(null);
      loadSlots();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Error al reservar'));
    }
  };

  const handleCancel = async (slotId) => {
    if (!window.confirm('¿Cancelar esta cita?')) return;
    try {
      await appointmentApi.cancel(slotId);
      setMsg('✅ Cita cancelada');
      loadSlots();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Error al cancelar'));
    }
  };

  const slotsForDay = (date) =>
    slots.filter((s) => s.slot_date === format(date, 'yyyy-MM-dd'));

  return (
    <Layout title="Gestión de Citas">
      <div className="space-y-4">
        {/* Navegación de semana */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWeekStart((d) => addDays(d, -7))}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            ← Anterior
          </button>
          <span className="text-sm font-medium text-slate-700">
            Semana del {format(weekStart, 'd MMM', { locale: es })} al{' '}
            {format(addDays(weekStart, 4), 'd MMM yyyy', { locale: es })}
          </span>
          <button
            onClick={() => setWeekStart((d) => addDays(d, 7))}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Siguiente →
          </button>
        </div>

        {msg && (
          <div className="text-sm px-4 py-2 rounded-lg bg-slate-100 text-slate-700">
            {msg}{' '}
            <button onClick={() => setMsg('')} className="ml-2 text-slate-400 hover:text-slate-600">✕</button>
          </div>
        )}

        {/* Calendario */}
        {loading ? (
          <p className="text-slate-500 text-sm">Cargando horarios...</p>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="space-y-2">
                <div className="text-center">
                  <p className="text-xs text-slate-500 uppercase">
                    {format(day, 'EEE', { locale: es })}
                  </p>
                  <p className="font-semibold text-slate-800 text-sm">
                    {format(day, 'd')}
                  </p>
                </div>
                <div className="space-y-1.5">
                  {slotsForDay(day).length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">Sin slots</p>
                  )}
                  {slotsForDay(day).map((slot) => (
                    <div
                      key={slot.id}
                      onClick={() => slot.status === 'available' && setSelectedSlot(slot)}
                      className={`border rounded-lg px-2 py-1.5 text-xs text-center transition-all
                                  ${STATUS_COLOR[slot.status]}`}
                    >
                      <p className="font-medium">{slot.slot_time.slice(0, 5)}</p>
                      {slot.status === 'booked' && isDoctor && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCancel(slot.id); }}
                          className="text-red-500 hover:text-red-700 mt-0.5 text-xs"
                        >
                          Cancelar
                        </button>
                      )}
                      {slot.status === 'booked' && !isDoctor && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCancel(slot.id); }}
                          className="text-red-400 hover:text-red-600 mt-0.5 text-xs"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de reserva */}
        {selectedSlot && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
              <h2 className="font-semibold text-slate-800 mb-4">Reservar cita</h2>
              <p className="text-sm text-slate-600 mb-4">
                📅 {selectedSlot.slot_date} a las {selectedSlot.slot_time.slice(0, 5)}
              </p>

              {isDoctor && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Paciente</label>
                  <select
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                               focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Seleccionar paciente...</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleBook}
                  disabled={isDoctor && !selectedPatient}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50
                             text-white text-sm font-medium py-2 rounded-lg"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => setSelectedSlot(null)}
                  className="flex-1 border border-slate-300 text-slate-700 text-sm py-2 rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Leyenda */}
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-400 inline-block" />
            Disponible
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-200 border border-red-400 inline-block" />
            Ocupado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-200 border border-slate-300 inline-block" />
            Cancelado
          </span>
        </div>
      </div>
    </Layout>
  );
}
