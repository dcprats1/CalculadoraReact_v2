import React, { useState } from 'react';
import { FileText, Loader2, CheckCircle } from 'lucide-react';

interface ContractAcceptanceProps {
  contractId: string;
  contractUrl: string | null;
  version: string;
  onAccept: (contractId: string) => Promise<void>;
}

export function ContractAcceptance({ contractId, contractUrl, version, onAccept }: ContractAcceptanceProps) {
  const [accepted, setAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAccept = async () => {
    if (!accepted) {
      setError('Debes aceptar los términos para continuar');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onAccept(contractId);
    } catch (err: any) {
      setError(err.message || 'Error al aceptar contrato');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <FileText className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Contrato Comercial
        </h3>
        <p className="text-sm text-gray-600">
          Versión {version}
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
        <h4 className="font-medium text-gray-900">Términos del servicio</h4>

        <div className="text-sm text-gray-700 space-y-2 max-h-64 overflow-y-auto">
          <p>Al aceptar este contrato, confirmas que:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Has leído y comprendido los términos del servicio</li>
            <li>Aceptas las condiciones de uso de la plataforma</li>
            <li>Autorizas el acceso a los datos de tarifas comerciales</li>
            <li>Comprendes las políticas de privacidad y protección de datos</li>
            <li>Aceptas las condiciones de facturación según el plan contratado</li>
          </ul>
        </div>

        {contractUrl && (
          <a
            href={contractUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <FileText className="h-4 w-4 mr-1" />
            Ver contrato completo (PDF)
          </a>
        )}
      </div>

      <label className="flex items-start space-x-3 cursor-pointer group">
        <div className="flex items-center h-6">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => {
              setAccepted(e.target.checked);
              setError('');
            }}
            disabled={isLoading}
            className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
          />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
            He leído y acepto los términos del contrato comercial y las condiciones de uso del servicio
          </p>
        </div>
      </label>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleAccept}
        disabled={isLoading || !accepted}
        className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
            Procesando...
          </>
        ) : (
          <>
            <CheckCircle className="-ml-1 mr-3 h-5 w-5" />
            Aceptar y continuar
          </>
        )}
      </button>

      <p className="text-xs text-center text-gray-500">
        Al aceptar, se registrará la fecha y hora de aceptación del contrato
      </p>
    </div>
  );
}
