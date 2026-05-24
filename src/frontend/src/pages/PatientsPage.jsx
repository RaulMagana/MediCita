/**
 * pages/PatientsPage.jsx
 * Lista y gestión de pacientes (solo médico) — con edición de datos.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { patientApi } from '../services/api';
import { Icons } from '../components/shared/Icons';

const SEX_LABEL = { M: 'Masculino', F: 'Femenino', O: 'Otro' };

export default function PatientsPage() {
  const [patients, setPatients]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [msg, setMsg]             = useState({ text: '', ok: true });

  // ── Estado del modal de edición
  const [editTarget, setEditTarget] = useState(null); // paciente en edición
  const [editForm, setEditForm]     = useState({});
  const [saving, setSaving]         = useState(false);
  const [editErrors, setEditErrors] = useState({});

  const notify = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg({ text: '' }), 3500); };

  const load = () => {
    patientApi.list()
      .then(({ data }) => setPatients(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = patients.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    (p.phone && p.phone.includes(search))
  );

  // ── Abrir modal de edición
  const openEdit = (p) => {
    setEditTarget(p);
    setEditForm({
      fullName:  p.full_name  || '',
      address:   p.address    || '',
      phone:     p.phone      || '',
      birthDate: p.birth_date ? p.birth_date.slice(0, 10) : '',
      sex:       p.sex        || '',
    });
    setEditErrors({});
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
    if (editErrors[name]) setEditErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateEdit = () => {
    const errs = {};
    if (!editForm.fullName.trim()) errs.fullName = 'El nombre es requerido';
    if (!editForm.phone.trim())    errs.phone    = 'El teléfono es requerido';
    if (!editForm.birthDate)       errs.birthDate = 'La fecha de nacimiento es requerida';
    if (!editForm.sex)             errs.sex      = 'El sexo es requerido';
    if (!editForm.address.trim())  errs.address  = 'La dirección es requerida';
    return errs;
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    const errs = validateEdit();
    if (Object.keys(errs).length > 0) { setEditErrors(errs); return; }

    setSaving(true);
    try {
      await patientApi.update(editTarget.id, editForm);
      notify('✓ Datos actualizados correctamente');
      setEditTarget(null);
      load();
    } catch (err) {
      notify(err.response?.data?.error || 'Error al guardar', false);
    } finally {
      setSaving(false);
    }
  };

  // ── Desactivar paciente
  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`¿Desactivar la cuenta de ${name}? El paciente ya no podrá iniciar sesión.`)) return;
    try {
      await patientApi.deactivate(id);
      notify(`${name} ha sido desactivado`);
      load();
    } catch {
      notify('Error al desactivar', false);
    }
  };

  return (
    <Layout title="Gestión de Pacientes">
      <div className="space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg text-slate-500">Total de pacientes</h2>
            <p className="text-3xl font-bold text-slate-900 mt-1">{filtered.length}</p>
          </div>
          <div className="relative md:w-80">
            <Icons.Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, correo o teléfono…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-modern pl-10"
            />
          </div>
        </div>

        {/* Mensaje */}
        {msg.text && (
          <div className={`fade-in card p-4 border-l-4 flex items-center justify-between
            ${msg.ok ? 'bg-emerald-50 border-l-emerald-500' : 'bg-red-50 border-l-red-500'}`}>
            <div className="flex items-center gap-3">
              {msg.ok
                ? <Icons.Check className="w-5 h-5 text-emerald-600" />
                : <Icons.AlertCircle className="w-5 h-5 text-red-500" />}
              <p className={`font-medium ${msg.ok ? 'text-emerald-900' : 'text-red-900'}`}>{msg.text}</p>
            </div>
            <button onClick={() => setMsg({ text: '' })} className="btn-ghost">
              <Icons.X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tabla */}
        {loading ? (
          <div className="card p-12 flex items-center justify-center">
            <Icons.Spinner className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="card overflow-hidden border-0 shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-4 font-semibold text-slate-900">Nombre</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-900">Correo</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-900">Teléfono</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-900">Sexo</th>
                    <th className="text-center px-6 py-4 font-semibold text-slate-900">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.map((p, idx) => (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50 transition-colors duration-200 slide-in-right"
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600
                                          flex items-center justify-center text-white font-bold text-sm">
                            {p.full_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{p.full_name}</p>
                            <p className="text-xs text-slate-500">@{p.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-sm">{p.email}</td>
                      <td className="px-6 py-4 text-slate-600 text-sm">{p.phone || '—'}</td>
                      <td className="px-6 py-4">
                        <span className="badge badge-info">{SEX_LABEL[p.sex] || p.sex}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            to={`/history/${p.id}`}
                            title="Ver historial"
                            className="btn-ghost flex items-center gap-1 text-sm"
                          >
                            <Icons.FileText className="w-4 h-4" />
                            <span className="hidden sm:inline">Historial</span>
                          </Link>
                          <button
                            onClick={() => openEdit(p)}
                            title="Editar datos"
                            className="btn-ghost flex items-center gap-1 text-sm text-blue-600 hover:bg-blue-50"
                          >
                            <Icons.Settings className="w-4 h-4" />
                            <span className="hidden sm:inline">Editar</span>
                          </button>
                          <button
                            onClick={() => handleDeactivate(p.id, p.full_name)}
                            title="Desactivar"
                            className="btn-ghost flex items-center gap-1 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Icons.X className="w-4 h-4" />
                            <span className="hidden sm:inline">Desactivar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Icons.Users className="w-12 h-12 text-slate-300" />
                          <p className="text-slate-500">No se encontraron pacientes</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal de edición ── */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-elevated w-full max-w-lg scale-in">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Editar paciente</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{editTarget.full_name}</p>
                </div>
                <button onClick={() => setEditTarget(null)} className="btn-ghost">
                  <Icons.X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSave} className="space-y-4">
                {/* Nombre completo */}
                <div>
                  <label className="text-label">Nombre completo</label>
                  <input
                    type="text"
                    name="fullName"
                    value={editForm.fullName}
                    onChange={handleEditChange}
                    className={`input-modern ${editErrors.fullName ? 'border-red-500' : ''}`}
                    required
                  />
                  {editErrors.fullName && <p className="text-red-600 text-xs mt-1">{editErrors.fullName}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Teléfono */}
                  <div>
                    <label className="text-label">Teléfono</label>
                    <input
                      type="tel"
                      name="phone"
                      value={editForm.phone}
                      onChange={handleEditChange}
                      className={`input-modern ${editErrors.phone ? 'border-red-500' : ''}`}
                      required
                    />
                    {editErrors.phone && <p className="text-red-600 text-xs mt-1">{editErrors.phone}</p>}
                  </div>

                  {/* Fecha de nacimiento */}
                  <div>
                    <label className="text-label">Fecha de nacimiento</label>
                    <input
                      type="date"
                      name="birthDate"
                      value={editForm.birthDate}
                      onChange={handleEditChange}
                      className={`input-modern ${editErrors.birthDate ? 'border-red-500' : ''}`}
                      required
                    />
                    {editErrors.birthDate && <p className="text-red-600 text-xs mt-1">{editErrors.birthDate}</p>}
                  </div>
                </div>

                {/* Dirección */}
                <div>
                  <label className="text-label">Dirección</label>
                  <input
                    type="text"
                    name="address"
                    value={editForm.address}
                    onChange={handleEditChange}
                    className={`input-modern ${editErrors.address ? 'border-red-500' : ''}`}
                    required
                  />
                  {editErrors.address && <p className="text-red-600 text-xs mt-1">{editErrors.address}</p>}
                </div>

                {/* Sexo */}
                <div>
                  <label className="text-label">Sexo</label>
                  <select
                    name="sex"
                    value={editForm.sex}
                    onChange={handleEditChange}
                    className={`input-modern ${editErrors.sex ? 'border-red-500' : ''}`}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="O">Otro</option>
                  </select>
                  {editErrors.sex && <p className="text-red-600 text-xs mt-1">{editErrors.sex}</p>}
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditTarget(null)} className="btn-secondary flex-1">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <><Icons.Spinner className="w-4 h-4 animate-spin" /> Guardando...</>
                    ) : (
                      <><Icons.Check className="w-4 h-4" /> Guardar cambios</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}