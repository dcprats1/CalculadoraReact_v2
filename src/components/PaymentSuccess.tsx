import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Loader2, Home, AlertCircle, RefreshCw, Mail } from 'lucide-react';

interface ActivationStatus {
  status: 'pending' | 'active' | 'error' | 'timeout';
  message: string;
  user?: {
    id: string;
    email: string;
    subscription_tier: number;
    max_devices: number;
  };
  error?: string;
}

const MOTIVATIONAL_MESSAGES = [
  "Todo va bien, solo unos segundos más...",
  "Configurando tu suscripción...",
  "Activando tu cuenta...",
  "Preparando tus dispositivos...",
  "Casi listo, últimos ajustes...",
  "Verificando tu pago con Stripe...",
  "Creando tu perfil de usuario...",
  "Sincronizando tus datos...",
];

const PHASE_MESSAGES = [
  { time: 0, message: "Procesando tu pago con Stripe...", progress: 25 },
  { time: 30, message: "Confirmando pago y creando tu cuenta...", progress: 50 },
  { time: 60, message: "Activando tu suscripción en nuestros servidores...", progress: 75 },
  { time: 90, message: "Casi listo, últimos ajustes...", progress: 90 },
];

export function PaymentSuccess() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ActivationStatus | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentMotivationalMessage, setCurrentMotivationalMessage] = useState(0);
  const [sessionId, setSessionId] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  const MAX_WAIT_TIME = 120;
  const POLL_INTERVAL = 3000;
  const MESSAGE_ROTATION_INTERVAL = 8000;

  const getCurrentPhase = (time: number) => {
    for (let i = PHASE_MESSAGES.length - 1; i >= 0; i--) {
      if (time >= PHASE_MESSAGES[i].time) {
        return PHASE_MESSAGES[i];
      }
    }
    return PHASE_MESSAGES[0];
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdParam = urlParams.get('session_id');
    const emailParam = urlParams.get('email');

    if (!sessionIdParam) {
      setStatus({
        status: 'error',
        message: 'No se encontró ID de sesión',
        error: 'Falta el parámetro session_id en la URL'
      });
      setIsVerifying(false);
      return;
    }

    if (!emailParam) {
      setStatus({
        status: 'error',
        message: 'No se encontró email',
        error: 'Falta el parámetro email en la URL'
      });
      setIsVerifying(false);
      return;
    }

    setSessionId(sessionIdParam);
    setEmail(emailParam);

    const pendingActivation = {
      email: emailParam,
      sessionId: sessionIdParam,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('pending_activation', JSON.stringify(pendingActivation));

  }, []);

  useEffect(() => {
    if (!email || !isVerifying) return;

    const checkActivationStatus = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-user-activation-status?email=${encodeURIComponent(email)}&session_id=${encodeURIComponent(sessionId)}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const data = await response.json();

        if (data.status === 'active') {
          setStatus({
            status: 'active',
            message: data.message,
            user: data.user
          });
          setIsVerifying(false);

          localStorage.removeItem('pending_activation');
          localStorage.setItem('recently_activated', JSON.stringify({
            email: email,
            timestamp: new Date().toISOString()
          }));

          setTimeout(() => {
            navigate('/');
          }, 2000);
        } else if (data.status === 'pending') {
          setStatus({
            status: 'pending',
            message: data.message
          });
        } else {
          setStatus({
            status: 'error',
            message: data.message || 'Error al verificar activación',
            error: data.error
          });
        }
      } catch (error) {
        console.error('Error checking activation status:', error);
        setStatus({
          status: 'error',
          message: 'Error de conexión',
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    };

    checkActivationStatus();

    const pollInterval = setInterval(() => {
      if (elapsedTime < MAX_WAIT_TIME) {
        checkActivationStatus();
      }
    }, POLL_INTERVAL);

    return () => clearInterval(pollInterval);
  }, [email, sessionId, isVerifying, elapsedTime, navigate]);

  useEffect(() => {
    if (!isVerifying) return;

    const timeInterval = setInterval(() => {
      setElapsedTime(prev => {
        const newTime = prev + 1;
        if (newTime >= MAX_WAIT_TIME) {
          setIsVerifying(false);
          setStatus({
            status: 'timeout',
            message: 'El proceso de activación está tardando más de lo esperado',
            error: 'Timeout después de 120 segundos'
          });
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timeInterval);
  }, [isVerifying]);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setCurrentMotivationalMessage(prev => (prev + 1) % MOTIVATIONAL_MESSAGES.length);
    }, MESSAGE_ROTATION_INTERVAL);

    return () => clearInterval(messageInterval);
  }, []);

  const handleRetry = () => {
    setIsVerifying(true);
    setElapsedTime(0);
    setStatus(null);
  };

  const handleGoToLogin = () => {
    localStorage.removeItem('pending_activation');
    localStorage.setItem('recently_activated', JSON.stringify({
      email: email,
      timestamp: new Date().toISOString()
    }));
    navigate('/');
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent('Problema con activación de cuenta');
    const body = encodeURIComponent(
      `Hola,\n\nHe completado el pago pero mi cuenta no se ha activado.\n\nDetalles:\n- Email: ${email}\n- Session ID: ${sessionId}\n- Timestamp: ${new Date().toISOString()}\n\nPor favor, ayúdenme a resolver este problema.\n\nGracias.`
    );
    window.location.href = `mailto:dcprats@gmail.com?subject=${subject}&body=${body}`;
  };

  if (status?.status === 'active') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md w-full">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6 animate-bounce">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            ¡Cuenta activada!
          </h1>

          <p className="text-lg text-gray-600 mb-8">
            Tu suscripción está lista. Redirigiendo al login...
          </p>

          {status.user && (
            <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
              <h3 className="font-semibold text-gray-900 mb-3">Detalles de tu suscripción</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan:</span>
                  <span className="font-semibold text-gray-900">
                    Tier {status.user.subscription_tier}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dispositivos:</span>
                  <span className="font-semibold text-gray-900">
                    {status.user.max_devices} {status.user.max_devices === 1 ? 'dispositivo' : 'dispositivos'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Redirigiendo...</span>
          </div>
        </div>
      </div>
    );
  }

  if (status?.status === 'timeout' || status?.status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-lg w-full">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-6">
            <AlertCircle className="h-8 w-8 text-orange-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {status.status === 'timeout' ? 'Activación en proceso' : 'Error temporal'}
          </h2>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800 font-semibold mb-1">
              ✓ Tu pago se procesó correctamente
            </p>
            <p className="text-xs text-green-700">
              El cargo ya está confirmado en Stripe
            </p>
          </div>

          <p className="text-gray-600 mb-6">
            {status.message}
          </p>

          {sessionId && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-xs text-gray-600 mb-2">Para soporte técnico:</p>
              <p className="text-xs font-mono text-gray-900 break-all">
                Session ID: {sessionId}
              </p>
              <p className="text-xs font-mono text-gray-900 mt-1">
                Email: {email}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <RefreshCw className="h-5 w-5" />
              Reintentar verificación
            </button>

            <button
              onClick={handleGoToLogin}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Home className="h-5 w-5" />
              Ir al login (intentar en 5 min)
            </button>

            <button
              onClick={handleContactSupport}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              <Mail className="h-5 w-5" />
              Contactar soporte
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-6">
            En la mayoría de casos, tu cuenta se activará en pocos minutos. Puedes cerrar esta ventana e intentar hacer login más tarde.
          </p>
        </div>
      </div>
    );
  }

  const currentPhase = getCurrentPhase(elapsedTime);
  const progress = Math.min(95, currentPhase.progress + (elapsedTime - currentPhase.time) * 0.5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md w-full">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {currentPhase.message}
        </h2>

        <p className="text-sm text-gray-600 mb-6 animate-pulse">
          {MOTIVATIONAL_MESSAGES[currentMotivationalMessage]}
        </p>

        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500">
            {elapsedTime}s / {MAX_WAIT_TIME}s
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900 font-semibold mb-1">
            ¿Por qué tarda?
          </p>
          <p className="text-xs text-blue-800">
            Stripe procesa tu pago y luego nuestro sistema crea tu cuenta automáticamente. Este proceso suele tardar entre 10-30 segundos.
          </p>
        </div>

        {elapsedTime > 60 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 animate-fade-in">
            <p className="text-xs text-green-800">
              <strong>Tranquilo, todo va bien.</strong> Algunos pagos tardan un poco más en procesarse. Si prefieres, puedes cerrar esta ventana e intentar hacer login en unos minutos.
            </p>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-6">
          Email: {email}
        </p>
      </div>
    </div>
  );
}
