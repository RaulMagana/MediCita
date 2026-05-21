/**
 * pages/PatientsPage.jsx
 * Lista y gestión de pacientes (solo médico) con diseño moderno.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { patientApi } from '../services/api';
import { Icons } from '../components/shared/Icons';

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [msg, setMsg]           = useState('');

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

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`¿Desactivar la cuenta de ${name}?`)) return;
    try {
      await patientApi.deactivate(id);
      setMsg(`${name} ha sido desactivado`);
      load();
      setTimeout(() => setMsg(''), 3000);
    } catch { 
      setMsg('Error al desactivar');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const sexLabel = { M: 'Masculino', F: 'Femenino', O: 'Otro' };

  return (
    <Layout title="Gestión de Pacientes">
      <div className="space-y-6 max-w-6xl">
        {/* Header con búsqueda */}
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

        {/* Mensajes */}
        {msg && (
          <div className="fade-in card p-4 bg-emerald-50 border-l-4 border-l-emerald-500 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icons.Check className="w-5 h-5 text-emerald-600" />
              <p className="text-emerald-900 font-medium">{msg}</p>
            </div>
            <button onClick={() => setMsg('')} className="btn-ghost">
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
                            <p className="text-xs text-slate-500">ID: {p.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-600">{p.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-600">{p.phone || '—'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="badge badge-info">
                          {sexLabel[p.sex] || p.sex}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            to={`/history/${p.id}`}
                            title="Ver historial"
                            className="btn-ghost flex items-center gap-2"
                          >
                            <Icons.FileText className="w-4 h-4" />
                            <span className="hidden sm:inline text-sm">Historial</span>
                          </Link>
                          <button
                            onClick={() => handleDeactivate(p.id, p.full_name)}
                            title="Desactivar"
                            className="btn-ghost text-red-600 hover:bg-red-50"
                          >
                            <Icons.X className="w-4 h-4" />
                            <span className="hidden sm:inline text-sm">Desactivar</span>
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
    </Layout>
  );
}
