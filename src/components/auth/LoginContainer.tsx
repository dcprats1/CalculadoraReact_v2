import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { EmailInputForm } from './EmailInputForm';
import { CodeVerificationForm } from './CodeVerificationForm';
import { Calculator } from 'lucide-react';

type LoginStep = 'email' | 'code';

export function LoginContainer() {
  const { sendLoginCode, verifyCode } = useAuth();
  const [currentStep, setCurrentStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();

  const handleEmailSubmit = async (submittedEmail: string) => {
    setEmail(submittedEmail);
    const result = await sendLoginCode(submittedEmail);

    if (result.success) {
      if (result.code) {
        setDevCode(result.code);
      }
      setCurrentStep('code');
    } else {
      throw new Error(result.error || 'Error al enviar código');
    }
  };

  const handleCodeVerify = async (code: string) => {
    const result = await verifyCode(email, code);

    if (!result.success) {
      throw new Error(result.error || 'Código inválido');
    }
  };

  const handleBack = () => {
    setCurrentStep('email');
    setDevCode(undefined);
  };

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

          {currentStep === 'email' && (
            <EmailInputForm onSubmit={handleEmailSubmit} />
          )}

          {currentStep === 'code' && (
            <CodeVerificationForm
              email={email}
              onVerify={handleCodeVerify}
              onBack={handleBack}
              devCode={devCode}
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
