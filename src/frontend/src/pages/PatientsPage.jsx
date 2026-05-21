/**
 * pages/PatientsPage.jsx
 * Lista y gestión de pacientes (solo médico).
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/shared/Layout';
import { patientApi } from '../services/api';

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
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`¿Desactivar la cuenta de ${name}?`)) return;
    try {
      await patientApi.deactivate(id);
      setMsg(`✅ ${name} desactivado`);
      load();
    } catch { setMsg('❌ Error al desactivar'); }
  };

  const sexLabel = { M: 'Masculino', F: 'Femenino', O: 'Otro' };

  return (
    <Layout title="Pacientes">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Buscar por nombre o correo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <span className="text-sm text-slate-500">{filtered.length} paciente(s)</span>
        </div>

        {msg && (
          <div className="text-sm px-4 py-2 rounded-lg bg-slate-100 text-slate-700">
            {msg} <button onClick={() => setMsg('')} className="ml-2 text-slate-400">✕</button>
          </div>
        )}

        {loading ? (
          <p className="text-slate-500 text-sm">Cargando...</p>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Correo</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Teléfono</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Sexo</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{p.full_name}</td>
                    <td className="px-4 py-3 text-slate-600">{p.email}</td>
                    <td className="px-4 py-3 text-slate-600">{p.phone || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{sexLabel[p.sex] || p.sex}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/history/${p.id}`}
                          className="text-teal-600 hover:text-teal-800 text-xs font-medium"
                        >
                          Historial
                        </Link>
                        <button
                          onClick={() => handleDeactivate(p.id, p.full_name)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          Desactivar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">
                      No se encontraron pacientes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
