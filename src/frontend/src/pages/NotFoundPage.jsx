import { Link } from 'react-router-dom';
import { Icons } from '../components/shared/Icons';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center px-4">
      {/* Decoración */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
      </div>

      <div className="relative z-10 text-center">
        <div className="mb-8 scale-in">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg mb-6">
            <span className="text-5xl">404</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Página no encontrada</h1>
          <p className="text-slate-600 mb-8">Lo sentimos, no podemos encontrar lo que buscas</p>
        </div>

        <div className="space-y-4">
          <Link 
            to="/dashboard" 
            className="btn-primary inline-flex items-center gap-2 mb-4"
          >
            <Icons.Home className="w-5 h-5" />
            Volver al inicio
          </Link>
          
          <div className="text-sm text-slate-500">
            <p>¿Necesitas ayuda? Contacta con soporte</p>
          </div>
        </div>
      </div>
    </div>
  );
}
