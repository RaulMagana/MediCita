/**
 * pages/AppointmentsPage.jsx
 * Calendario de slots y reserva/cancelación de citas con diseño moderno.
 */

import { useState, useEffect } from 'react';
import { format, parseISO, addDays, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import Layout from '../components/shared/Layout';
import { useAuth } from '../context/AuthContext';
import { appointmentApi, patientApi } from '../services/api';
import { Icons } from '../components/shared/Icons';

const STATUS_CONFIG = {
  available: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'badge-success' },
  booked:    { bg: 'bg-slate-100', border: 'border-slate-200', text: 'text-slate-500', badge: 'badge-warning' },
  cancelled: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', badge: 'badge-danger' },
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
      setMsg('✓ Cita reservada exitosamente');
      setSelectedSlot(null);
      loadSlots();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg((err.response?.data?.error || 'Error al reservar').replace(/^Error: /, ''));
    }
  };

  const handleCancel = async (slotId) => {
    if (!window.confirm('¿Cancelar esta cita?')) return;
    try {
      await appointmentApi.cancel(slotId);
      setMsg('✓ Cita cancelada');
      loadSlots();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg((err.response?.data?.error || 'Error al cancelar').replace(/^Error: /, ''));
    }
  };

  const slotsForDay = (date) =>
    slots.filter((s) => s.slot_date === format(date, 'yyyy-MM-dd'));

  const getAvailableCount = () => slots.filter(s => s.status === 'available').length;
  const getBookedCount = () => slots.filter(s => s.status === 'booked').length;

  return (
    <Layout title="Gestión de Citas">
      <div className="space-y-6 max-w-6xl">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 border-l-4 border-l-emerald-500">
            <p className="text-sm text-slate-500">Disponibles</p>
            <p className="text-2xl font-bold text-emerald-600">{getAvailableCount()}</p>
          </div>
          <div className="card p-4 border-l-4 border-l-blue-500">
            <p className="text-sm text-slate-500">Reservadas</p>
            <p className="text-2xl font-bold text-blue-600">{getBookedCount()}</p>
          </div>
          <div className="card p-4 border-l-4 border-l-slate-500">
            <p className="text-sm text-slate-500">Total</p>
            <p className="text-2xl font-bold text-slate-600">{slots.length}</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between card p-4">
          <button
            onClick={() => setWeekStart((d) => addDays(d, -7))}
            className="btn-secondary flex items-center gap-2"
          >
            <Icons.ChevronLeft className="w-4 h-4" />
            Anterior
          </button>
          
          <span className="text-lg font-semibold text-slate-900">
            {format(weekStart, 'd MMM', { locale: es })} — {format(addDays(weekStart, 4), 'd MMM yyyy', { locale: es })}
          </span>
          
          <button
            onClick={() => setWeekStart((d) => addDays(d, 7))}
            className="btn-secondary flex items-center gap-2"
          >
            Siguiente
            <Icons.ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Mensajes */}
        {msg && (
          <div className="fade-in card p-4 bg-blue-50 border-l-4 border-l-blue-500 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icons.Check className="w-5 h-5 text-blue-600" />
              <p className="text-blue-900 font-medium">{msg}</p>
            </div>
            <button onClick={() => setMsg('')} className="btn-ghost">
              <Icons.X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Calendario */}
        {loading ? (
          <div className="card p-12 flex items-center justify-center">
            <Icons.Spinner className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {weekDays.map((day, dayIdx) => (
              <div key={day.toISOString()} className="slide-in-right" style={{ animationDelay: `${dayIdx * 50}ms` }}>
                <div className="card p-4 mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {format(day, 'EEE', { locale: es })}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {format(day, 'd')}
                  </p>
                </div>

                <div className="space-y-2">
                  {slotsForDay(day).length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-sm">
                      Sin slots
                    </div>
                  )}
                  
                  {slotsForDay(day).map((slot) => {
                    const config = STATUS_CONFIG[slot.status];
                    return (
                      <div
                        key={slot.id}
                        onClick={() => slot.status === 'available' && setSelectedSlot(slot)}
                        className={`card p-3 text-center transition-all cursor-pointer
                          ${slot.status === 'available' ? 'hover:shadow-lg hover:scale-105' : ''}
                          ${config.bg} border ${config.border}`}
                      >
                        <p className={`font-bold ${config.text}`}>
                          {slot.slot_time.slice(0, 5)}
                        </p>
                        <div className={`mt-2 text-xs font-medium ${config.badge}`}>
                          {slot.status === 'available' && 'Disponible'}
                          {slot.status === 'booked' && 'Reservada'}
                          {slot.status === 'cancelled' && 'Cancelada'}
                        </div>
                        
                        {(slot.status === 'booked' || slot.status === 'cancelled') && (
                          <button
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleCancel(slot.id); 
                            }}
                            className="btn-ghost text-xs w-full mt-2"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de reserva */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-elevated w-full max-w-sm scale-in">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Reservar cita</h2>
              <p className="text-slate-500 mb-6">Confirma los detalles de tu reserva</p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Icons.Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">{selectedSlot.slot_date}</p>
                    <p className="text-sm text-blue-700">{selectedSlot.slot_time.slice(0, 5)} horas</p>
                  </div>
                </div>
              </div>

              {isDoctor && (
                <div className="mb-6">
                  <label className="text-label">Paciente</label>
                  <select
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                    className="input-modern"
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
                  onClick={() => setSelectedSlot(null)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleBook}
                  disabled={isDoctor && !selectedPatient}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Icons.Check className="w-4 h-4" />
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
