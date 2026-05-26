/**
 * pages/AppointmentsPage.jsx
 *
 * Médico:
 *   - Crear slots disponibles (fecha + hora)
 *   - Ver calendario semanal
 *   - Reservar slot para un paciente
 *   - Cancelar / reprogramar cita
 *
 * Paciente:
 *   - Ver slots disponibles y reservar uno
 *   - Ver sus citas activas
 *   - Cancelar sus citas
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO, addDays, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import Layout from '../components/shared/Layout';
import { useAuth } from '../context/AuthContext';
import { appointmentApi, patientApi } from '../services/api';
import { Icons } from '../components/shared/Icons';

const STATUS_CONFIG = {
  available: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: 'Disponible' },
  booked:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    label: 'Reservada'  },
  cancelled: { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-600',     label: 'Cancelada'  },
};

// ─────────────────────────────────────────────────────────────
// Toast helper
// ─────────────────────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState({ text: '', ok: true });
  const notify = (text, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg({ text: '' }), 3500);
  };
  return { msg, notify };
}

function Toast({ msg, onClose }) {
  if (!msg.text) return null;
  return (
    <div className={`fade-in card p-4 border-l-4 flex items-center justify-between
      ${msg.ok ? 'bg-blue-50 border-l-blue-500' : 'bg-red-50 border-l-red-500'}`}>
      <p className={`font-medium text-sm ${msg.ok ? 'text-blue-900' : 'text-red-900'}`}>{msg.text}</p>
      <button onClick={onClose} className="btn-ghost"><Icons.X className="w-4 h-4" /></button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// VISTA MÉDICO
// ─────────────────────────────────────────────────────────────
function DoctorView() {
  const [weekStart, setWeekStart]           = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [slots, setSlots]                   = useState([]);
  const [patients, setPatients]             = useState([]);
  const [loading, setLoading]               = useState(false);
  const { msg, notify }                     = useToast();

  // Modal: reservar cita para paciente
  const [bookSlot, setBookSlot]             = useState(null);
  const [bookPatient, setBookPatient]       = useState('');
  const [bookSaving, setBookSaving]         = useState(false);

  // Modal: crear nuevo slot
  const [showCreate, setShowCreate]         = useState(false);
  const [newDate, setNewDate]               = useState('');
  const [newTime, setNewTime]               = useState('');
  const [createSaving, setCreateSaving]     = useState(false);

  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      const from = format(weekStart, 'yyyy-MM-dd');
      const to   = format(addDays(weekStart, 4), 'yyyy-MM-dd');
      const { data } = await appointmentApi.getSlots({ from, to });
      setSlots(data.data ?? []);
    } catch {
      notify('Error al cargar los slots', false);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  useEffect(() => {
    patientApi.list()
      .then(({ data }) => setPatients(data.data ?? []))
      .catch(() => {});
  }, []);

  // ── Crear slot ────────────────────────────────────────────
  const handleCreateSlot = async (e) => {
    e.preventDefault();
    if (!newDate || !newTime) return;
    setCreateSaving(true);
    try {
      await appointmentApi.createSlot({ date: newDate, time: newTime });
      notify('✓ Slot creado correctamente');
      setShowCreate(false);
      setNewDate('');
      setNewTime('');
      loadSlots();
    } catch (err) {
      notify(err.response?.data?.error || 'Error al crear el slot', false);
    } finally {
      setCreateSaving(false);
    }
  };

  // ── Reservar slot para paciente ───────────────────────────
  const handleBook = async (e) => {
    e.preventDefault();
    if (!bookSlot || !bookPatient) return;
    setBookSaving(true);
    try {
      await appointmentApi.book({ slotId: bookSlot.id, patientId: bookPatient });
      notify('✓ Cita reservada exitosamente');
      setBookSlot(null);
      setBookPatient('');
      loadSlots();
    } catch (err) {
      notify(err.response?.data?.error || 'Error al reservar', false);
    } finally {
      setBookSaving(false);
    }
  };

  // ── Cancelar cita ─────────────────────────────────────────
  const handleCancel = async (slotId) => {
    if (!window.confirm('¿Cancelar esta cita? El paciente recibirá una notificación.')) return;
    try {
      await appointmentApi.cancel(slotId);
      notify('✓ Cita cancelada');
      loadSlots();
    } catch (err) {
      notify(err.response?.data?.error || 'Error al cancelar', false);
    }
  };

  const slotsForDay = (date) =>
    slots.filter((s) => s.slot_date === format(date, 'yyyy-MM-dd'));

  return (
    <>
      {/* Stats + botón crear */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="grid grid-cols-3 gap-4 flex-1">
          <div className="card p-4 border-l-4 border-l-emerald-500">
            <p className="text-sm text-slate-500">Disponibles</p>
            <p className="text-2xl font-bold text-emerald-600">{slots.filter(s => s.status === 'available').length}</p>
          </div>
          <div className="card p-4 border-l-4 border-l-blue-500">
            <p className="text-sm text-slate-500">Reservadas</p>
            <p className="text-2xl font-bold text-blue-600">{slots.filter(s => s.status === 'booked').length}</p>
          </div>
          <div className="card p-4 border-l-4 border-l-slate-400">
            <p className="text-sm text-slate-500">Total semana</p>
            <p className="text-2xl font-bold text-slate-600">{slots.length}</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          <Icons.Plus className="w-4 h-4" /> Nuevo slot
        </button>
      </div>

      {/* Navegación semana */}
      <div className="flex items-center justify-between card p-4">
        <button onClick={() => setWeekStart(d => addDays(d, -7))} className="btn-secondary flex items-center gap-2">
          <Icons.ChevronLeft className="w-4 h-4" /> Anterior
        </button>
        <span className="text-lg font-semibold text-slate-900">
          {format(weekStart, 'd MMM', { locale: es })} — {format(addDays(weekStart, 4), 'd MMM yyyy', { locale: es })}
        </span>
        <button onClick={() => setWeekStart(d => addDays(d, 7))} className="btn-secondary flex items-center gap-2">
          Siguiente <Icons.ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <Toast msg={msg} onClose={() => {}} />

      {/* Calendario */}
      {loading ? (
        <div className="card p-12 flex items-center justify-center">
          <Icons.Spinner className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-3">
          {weekDays.map((day, dayIdx) => (
            <div key={day.toISOString()} className="slide-in-right" style={{ animationDelay: `${dayIdx * 50}ms` }}>
              <div className="card p-4 mb-3 text-center">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {format(day, 'EEE', { locale: es })}
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{format(day, 'd')}</p>
              </div>
              <div className="space-y-2">
                {slotsForDay(day).length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-xs">Sin slots</div>
                )}
                {slotsForDay(day).map((slot) => {
                  const cfg = STATUS_CONFIG[slot.status];
                  return (
                    <div
                      key={slot.id}
                      className={`card p-3 text-center transition-all ${cfg.bg} border ${cfg.border}
                        ${slot.status === 'available' ? 'cursor-pointer hover:shadow-lg hover:scale-105' : ''}`}
                      onClick={() => slot.status === 'available' && setBookSlot(slot)}
                    >
                      <p className={`font-bold text-sm ${cfg.text}`}>{slot.slot_time?.slice(0, 5)}</p>
                      <p className={`mt-1 text-xs font-medium ${cfg.text}`}>{cfg.label}</p>
                      {slot.patient_name && (
                        <p className="text-xs text-slate-500 mt-1 truncate">{slot.patient_name}</p>
                      )}
                      {slot.status === 'booked' && (
                        <div className="flex flex-col gap-2 mt-2">
                          <Link
                            to={`/records/${slot.id}`}
                            className="btn btn-primary text-xs w-full flex items-center justify-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Icons.FileText className="w-3 h-3" />
                            Relatoría
                          </Link>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCancel(slot.id); }}
                            className="btn-ghost text-xs w-full text-red-600 hover:bg-red-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: Crear slot ── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-elevated w-full max-w-sm scale-in p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Nuevo slot disponible</h2>
              <button onClick={() => setShowCreate(false)} className="btn-ghost">
                <Icons.X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-500 text-sm mb-6">Define la fecha y hora del horario disponible</p>

            <form onSubmit={handleCreateSlot} className="space-y-4">
              <div>
                <label className="text-label">Fecha</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  required
                  className="input-modern"
                />
              </div>
              <div>
                <label className="text-label">Hora</label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  required
                  className="input-modern"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createSaving}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {createSaving
                    ? <><Icons.Spinner className="w-4 h-4 animate-spin" /> Creando...</>
                    : <><Icons.Check className="w-4 h-4" /> Crear slot</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Reservar cita para paciente ── */}
      {bookSlot && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-elevated w-full max-w-sm scale-in p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Reservar cita</h2>
              <button onClick={() => { setBookSlot(null); setBookPatient(''); }} className="btn-ghost">
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-blue-900">
                {format(parseISO(bookSlot.slot_date), "EEEE d 'de' MMMM yyyy", { locale: es })}
              </p>
              <p className="text-sm text-blue-700">{bookSlot.slot_time?.slice(0, 5)} horas</p>
            </div>

            <form onSubmit={handleBook} className="space-y-4">
              <div>
                <label className="text-label">Paciente</label>
                <select
                  value={bookPatient}
                  onChange={(e) => setBookPatient(e.target.value)}
                  required
                  className="input-modern"
                >
                  <option value="">Seleccionar paciente...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setBookSlot(null); setBookPatient(''); }}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!bookPatient || bookSaving}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {bookSaving
                    ? <><Icons.Spinner className="w-4 h-4 animate-spin" /> Reservando...</>
                    : <><Icons.Check className="w-4 h-4" /> Confirmar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// VISTA PACIENTE
// ─────────────────────────────────────────────────────────────
function PatientView() {
  const [tab, setTab]                   = useState('available'); // 'available' | 'mine'
  const [availableSlots, setAvailable]  = useState([]);
  const [myAppointments, setMine]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [bookSaving, setBookSaving]     = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const { msg, notify }                 = useToast();

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [slotsRes, mineRes] = await Promise.all([
        appointmentApi.getSlots({ status: 'available' }),
        appointmentApi.mine(),
      ]);
      setAvailable(slotsRes.data.data ?? []);
      setMine(mineRes.data.data ?? []);
    } catch {
      notify('Error al cargar las citas', false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Reservar slot ─────────────────────────────────────────
  const handleBook = async (slot) => {
    setSelectedSlot(slot);
    setBookSaving(true);
    try {
      await appointmentApi.book({ slotId: slot.id });
      notify('✓ Cita reservada correctamente');
      setSelectedSlot(null);
      loadAll();
      setTab('mine');
    } catch (err) {
      notify(err.response?.data?.error || 'Error al reservar', false);
    } finally {
      setBookSaving(false);
    }
  };

  // ── Cancelar cita ─────────────────────────────────────────
  const handleCancel = async (slotId) => {
    if (!window.confirm('¿Cancelar esta cita?')) return;
    try {
      await appointmentApi.cancel(slotId);
      notify('✓ Cita cancelada');
      loadAll();
    } catch (err) {
      notify(err.response?.data?.error || 'Error al cancelar', false);
    }
  };

  const fmtDate = (d) => {
    try { return format(parseISO(d), "EEEE d 'de' MMMM yyyy", { locale: es }); }
    catch { return d; }
  };

  const booked    = myAppointments.filter(a => a.status === 'booked');
  const cancelled = myAppointments.filter(a => a.status === 'cancelled');

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 border-l-4 border-l-emerald-500">
          <p className="text-sm text-slate-500">Slots disponibles</p>
          <p className="text-2xl font-bold text-emerald-600">{availableSlots.length}</p>
        </div>
        <div className="card p-4 border-l-4 border-l-blue-500">
          <p className="text-sm text-slate-500">Mis citas activas</p>
          <p className="text-2xl font-bold text-blue-600">{booked.length}</p>
        </div>
        <div className="card p-4 border-l-4 border-l-slate-400">
          <p className="text-sm text-slate-500">Canceladas</p>
          <p className="text-2xl font-bold text-slate-500">{cancelled.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setTab('available')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors
            ${tab === 'available'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Horarios disponibles
          {availableSlots.length > 0 && (
            <span className="ml-2 bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {availableSlots.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('mine')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors
            ${tab === 'mine'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Mis citas
          {booked.length > 0 && (
            <span className="ml-2 bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {booked.length}
            </span>
          )}
        </button>
      </div>

      <Toast msg={msg} onClose={() => {}} />

      {loading ? (
        <div className="card p-12 flex items-center justify-center">
          <Icons.Spinner className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* ── Tab: Horarios disponibles ── */}
          {tab === 'available' && (
            availableSlots.length === 0 ? (
              <div className="card p-12 flex flex-col items-center gap-3">
                <Icons.Calendar className="w-12 h-12 text-slate-300" />
                <p className="text-slate-500 font-medium">No hay horarios disponibles</p>
                <p className="text-sm text-slate-400 text-center">
                  El médico publicará los horarios disponibles próximamente.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableSlots.map((slot, idx) => (
                  <div
                    key={slot.id}
                    className="card p-5 border-l-4 border-l-emerald-400 bg-emerald-50/30 hover:shadow-md transition-all slide-in-right"
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <Icons.Calendar className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 capitalize">{fmtDate(slot.slot_date)}</p>
                          <p className="text-slate-500 text-sm">{slot.slot_time?.slice(0, 5)} horas</p>
                          <span className="inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                            Disponible
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleBook(slot)}
                        disabled={bookSaving && selectedSlot?.id === slot.id}
                        className="btn-primary flex items-center gap-2 text-sm"
                      >
                        {bookSaving && selectedSlot?.id === slot.id
                          ? <><Icons.Spinner className="w-4 h-4 animate-spin" /> Reservando...</>
                          : <><Icons.Check className="w-4 h-4" /> Reservar</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Tab: Mis citas ── */}
          {tab === 'mine' && (
            myAppointments.length === 0 ? (
              <div className="card p-12 flex flex-col items-center gap-3">
                <Icons.Calendar className="w-12 h-12 text-slate-300" />
                <p className="text-slate-500 font-medium">No tienes citas registradas</p>
                <button
                  onClick={() => setTab('available')}
                  className="btn-primary mt-2 flex items-center gap-2"
                >
                  <Icons.Calendar className="w-4 h-4" /> Ver horarios disponibles
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myAppointments.map((appt, idx) => {
                  const cfg = STATUS_CONFIG[appt.status];
                  return (
                    <div
                      key={appt.id}
                      className={`card p-5 border-l-4 ${cfg.border} slide-in-right`}
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                            <Icons.Calendar className={`w-6 h-6 ${cfg.text}`} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 capitalize">{fmtDate(appt.slot_date)}</p>
                            <p className="text-slate-500 text-sm">{appt.slot_time?.slice(0, 5)} horas</p>
                            <span className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                              {cfg.label}
                            </span>
                          </div>
                        </div>
                        {appt.status === 'booked' && (
                          <button
                            onClick={() => handleCancel(appt.id)}
                            className="btn-ghost text-red-600 hover:bg-red-50 flex items-center gap-2 text-sm"
                          >
                            <Icons.X className="w-4 h-4" /> Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────
export default function AppointmentsPage() {
  const { isDoctor } = useAuth();

  return (
    <Layout title={isDoctor ? 'Gestión de Citas' : 'Mis Citas'}>
      <div className="space-y-6 max-w-6xl">
        {isDoctor ? <DoctorView /> : <PatientView />}
      </div>
    </Layout>
  );
}