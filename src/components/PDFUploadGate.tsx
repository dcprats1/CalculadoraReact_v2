import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type UploadState = 'idle' | 'uploading' | 'validating' | 'success' | 'error';

interface ValidationResult {
  isValid: boolean;
  confidence: number;
  reason: string;
}

export function PDFUploadGate() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File | null) => {
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf') {
      setError('Por favor, selecciona un archivo PDF válido.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('El archivo es demasiado grande. El tamaño máximo es 10MB.');
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setUploadState('uploading');
    setError(null);

    try {
      const fileName = `${user.id}/tarifa_2025.pdf`;

      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('user-tariff-pdfs')
        .upload(fileName, file, {
          upsert: true,
          contentType: 'application/pdf',
        });

      if (uploadError) {
        throw new Error('Error al subir el archivo: ' + uploadError.message);
      }

      setUploadState('validating');

      const { data: validationData, error: validationError } = await supabase.functions.invoke<ValidationResult>(
        'validate-tariff-pdf',
        {
          body: {
            pdfPath: fileName,
            userId: user.id,
          },
        }
      );

      if (validationError) {
        throw new Error('Error al validar el PDF: ' + validationError.message);
      }

      if (!validationData) {
        throw new Error('No se recibió respuesta del servidor.');
      }

      if (validationData.isValid) {
        setUploadState('success');

        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setUploadState('error');
        setError(validationData.reason);
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadState('error');
      setError(err.message || 'Error al procesar el archivo. Por favor, intenta de nuevo.');
    }
  };

  const renderStateContent = () => {
    switch (uploadState) {
      case 'uploading':
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader className="w-16 h-16 text-blue-600 animate-spin mb-4" />
            <p className="text-lg font-medium text-gray-700">Subiendo archivo...</p>
            <p className="text-sm text-gray-500 mt-2">Por favor, espera un momento</p>
          </div>
        );

      case 'validating':
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader className="w-16 h-16 text-blue-600 animate-spin mb-4" />
            <p className="text-lg font-medium text-gray-700">Validando documento...</p>
            <p className="text-sm text-gray-500 mt-2">Verificando que sea la tarifa oficial GLS 2025</p>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
            <p className="text-lg font-medium text-gray-700">¡PDF validado correctamente!</p>
            <p className="text-sm text-gray-500 mt-2">Redirigiendo a la aplicación...</p>
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <XCircle className="w-16 h-16 text-red-600 mb-4" />
            <p className="text-lg font-medium text-gray-700">Error de validación</p>
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg max-w-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <button
              onClick={() => {
                setUploadState('idle');
                setError(null);
                setFile(null);
              }}
              className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Intentar de nuevo
            </button>
          </div>
        );

      default:
        return (
          <>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                className="hidden"
              />

              {file ? (
                <div className="flex flex-col items-center">
                  <FileText className="w-16 h-16 text-blue-600 mb-4" />
                  <p className="text-lg font-medium text-gray-700">{file.name}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="w-16 h-16 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-700">
                    Arrastra tu PDF aquí o haz clic para seleccionar
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    PDF de tarifa oficial GLS 2025 (máximo 10MB)
                  </p>
                </div>
              )}
            </div>

            {file && (
              <button
                onClick={handleUpload}
                className="w-full mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Validar y continuar
              </button>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Configuración Inicial
            </h1>
            <p className="text-gray-600">
              Para comenzar a utilizar la aplicación, necesitamos validar tu tarifa oficial de costes GLS 2025.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Esta verificación es necesaria por motivos de seguridad y para garantizar la precisión de los cálculos.
            </p>
          </div>

          {renderStateContent()}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Tu archivo será procesado de forma segura y almacenado únicamente para validación.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
