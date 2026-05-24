/**
 * pages/RegisterPage.jsx
 * Registro de nuevo paciente con diseño moderno.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../services/api';
import { Icons } from '../components/shared/Icons';

const INITIAL = {
  username: '', password: '', confirmPassword: '',
  fullName: '', address: '', email: '', phone: '',
  birthDate: '', sex: '',
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm]     = useState(INITIAL);
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateStep = (stepNum) => {
    const newErrors = {};

    if (stepNum === 1) {
      if (!form.username.trim()) {
        newErrors.username = 'El usuario es requerido';
      } else if (form.username.length < 3) {
        newErrors.username = 'El usuario debe tener al menos 3 caracteres';
      } else if (!/^[a-zA-Z0-9_.-]+$/.test(form.username)) {
        newErrors.username = 'Solo se permiten letras, números, punto y guion';
      }

      if (!form.email.trim()) {
        newErrors.email = 'El email es requerido';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        newErrors.email = 'El email no es válido';
      }

      if (!form.password) {
        newErrors.password = 'La contraseña es requerida';
      } else if (form.password.length < 8) {
        newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
      } else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(form.password)) {
        newErrors.password = 'Debe incluir al menos una letra y un número';
      }

      if (!form.confirmPassword) {
        newErrors.confirmPassword = 'Confirma tu contraseña';
      } else if (form.password !== form.confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
      }
    } else if (stepNum === 2) {
      if (!form.fullName.trim()) {
        newErrors.fullName = 'El nombre es requerido';
      } else if (form.fullName.length < 3) {
        newErrors.fullName = 'El nombre debe tener al menos 3 caracteres';
      }

      if (!form.phone.trim()) {
        newErrors.phone = 'El teléfono es requerido';
      } else if (!/^\d{7,}$/.test(form.phone.replace(/[\s\-().+]/g, ''))) {
        newErrors.phone = 'El teléfono debe tener al menos 7 dígitos';
      }

      if (!form.birthDate) {
        newErrors.birthDate = 'La fecha de nacimiento es requerida';
      }

      if (!form.sex) {
        newErrors.sex = 'El género es requerido';
      }

      if (!form.address.trim()) {
        newErrors.address = 'La dirección es requerida';
      }
    }

    return newErrors;
  };

  // ── El botón "Continuar" envía el form → handleNextStep valida antes de avanzar
  const handleNextStep = (e) => {
    e.preventDefault();
    const validationErrors = validateStep(1);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateStep(2);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = form;
      await authApi.register(payload);
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      let errorMessage = '';

      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        errorMessage = err.response.data.errors[0]?.msg || 'Error en la validación';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else {
        errorMessage = err.message || 'Error al registrar';
      }

      // Si el conflicto es de usuario/correo, volver al paso 1 con el error marcado
      const msg = errorMessage.toLowerCase();
      if (msg.includes('usuario') || msg.includes('username')) {
        setErrors({ username: 'Este nombre de usuario ya existe' });
        setStep(1);
      } else if (msg.includes('correo') || msg.includes('email')) {
        setErrors({ email: 'Este correo ya está registrado' });
        setStep(1);
      } else {
        setErrors({ general: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  const field = (name, label, type = 'text', opts = {}) => (
    <div>
      <label className="text-label">{label}</label>
      <input
        type={type}
        name={name}
        value={form[name]}
        onChange={handleChange}
        required
        className={`input-modern ${errors[name] ? 'border-red-500 ring-1 ring-red-500' : ''}`}
        {...opts}
      />
      {errors[name] && (
        <p className="text-red-600 text-xs mt-1.5 flex items-center gap-1">
          <Icons.AlertCircle className="w-3.5 h-3.5" />
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-10 px-4 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse" />
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        <div className="fade-in">
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-blue-200/50 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white">
              <h1 className="text-3xl font-bold">Crear cuenta</h1>
              <p className="text-blue-100 text-sm mt-1">Regístrate en MediCita</p>
            </div>

            <div className="p-8">
              {/* Progress */}
              <div className="mb-8">
                <div className="flex gap-2">
                  {[1, 2].map((s) => (
                    <div key={s} className="flex-1">
                      <div className={`h-1 rounded-full transition-all ${s <= step ? 'bg-blue-600' : 'bg-slate-200'}`} />
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <p className="text-sm text-slate-600">
                    Paso {step} de 2: {step === 1 ? 'Datos de acceso' : 'Información personal'}
                  </p>
                </div>
              </div>

              {/* Error general (siempre visible en ambos pasos) */}
              {errors.general && (
                <div className="fade-in mb-6 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-3">
                  <Icons.AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{errors.general}</p>
                </div>
              )}

              {/* ── PASO 1: Datos de acceso ── */}
              {step === 1 && (
                <form onSubmit={handleNextStep} className="space-y-5">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-700">Necesitaremos algunos datos para crear tu cuenta segura.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {field('username', 'Nombre de usuario')}
                    {field('email', 'Correo electrónico', 'email')}
                  </div>

                  <div>
                    <label className="text-label">Contraseña</label>
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      required
                      className={`input-modern ${errors.password ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                      placeholder="Mín. 8 caracteres"
                    />
                    {errors.password && (
                      <p className="text-red-600 text-xs mt-1.5 flex items-center gap-1">
                        <Icons.AlertCircle className="w-3.5 h-3.5" />
                        {errors.password}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">Debe incluir al menos una letra y un número.</p>
                  </div>

                  <div>
                    <label className="text-label">Confirmar contraseña</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      required
                      className={`input-modern ${errors.confirmPassword ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                    />
                    {errors.confirmPassword && (
                      <p className="text-red-600 text-xs mt-1.5 flex items-center gap-1">
                        <Icons.AlertCircle className="w-3.5 h-3.5" />
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Link to="/login" className="btn-secondary flex-1 text-center">
                      Volver
                    </Link>
                    {/* type="submit" para que pase por handleNextStep con validación */}
                    <button type="submit" className="btn-primary flex-1">
                      Continuar
                    </button>
                  </div>

                  <p className="text-center text-sm text-slate-500 mt-6">
                    ¿Ya tienes cuenta?{' '}
                    <Link to="/login" className="text-blue-600 font-semibold hover:text-blue-700">
                      Inicia sesión
                    </Link>
                  </p>
                </form>
              )}

              {/* ── PASO 2: Información personal ── */}
              {step === 2 && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-700">Completa tu información de perfil.</p>
                  </div>

                  {field('fullName', 'Nombre completo')}

                  <div className="grid grid-cols-2 gap-4">
                    {field('phone', 'Teléfono', 'tel')}
                    {field('birthDate', 'Fecha de nacimiento', 'date')}
                  </div>

                  {field('address', 'Dirección')}

                  <div>
                    <label className="text-label">Sexo</label>
                    <select
                      name="sex"
                      value={form.sex}
                      onChange={handleChange}
                      required
                      className={`input-modern ${errors.sex ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                      <option value="O">Otro</option>
                    </select>
                    {errors.sex && (
                      <p className="text-red-600 text-xs mt-1.5 flex items-center gap-1">
                        <Icons.AlertCircle className="w-3.5 h-3.5" />
                        {errors.sex}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                      Atrás
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Icons.Spinner className="w-5 h-5 animate-spin" />
                          Registrando...
                        </>
                      ) : (
                        'Crear cuenta'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
