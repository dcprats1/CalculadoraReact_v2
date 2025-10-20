import React, { useState, useRef, useEffect } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';

interface CodeVerificationFormProps {
  email: string;
  onVerify: (code: string) => Promise<void>;
  onBack: () => void;
  devCode?: string;
}

export function CodeVerificationForm({ email, onVerify, onBack, devCode }: CodeVerificationFormProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

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

    try {
      await onVerify(fullCode);
    } catch (err: any) {
      setError(err.message || 'Código inválido');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

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
