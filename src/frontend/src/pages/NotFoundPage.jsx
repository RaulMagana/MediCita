import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl font-bold text-slate-200 mb-4">404</p>
        <h1 className="text-xl font-semibold text-slate-700 mb-2">Página no encontrada</h1>
        <Link to="/dashboard" className="text-teal-600 hover:underline text-sm">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
