import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { TariffPdfPreview } from './TariffPdfPreview';

interface ParsedTariff {
  service_name: string;
  weight_from: string;
  weight_to: string;
  [key: string]: string | number | null;
}

interface UploadResult {
  success: boolean;
  message: string;
  imported?: number;
  verified?: number;
  uniqueServices?: number;
  preview?: ParsedTariff[];
  errors?: string[];
  error?: string;
  details?: string;
  confidence?: 'high' | 'medium' | 'low';
  pages?: number;
  stats?: {
    textLength: number;
    linesProcessed: number;
    pagesProcessed: number;
  };
  debugInfo?: any;
}

type Phase = 'upload' | 'preview' | 'success';

interface TariffPdfUploaderProps {
  onDataImported?: () => void;
}

export function TariffPdfUploader({ onDataImported }: TariffPdfUploaderProps = {}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentPhase, setCurrentPhase] = useState<Phase>('upload');
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file =>
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    );

    if (pdfFile) {
      if (pdfFile.size > 10 * 1024 * 1024) {
        setUploadResult({
          success: false,
          message: 'El archivo es demasiado grande',
          details: `Tamaño máximo: 10MB. Tu archivo: ${(pdfFile.size / 1024 / 1024).toFixed(2)}MB`
        });
        return;
      }

      console.log('[TariffPdfUploader] Archivo arrastrado:', {
        nombre: pdfFile.name,
        tamaño: pdfFile.size,
        tipo: pdfFile.type
      });
      setSelectedFile(pdfFile);
      setUploadResult(null);
    } else {
      setUploadResult({
        success: false,
        message: 'Por favor, selecciona un archivo PDF válido'
      });
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];

      if (file.size > 10 * 1024 * 1024) {
        setUploadResult({
          success: false,
          message: 'El archivo es demasiado grande',
          details: `Tamaño máximo: 10MB. Tu archivo: ${(file.size / 1024 / 1024).toFixed(2)}MB`
        });
        return;
      }

      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        console.log('[TariffPdfUploader] Archivo seleccionado:', {
          nombre: file.name,
          tamaño: file.size,
          tipo: file.type
        });
        setSelectedFile(file);
        setUploadResult(null);
      } else {
        setUploadResult({
          success: false,
          message: 'Por favor, selecciona un archivo PDF válido',
          details: `Tipo detectado: ${file.type || 'desconocido'}`
        });
      }
    }
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadResult(null);
    setUploadProgress('Preparando archivo...');
    setElapsedTime(0);

    const startTime = Date.now();
    let progressInterval: NodeJS.Timeout | null = null;

    progressInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    try {
      console.log('[TariffPdfUploader] Iniciando subida de archivo:', {
        nombre: selectedFile.name,
        tamaño: selectedFile.size,
        tipo: selectedFile.type
      });

      const formData = new FormData();
      formData.append('pdf', selectedFile, selectedFile.name);

      console.log('[TariffPdfUploader] FormData creado, claves:', Array.from(formData.keys()));

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Variables de entorno de Supabase no configuradas');
      }

      console.log('[TariffPdfUploader] Enviando petición a:', `${supabaseUrl}/functions/v1/parse-pdf-tariff`);

      setUploadProgress('Enviando PDF al servidor...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn('[TariffPdfUploader] Timeout alcanzado después de 5 minutos');
        controller.abort();
      }, 300000);

      try {
        setUploadProgress('Procesando PDF (esto puede tardar varios minutos)...');

        const response = await fetch(
          `${supabaseUrl}/functions/v1/parse-pdf-tariff`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: formData,
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);
        if (progressInterval) clearInterval(progressInterval);
        setUploadProgress('Procesando respuesta...');

      console.log('[TariffPdfUploader] Respuesta recibida:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type')
      });

        const responseText = await response.text();
        console.log('[TariffPdfUploader] Respuesta raw:', responseText.substring(0, 200));

        let result;
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          console.error('[TariffPdfUploader] Error al parsear JSON:', e);
          throw new Error(`Respuesta inválida del servidor: ${responseText.substring(0, 100)}`);
        }

      if (response.ok && result.success) {
        console.log('[TariffPdfUploader] Extracción exitosa:', result);

        if (result.preview) {
          console.log('[TariffPdfUploader] Mostrando vista previa de datos extraídos');
          setUploadResult({
            success: true,
            message: result.message,
            imported: result.data?.length || 0,
            preview: result.data,
            uniqueServices: new Set(result.servicesDetected || []).size,
          });
          setCurrentPhase('preview');
        } else {
          if (result.verified === 0 || result.imported === 0) {
            console.error('[TariffPdfUploader] Advertencia: No hay datos verificados en DB');
            setUploadResult({
              success: false,
              message: 'Error de sincronización con base de datos',
              details: `Se parsearon ${result.imported || 0} tarifas pero no se verificaron en la base de datos. Intenta de nuevo.`,
            });
            return;
          }

          if (result.verified !== result.imported) {
            console.warn(`[TariffPdfUploader] Discrepancia: insertadas=${result.imported}, verificadas=${result.verified}`);
          }

          setUploadResult({
            success: true,
            message: result.message,
            imported: result.imported,
            verified: result.verified,
            uniqueServices: result.uniqueServices,
            preview: result.preview,
          });
          setCurrentPhase('preview');
        }
      } else {
        console.error('[TariffPdfUploader] Error en la importación:', result);
        setUploadResult({
          success: false,
          message: result.error || 'Error al procesar el PDF',
          details: result.details || JSON.stringify(result.debug),
          errors: result.errors || result.suggestions,
        });
      }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (progressInterval) clearInterval(progressInterval);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error(`Timeout: El servidor no respondió en 5 minutos. El archivo puede ser demasiado grande o complejo. Tiempo transcurrido: ${Math.floor((Date.now() - startTime) / 1000)}s`);
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('[TariffPdfUploader] Error capturado:', error);
      if (progressInterval) clearInterval(progressInterval);
      setUploadResult({
        success: false,
        message: 'Error al conectar con el servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress('');
      if (progressInterval) clearInterval(progressInterval);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setCurrentPhase('upload');
  };

  const handlePreviewConfirm = () => {
    setCurrentPhase('success');
    setUploadResult({
      success: true,
      message: 'Tarifas importadas correctamente',
    });
  };

  const handlePreviewCancel = () => {
    clearSelection();
  };

  if (currentPhase === 'preview' && uploadResult?.preview) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Vista Previa de Importación
            </h3>
          </div>
        </div>
        <TariffPdfPreview
          parsedData={uploadResult.preview}
          onConfirm={handlePreviewConfirm}
          onCancel={handlePreviewCancel}
          onDataImported={onDataImported}
        />
      </div>
    );
  }

  if (currentPhase === 'success') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-green-900 mb-2">
            ¡Importación Completada!
          </h3>
          <p className="text-green-700 mb-4">
            Las tarifas se han importado correctamente a tu tabla personalizada.
          </p>
          <button
            onClick={clearSelection}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Importar Otro PDF
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Importar Tarifas desde PDF
          </h3>
        </div>
      </div>

      <div className="space-y-4">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${selectedFile ? 'bg-green-50 border-green-500' : ''}
          `}
        >
          {!selectedFile ? (
            <>
              <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
              <p className="text-sm font-medium text-gray-700 mb-2">
                Arrastra un archivo PDF aquí o haz clic para seleccionar
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Formato aceptado: PDF de tarifas GLS España 2025
              </p>
              <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors">
                <span>Seleccionar PDF</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </>
          ) : (
            <div className="flex items-center justify-center gap-4">
              <FileText className="w-8 h-8 text-green-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <button
                onClick={clearSelection}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                disabled={isUploading}
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}
        </div>

        {selectedFile && !uploadResult && (
          <div className="space-y-3">
            {isUploading && uploadProgress && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">{uploadProgress}</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Tiempo transcurrido: {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
                      {elapsedTime > 120 && (
                        <span className="ml-2 text-yellow-700">
                          (El procesamiento puede tardar hasta 5 minutos)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full animate-pulse" style={{ width: '100%' }}></div>
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Importar Tarifas</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {uploadResult && (
          <div className={`rounded-lg p-4 ${uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-start gap-3">
              {uploadResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${uploadResult.success ? 'text-green-900' : 'text-red-900'}`}>
                  {uploadResult.message}
                </p>
                {uploadResult.imported !== undefined && (
                  <p className="text-sm text-green-700 mt-1">
                    Tarifas importadas: {uploadResult.imported}
                    {uploadResult.verified !== undefined && uploadResult.verified !== uploadResult.imported && (
                      <span className="text-yellow-700"> (verificadas: {uploadResult.verified})</span>
                    )}
                  </p>
                )}
                {uploadResult.uniqueServices !== undefined && (
                  <p className="text-sm text-green-700 mt-1">
                    Servicios detectados: {uploadResult.uniqueServices}
                  </p>
                )}
                {uploadResult.pages !== undefined && (
                  <p className="text-sm text-green-700 mt-1">
                    Páginas procesadas: {uploadResult.pages}
                  </p>
                )}
                {uploadResult.confidence && (
                  <p className="text-sm text-green-700 mt-1">
                    Confianza de extracción: {uploadResult.confidence === 'high' ? 'Alta' : uploadResult.confidence === 'medium' ? 'Media' : 'Baja'}
                  </p>
                )}
                {uploadResult.details && (
                  <p className="text-sm text-red-700 mt-1">{uploadResult.details}</p>
                )}
                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-red-800">Errores encontrados:</p>
                    <ul className="list-disc list-inside text-sm text-red-700 mt-1">
                      {uploadResult.errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {uploadResult.preview && uploadResult.preview.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-green-800 mb-2">Vista previa de datos importados:</p>
                    <div className="bg-white rounded border border-green-200 p-3 max-h-64 overflow-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1 px-2">Servicio</th>
                            <th className="text-left py-1 px-2">Peso</th>
                            <th className="text-left py-1 px-2">Provincial Sal</th>
                            <th className="text-left py-1 px-2">Regional Sal</th>
                            <th className="text-left py-1 px-2">Nacional Sal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uploadResult.preview.map((tariff, idx) => (
                            <tr key={idx} className="border-b last:border-0">
                              <td className="py-1 px-2">{tariff.service_name}</td>
                              <td className="py-1 px-2">{tariff.weight_from}-{tariff.weight_to}kg</td>
                              <td className="py-1 px-2">{tariff.provincial_sal || '-'}</td>
                              <td className="py-1 px-2">{tariff.regional_sal || '-'}</td>
                              <td className="py-1 px-2">{tariff.nacional_sal || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Flujo de Importación:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Paso 1:</strong> Sube el PDF de tarifas GLS España 2025</li>
            <li>• <strong>Paso 2:</strong> Revisa la vista previa de datos extraídos</li>
            <li>• <strong>Paso 3:</strong> Selecciona y confirma las tarifas a importar</li>
            <li>• Los datos se guardan primero en tabla temporal para revisión</li>
            <li>• Tus tarifas actuales NO se modifican hasta confirmar</li>
            <li>• Se usa PDF.js de Mozilla para extracción profesional</li>
            <li>• Compatible con Chrome, Firefox, Safari y Edge</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
