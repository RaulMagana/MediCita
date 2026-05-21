/**
 * pages/LoginPage.jsx
 * Página de inicio de sesión moderna y minimalista.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icons } from '../components/shared/Icons';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [form, setForm]     = useState({ username: '', password: '' });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!form.username.trim()) {
      newErrors.username = 'El usuario es requerido';
    } else if (form.username.length < 3) {
      newErrors.username = 'El usuario debe tener al menos 3 caracteres';
    }
    
    if (!form.password.trim()) {
      newErrors.password = 'La contraseña es requerida';
    } else if (form.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      // Obtener el mensaje de error del backend
      let errorMessage = '';
      let fieldError = null;
      
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        // Errores de validación
        const validationErrs = err.response.data.errors;
        validationErrs.forEach(ve => {
          if (ve.param === 'username') {
            fieldError = { username: ve.msg };
          } else if (ve.param === 'password') {
            fieldError = { password: ve.msg };
          }
        });
        if (fieldError) {
          setErrors(fieldError);
          setLoading(false);
          return;
        }
        errorMessage = validationErrs[0]?.msg || 'Error en la validación';
      } else if (err.response?.status === 400) {
        errorMessage = 'Usuario o contraseña incorrectos';
      } else if (err.response?.status === 401) {
        errorMessage = 'Credenciales inválidas';
      } else if (err.response?.status === 404) {
        errorMessage = 'Usuario no encontrado';
      } else {
        errorMessage = err.message || 'Error al iniciar sesión';
      }

      // Mapear mensajes específicos del backend
      if (errorMessage.toLowerCase().includes('credenciales')) {
        setErrors({ general: 'Usuario o contraseña incorrectos' });
      } else if (errorMessage.toLowerCase().includes('deshabilitada') || errorMessage.toLowerCase().includes('disabled')) {
        setErrors({ general: 'Tu cuenta ha sido deshabilitada' });
      } else {
        setErrors({ general: errorMessage || 'Error al iniciar sesión' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center px-4 relative">
      {/* Decoración de fondo mejorada */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-80 h-80 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-15" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="fade-in">
          {/* Card Principal */}
          <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-blue-200/50 hover:shadow-blue-500/20 transition-all duration-300">
            {/* Logo / Branding */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 mb-4 shadow-lg">
                <Icons.Calendar className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                MediCita
              </h1>
              <p className="text-slate-500 text-sm mt-2">Sistema de gestión de citas médicas</p>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {errors.general && (
                <div className="fade-in bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-3">
                  <Icons.AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{errors.general}</p>
                </div>
              )}

              {/* Usuario */}
              <div>
                <label className="text-label">Usuario</label>
                <div className="relative">
                  <Icons.Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    required
                    className={`input-modern pl-10 ${errors.username ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                    placeholder="tu.usuario"
                    autoComplete="username"
                  />
                </div>
                {errors.username && (
                  <p className="text-red-600 text-xs mt-1.5 flex items-center gap-1">
                    <Icons.AlertCircle className="w-3.5 h-3.5" />
                    {errors.username}
                  </p>
                )}
              </div>

              {/* Contraseña */}
              <div>
                <label className="text-label">Contraseña</label>
                <div className="relative">
                  <Icons.Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    className={`input-modern pl-10 ${errors.password ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
                {errors.password && (
                  <p className="text-red-600 text-xs mt-1.5 flex items-center gap-1">
                    <Icons.AlertCircle className="w-3.5 h-3.5" />
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Botón Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 font-semibold flex items-center justify-center gap-2 mt-6"
              >
                {loading ? (
                  <>
                    <Icons.Spinner className="w-5 h-5 animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  'Ingresar'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-500">O bien</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Enlace a Registro */}
            <p className="text-center text-slate-600 text-sm">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                Regístrate aquí
              </Link>
            </p>
          </div>

          {/* Info Footer */}
          <div className="mt-6 text-center text-xs text-slate-500">
            <p>Demo: usuario: <span className="font-mono bg-slate-100 px-2 py-1 rounded">doctor</span> / <span className="font-mono bg-slate-100 px-2 py-1 rounded">patient</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
