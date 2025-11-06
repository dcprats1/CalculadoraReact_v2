import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface TariffRow {
  id: string;
  service_name: string;
  weight_from: string;
  weight_to: string;
  provincial_sal?: number | null;
  provincial_rec?: number | null;
  provincial_int?: number | null;
  provincial_arr?: number | null;
  regional_sal?: number | null;
  regional_rec?: number | null;
  regional_int?: number | null;
  regional_arr?: number | null;
  nacional_sal?: number | null;
  nacional_rec?: number | null;
  nacional_int?: number | null;
  nacional_arr?: number | null;
  portugal_sal?: number | null;
  portugal_rec?: number | null;
  portugal_int?: number | null;
  portugal_arr?: number | null;
  [key: string]: any;
}

interface TariffPdfPreviewProps {
  parsedData?: TariffRow[];
  onConfirm: () => void;
  onCancel: () => void;
  onDataImported?: () => void;
}

export function TariffPdfPreview({ parsedData, onConfirm, onCancel, onDataImported }: TariffPdfPreviewProps) {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(!parsedData);
  const [tariffs, setTariffs] = useState<TariffRow[]>(parsedData || []);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (parsedData) {
      setTariffs(parsedData);
      setSelectedIds(new Set(parsedData.map((_, idx) => `temp-${idx}`)));
      setLoading(false);
    } else {
      loadTariffsPdfWithRetry();
    }
  }, [parsedData]);

  const loadTariffsPdfWithRetry = async (retryCount = 0) => {
    const maxRetries = 5;
    const result = await loadTariffsPdf();

    if (result === 0 && retryCount < maxRetries) {
      const backoffDelay = Math.min(1000 * Math.pow(1.5, retryCount), 5000);
      console.log(`[TariffPdfPreview] Reintenando carga (${retryCount + 1}/${maxRetries}) en ${backoffDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      return loadTariffsPdfWithRetry(retryCount + 1);
    }

    return result;
  };

  const loadTariffsPdf = async (): Promise<number> => {
    try {
      setLoading(true);
      const { data, error, count } = await supabase
        .from('tariffspdf')
        .select('*', { count: 'exact' })
        .order('service_name', { ascending: true })
        .order('weight_from', { ascending: true });

      if (error) throw error;

      console.log(`[TariffPdfPreview] Datos cargados: ${data?.length || 0} registros (count: ${count})`);

      setTariffs(data || []);
      setSelectedIds(new Set(data?.map(t => t.id) || []));

      return data?.length || 0;
    } catch (err: any) {
      console.error('[TariffPdfPreview] Error cargando tariffspdf:', err);
      setError(err.message || 'Error al cargar datos temporales');
      return 0;
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === tariffs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tariffs.map((t, idx) => t.id || `temp-${idx}`)));
    }
  };

  const handleConfirmTransfer = async () => {
    if (!userData) {
      setError('Usuario no autenticado');
      return;
    }

    if (selectedIds.size === 0) {
      setError('Selecciona al menos una tarifa para importar');
      return;
    }

    setIsTransferring(true);
    setError(null);

    try {
      const selectedTariffs = tariffs.filter((t, idx) => selectedIds.has(t.id || `temp-${idx}`));
      let successCount = 0;
      let errorCount = 0;

      for (const tariff of selectedTariffs) {
        try {
          const { id, created_at, updated_at, ...tariffData } = tariff as any;

          const { data: existingTariff, error: searchError } = await supabase
            .from('custom_tariffs')
            .select('id')
            .eq('user_id', userData.id)
            .eq('service_name', tariff.service_name)
            .eq('weight_from', tariff.weight_from)
            .eq('weight_to', tariff.weight_to)
            .maybeSingle();

          if (searchError) {
            console.error(`Error buscando tarifa existente:`, searchError);
            errorCount++;
            continue;
          }

          if (existingTariff) {
            const { error: updateError } = await supabase
              .from('custom_tariffs')
              .update(tariffData)
              .eq('id', existingTariff.id);

            if (updateError) {
              console.error(`Error actualizando tarifa:`, updateError);
              errorCount++;
            } else {
              successCount++;
            }
          } else {
            const { error: insertError } = await supabase
              .from('custom_tariffs')
              .insert([{
                ...tariffData,
                user_id: userData.id
              }]);

            if (insertError) {
              console.error(`Error insertando tarifa:`, insertError);
              errorCount++;
            } else {
              successCount++;
            }
          }
        } catch (itemError: any) {
          console.error('Error procesando tarifa individual:', itemError);
          errorCount++;
        }
      }

      console.log(`[TariffPdfPreview] Transferéncia completada: ${successCount} exitosas, ${errorCount} errores`);

      if (errorCount > 0 && successCount === 0) {
        setError(`No se pudo importar ninguna tarifa. Verifica los permisos e inténtalo de nuevo.`);
        return;
      }

      const { error: deleteError } = await supabase
        .from('tariffspdf')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) {
        console.warn('[TariffPdfPreview] Advertencia al limpiar tabla temporal:', deleteError);
      }

      if (onDataImported) {
        onDataImported();
      }

      if (errorCount > 0) {
        console.warn(`[TariffPdfPreview] Importación parcial: ${successCount} exitosas, ${errorCount} errores`);
      }

      onConfirm();
    } catch (err: any) {
      console.error('Error transfiriendo tarifas:', err);
      setError(err.message || 'Error al transferir tarifas');
    } finally {
      setIsTransferring(false);
    }
  };

  const groupedByService = tariffs.reduce((acc, tariff) => {
    if (!acc[tariff.service_name]) {
      acc[tariff.service_name] = [];
    }
    acc[tariff.service_name].push(tariff);
    return acc;
  }, {} as Record<string, TariffRow[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Cargando vista previa...</span>
      </div>
    );
  }

  if (tariffs.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
        <p className="text-yellow-900 font-medium">No se encontraron tarifas en la tabla temporal</p>
        <p className="text-sm text-yellow-700 mt-2">
          La importación reportó éxito pero no hay datos en la vista previa.
        </p>
        <p className="text-xs text-yellow-600 mt-1">
          Esto puede deberse a un problema de sincronización. Intenta de nuevo.
        </p>
        <button
          onClick={onCancel}
          className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
        >
          Volver a Intentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Vista Previa de Importación</h3>
        <p className="text-sm text-blue-800">
          Se extrajeron <strong>{tariffs.length}</strong> tarifas del PDF.
          Selecciona las que deseas importar a tu tabla personalizada.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-blue-900 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.size === tariffs.length}
              onChange={toggleAll}
              className="w-4 h-4 rounded border-blue-300"
            />
            <span>Seleccionar todas ({tariffs.length})</span>
          </label>
          <span className="text-blue-700">
            | {selectedIds.size} seleccionadas
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="max-h-[500px] overflow-y-auto border border-gray-200 rounded-lg">
        {Object.entries(groupedByService).map(([serviceName, serviceTariffs]) => (
          <div key={serviceName} className="border-b border-gray-200 last:border-0">
            <div className="bg-gray-100 px-4 py-2 font-semibold text-gray-900 sticky top-0">
              {serviceName} ({serviceTariffs.length} rangos)
            </div>
            <div className="divide-y divide-gray-100">
              {serviceTariffs.map((tariff, idx) => {
                const tariffId = tariff.id || `temp-${tariffs.indexOf(tariff)}`;
                return (
                <div
                  key={tariffId}
                  className={`flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors ${
                    selectedIds.has(tariffId) ? 'bg-blue-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(tariffId)}
                    onChange={() => toggleSelection(tariffId)}
                    className="w-5 h-5 rounded border-gray-300"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="font-medium text-gray-900 mb-2">
                      Peso: {tariff.weight_from}-{tariff.weight_to}kg
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-600">Provincial</div>
                        <div className="flex gap-1">
                          <span className={`px-1.5 py-0.5 rounded ${tariff.provincial_sal !== null && tariff.provincial_sal !== undefined ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>
                            Sal: {tariff.provincial_sal?.toFixed(2) || '-'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded ${tariff.provincial_rec !== null && tariff.provincial_rec !== undefined ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>
                            Rec: {tariff.provincial_rec?.toFixed(2) || '-'}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <span className={`px-1.5 py-0.5 rounded ${tariff.provincial_int !== null && tariff.provincial_int !== undefined ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>
                            Int: {tariff.provincial_int?.toFixed(2) || '-'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded ${tariff.provincial_arr !== null && tariff.provincial_arr !== undefined ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>
                            Arr: {tariff.provincial_arr?.toFixed(2) || '-'}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-600">Regional</div>
                        <div className="flex gap-1">
                          <span className={`px-1.5 py-0.5 rounded ${tariff.regional_sal !== null && tariff.regional_sal !== undefined ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>
                            Sal: {tariff.regional_sal?.toFixed(2) || '-'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded ${tariff.regional_rec !== null && tariff.regional_rec !== undefined ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>
                            Rec: {tariff.regional_rec?.toFixed(2) || '-'}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <span className={`px-1.5 py-0.5 rounded ${tariff.regional_int !== null && tariff.regional_int !== undefined ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>
                            Int: {tariff.regional_int?.toFixed(2) || '-'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded ${tariff.regional_arr !== null && tariff.regional_arr !== undefined ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>
                            Arr: {tariff.regional_arr?.toFixed(2) || '-'}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-600">Nacional</div>
                        <div className="flex gap-1">
                          <span className={`px-1.5 py-0.5 rounded ${tariff.nacional_sal !== null && tariff.nacional_sal !== undefined ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>
                            Sal: {tariff.nacional_sal?.toFixed(2) || '-'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded ${tariff.nacional_rec !== null && tariff.nacional_rec !== undefined ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>
                            Rec: {tariff.nacional_rec?.toFixed(2) || '-'}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <span className={`px-1.5 py-0.5 rounded ${tariff.nacional_int !== null && tariff.nacional_int !== undefined ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>
                            Int: {tariff.nacional_int?.toFixed(2) || '-'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded ${tariff.nacional_arr !== null && tariff.nacional_arr !== undefined ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>
                            Arr: {tariff.nacional_arr?.toFixed(2) || '-'}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-600">Portugal</div>
                        <div className="flex gap-1">
                          <span className={`px-1.5 py-0.5 rounded ${tariff.portugal_sal !== null && tariff.portugal_sal !== undefined ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>
                            Sal: {tariff.portugal_sal?.toFixed(2) || '-'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded ${tariff.portugal_rec !== null && tariff.portugal_rec !== undefined ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>
                            Rec: {tariff.portugal_rec?.toFixed(2) || '-'}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <span className={`px-1.5 py-0.5 rounded ${tariff.portugal_int !== null && tariff.portugal_int !== undefined ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>
                            Int: {tariff.portugal_int?.toFixed(2) || '-'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded ${tariff.portugal_arr !== null && tariff.portugal_arr !== undefined ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>
                            Arr: {tariff.portugal_arr?.toFixed(2) || '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 pt-4 border-t">
        <button
          onClick={onCancel}
          disabled={isTransferring}
          className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancelar
        </button>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            {selectedIds.size} tarifa{selectedIds.size !== 1 ? 's' : ''} seleccionada{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <button
            onClick={handleConfirmTransfer}
            disabled={isTransferring || selectedIds.size === 0}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isTransferring ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Importando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar e Importar</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
