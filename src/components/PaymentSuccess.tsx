import React, { useEffect, useState } from 'react';
import { CheckCircle, Loader2, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function PaymentSuccess() {
  const { userData, user } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (!sessionId) {
      setError('No se encontró ID de sesión');
      setIsVerifying(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsVerifying(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleGoToApp = () => {
    window.location.href = '/';
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md w-full">
          <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Verificando tu pago...
          </h2>
          <p className="text-gray-600">
            Por favor, espera mientras confirmamos tu suscripción
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md w-full">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
            <span className="text-4xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Error al verificar el pago
          </h2>
          <p className="text-gray-600 mb-8">{error}</p>
          <button
            onClick={handleGoToApp}
            className="w-full bg-gray-900 text-white font-semibold py-3 px-6 rounded-xl hover:bg-gray-800 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md w-full">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          ¡Pago exitoso!
        </h1>

        <p className="text-lg text-gray-600 mb-8">
          Tu suscripción ha sido activada correctamente
        </p>

        {userData && (
          <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
            <h3 className="font-semibold text-gray-900 mb-3">Detalles de tu suscripción</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Plan:</span>
                <span className="font-semibold text-gray-900">
                  Tier {userData.subscription_tier}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Dispositivos:</span>
                <span className="font-semibold text-gray-900">
                  {userData.max_devices} {userData.max_devices === 1 ? 'dispositivo' : 'dispositivos'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-semibold text-gray-900 truncate ml-2">
                  {user?.email}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleGoToApp}
            className="w-full bg-green-600 text-white font-semibold py-4 px-6 rounded-xl hover:bg-green-700 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
          >
            <Home className="h-5 w-5" />
            Ir a la Calculadora
          </button>

          <p className="text-xs text-gray-500 mt-4">
            Recibirás un email de confirmación con los detalles de tu suscripción
          </p>
        </div>
      </div>
    </div>
  );
}
