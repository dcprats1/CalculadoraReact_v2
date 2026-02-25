import React, { useState, useRef, useEffect } from 'react';
import { Loader2, ArrowLeft, Monitor, AlertTriangle } from 'lucide-react';

interface ActiveDevice {
  device_name: string;
  last_authenticated_at: string;
}

interface CodeVerificationFormProps {
  email: string;
  onVerify: (code: string) => Promise<void>;
  onForceClose: (code: string) => Promise<void>;
  onBack: () => void;
  devCode?: string;
  deviceLimitReached?: boolean;
  activeDevices?: ActiveDevice[];
}

export function CodeVerificationForm({
  email,
  onVerify,
  onForceClose,
  onBack,
  devCode,
  deviceLimitReached,
  activeDevices,
}: CodeVerificationFormProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState('');
  const [lastSubmittedCode, setLastSubmittedCode] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!deviceLimitReached) {
      inputRefs.current[0]?.focus();
    }
  }, [deviceLimitReached]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newCode.every(digit => digit !== '')) {
      handleSubmit(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);

    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      handleSubmit(pastedData);
    }
  };

  const handleSubmit = async (fullCode: string) => {
    if (fullCode.length !== 6) return;

    setIsLoading(true);
    setError('');
    setLastSubmittedCode(fullCode);

    try {
      await onVerify(fullCode);
    } catch (err: any) {
      setError(err.message || 'Código inválido');
      if (!deviceLimitReached) {
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceClose = async () => {
    if (!lastSubmittedCode) return;

    setIsClosing(true);
    setError('');

    try {
      await onForceClose(lastSubmittedCode);
    } catch (err: any) {
      setError(err.message || 'Error al cerrar sesiones');
    } finally {
      setIsClosing(false);
    }
  };

  function formatDeviceDate(dateStr: string) {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffHours < 1) return 'Hace menos de 1 hora';
      if (diffHours < 24) return `Hace ${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      return `Hace ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    } catch {
      return 'Fecha desconocida';
    }
  }

  if (deviceLimitReached) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={onBack}
          disabled={isClosing}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </button>

        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-amber-900 mb-1">
                Limite de dispositivos alcanzado
              </h3>
              <p className="text-sm text-amber-800">
                Ya tienes el maximo de sesiones activas. Puedes cerrar todas las demas sesiones para iniciar aqui.
              </p>
            </div>
          </div>
        </div>

        {activeDevices && activeDevices.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Dispositivos con sesion activa
            </p>
            <div className="space-y-2">
              {activeDevices.map((device, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <Monitor className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">
                      {device.device_name || 'Dispositivo desconocido'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDeviceDate(device.last_authenticated_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleForceClose}
          disabled={isClosing}
          className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isClosing ? (
            <span className="flex items-center justify-center">
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              Cerrando sesiones...
            </span>
          ) : (
            'Cerrar otras sesiones e iniciar aqui'
          )}
        </button>

        <p className="text-xs text-center text-gray-500">
          Esto cerrara todas tus sesiones en otros dispositivos.
          Tendran que volver a iniciar sesion.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        disabled={isLoading}
        className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Volver
      </button>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Introduce el código
        </h3>
        <p className="text-sm text-gray-600">
          Enviado a <span className="font-medium">{email}</span>
        </p>
      </div>

      {devCode && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>DEV MODE:</strong> Código: <span className="font-mono font-bold">{devCode}</span>
          </p>
        </div>
      )}

      <div className="flex gap-2 justify-center" onPaste={handlePaste}>
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            disabled={isLoading}
            className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
          />
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center text-sm text-gray-600">
          <Loader2 className="animate-spin mr-2 h-4 w-4" />
          Verificando código...
        </div>
      )}

      <p className="text-xs text-center text-gray-500">
        ¿No recibiste el código?{' '}
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
        >
          Reenviar
        </button>
      </p>
    </div>
  );
}
