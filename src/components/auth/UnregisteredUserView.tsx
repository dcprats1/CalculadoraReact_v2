import React from 'react';
import { Calculator, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';

interface UnregisteredUserViewProps {
  email: string;
  onViewPricing: () => void;
  onBackToLogin: () => void;
}

export function UnregisteredUserView({ email, onViewPricing, onBackToLogin }: UnregisteredUserViewProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-2xl mb-4">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Usuario No Registrado
            </h1>
            <p className="text-sm text-gray-600 mb-4">
              El email <span className="font-semibold text-gray-900">{email}</span> no está dado de alta en el sistema
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              ¿Por qué elegir nuestra calculadora?
            </h2>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <span><strong>Precisión Total:</strong> Cálculos exactos incluyendo costes ocultos e incrementos</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <span><strong>Ahorro Inmediato:</strong> Recupera tu inversión en días con un solo uso diario</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <span><strong>Comparativa Competitiva:</strong> Genera propuestas profesionales en minutos</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <span><strong>Multi-dispositivo:</strong> Accede desde todos tus dispositivos</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={onViewPricing}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg"
            >
              Ver Planes y Precios
              <ArrowRight className="h-5 w-5" />
            </button>

            <button
              onClick={onBackToLogin}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              <ArrowLeft className="h-5 w-5" />
              Volver al Login
            </button>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-600 text-center">
              <strong>¿Ya tienes una cuenta?</strong> Si crees que esto es un error, contacta con el administrador en{' '}
              <a href="mailto:dcprats@gmail.com" className="text-blue-600 hover:underline">
                dcprats@gmail.com
              </a>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Lógica Logística. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
