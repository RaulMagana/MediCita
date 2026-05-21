/**
 * pages/RegisterPage.jsx
 * Registro de nuevo paciente.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../services/api';

const INITIAL = {
  username: '', password: '', confirmPassword: '',
  fullName: '', address: '', email: '', phone: '',
  birthDate: '', sex: '',
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm]     = useState(INITIAL);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      return setError('Las contraseñas no coinciden');
    }
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = form;
      await authApi.register(payload);
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  const field = (name, label, type = 'text', opts = {}) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type} name={name} value={form[name]} onChange={handleChange}
        required
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                   focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        {...opts}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-800">Crear cuenta</h1>
            <p className="text-slate-500 text-sm">MediCita — Registro de paciente</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {field('username', 'Nombre de usuario')}
              {field('email', 'Correo electrónico', 'email')}
            </div>
            {field('fullName', 'Nombre completo')}
            {field('address', 'Dirección')}

            <div className="grid grid-cols-2 gap-4">
              {field('phone', 'Teléfono', 'tel')}
              {field('birthDate', 'Fecha de nacimiento', 'date')}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sexo</label>
              <select
                name="sex" value={form.sex} onChange={handleChange} required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Seleccionar...</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="O">Otro</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {field('password', 'Contraseña', 'password', { placeholder: 'Mín. 8 caracteres' })}
              {field('confirmPassword', 'Confirmar contraseña', 'password')}
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-60
                         text-white font-medium py-2.5 rounded-lg transition-colors text-sm mt-2"
            >
              {loading ? 'Registrando...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-4">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-teal-600 font-medium hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
