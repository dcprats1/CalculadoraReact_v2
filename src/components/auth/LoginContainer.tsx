import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { EmailInputForm } from './EmailInputForm';
import { CodeVerificationForm } from './CodeVerificationForm';
import { UnregisteredUserView } from './UnregisteredUserView';
import { Calculator, CheckCircle, X } from 'lucide-react';

type LoginStep = 'email' | 'code' | 'unregistered';

interface ActiveDevice {
  device_name: string;
  last_authenticated_at: string;
}

interface UnregisteredUserData {
  email: string;
}

interface LoginContainerProps {
  onShowPricing?: (email: string) => void;
}

export function LoginContainer({ onShowPricing }: LoginContainerProps = {}) {
  const { sendLoginCode, verifyCode, forceCloseSessions, sessionExpiredMessage } = useAuth();
  const [currentStep, setCurrentStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [unregisteredUser, setUnregisteredUser] = useState<UnregisteredUserData | null>(null);
  const [recentlyActivatedEmail, setRecentlyActivatedEmail] = useState<string>('');
  const [showActivationBanner, setShowActivationBanner] = useState(false);
  const [deviceLimitReached, setDeviceLimitReached] = useState(false);
  const [activeDevices, setActiveDevices] = useState<ActiveDevice[]>([]);

  useEffect(() => {
    const recentlyActivatedStr = localStorage.getItem('recently_activated');
    if (recentlyActivatedStr) {
      try {
        const recentlyActivated = JSON.parse(recentlyActivatedStr);
        const activationTime = new Date(recentlyActivated.timestamp).getTime();
        const currentTime = new Date().getTime();
        const fiveMinutesInMs = 5 * 60 * 1000;

        if (currentTime - activationTime < fiveMinutesInMs) {
          setRecentlyActivatedEmail(recentlyActivated.email);
          setShowActivationBanner(true);

          setTimeout(() => {
            setShowActivationBanner(false);
          }, 8000);
        } else {
          localStorage.removeItem('recently_activated');
        }
      } catch (error) {
        console.error('Error parsing recently_activated:', error);
        localStorage.removeItem('recently_activated');
      }
    }
  }, []);

  const handleEmailSubmit = async (submittedEmail: string) => {
    setEmail(submittedEmail);
    const result = await sendLoginCode(submittedEmail);

    if (result.success) {
      // Si hubo AUTO-LOGIN, no mostrar formulario de código
      if (result.autoLogin) {
        // Usuario autenticado automáticamente, AuthContext ya manejó todo
        // La app se redirigirá automáticamente
        return;
      }

      // NO hay sesión activa, mostrar formulario de código OTP
      if (result.code) {
        setDevCode(result.code);
      }
      setCurrentStep('code');
    } else {
      if (result.errorCode === 'USER_NOT_FOUND') {
        setUnregisteredUser({ email: result.email || submittedEmail });
        setCurrentStep('unregistered');
      } else {
        throw new Error(result.error || 'Error al enviar código');
      }
    }
  };

  const handleCodeVerify = async (code: string) => {
    const result = await verifyCode(email, code);

    if (!result.success) {
      if (result.maxDevicesReached) {
        setDeviceLimitReached(true);
        setActiveDevices(result.activeDevices || []);
        return;
      }
      throw new Error(result.error || 'Código inválido');
    }
  };

  const handleForceClose = async (code: string) => {
    const closeResult = await forceCloseSessions(email, code);

    if (!closeResult.success) {
      throw new Error(closeResult.error || 'Error al cerrar sesiones');
    }

    setDeviceLimitReached(false);
    setActiveDevices([]);

    const retryResult = await verifyCode(email, code);

    if (!retryResult.success) {
      throw new Error(retryResult.error || 'Error al iniciar sesión tras cerrar sesiones');
    }
  };

  const handleBack = () => {
    setCurrentStep('email');
    setDevCode(undefined);
    setUnregisteredUser(null);
    setDeviceLimitReached(false);
    setActiveDevices([]);
  };

  const handleViewPricing = () => {
    if (onShowPricing && unregisteredUser) {
      onShowPricing(unregisteredUser.email);
    }
  };

  if (currentStep === 'unregistered' && unregisteredUser) {
    return (
      <UnregisteredUserView
        email={unregisteredUser.email}
        onViewPricing={handleViewPricing}
        onBackToLogin={handleBack}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
              <Calculator className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Calculadora de Tarifas
            </h1>
            <p className="text-sm text-gray-600">
              Accede a tu cuenta corporativa
            </p>
          </div>

          {sessionExpiredMessage && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800 text-center">
                {sessionExpiredMessage}
              </p>
            </div>
          )}

          {showActivationBanner && (
            <div className="bg-green-50 border-2 border-green-500 rounded-xl p-4 mb-6 relative animate-fade-in shadow-lg">
              <button
                onClick={() => setShowActivationBanner(false)}
                className="absolute top-2 right-2 text-green-700 hover:text-green-900 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-green-900 mb-1">
                    ¡Bienvenido! Tu cuenta está lista
                  </h3>
                  <p className="text-sm text-green-800">
                    Introduce tu email para recibir el código de acceso y empezar a usar la calculadora.
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'email' && (
            <EmailInputForm
              onSubmit={handleEmailSubmit}
              initialEmail={recentlyActivatedEmail}
            />
          )}

          {currentStep === 'code' && (
            <CodeVerificationForm
              email={email}
              onVerify={handleCodeVerify}
              onForceClose={handleForceClose}
              onBack={handleBack}
              devCode={devCode}
              deviceLimitReached={deviceLimitReached}
              activeDevices={activeDevices}
            />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Lógica Logística. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
