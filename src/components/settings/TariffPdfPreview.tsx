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
  onConfirm: () => void;
  onCancel: () => void;
  onDataImported?: () => void;
}

export function TariffPdfPreview({ onConfirm, onCancel, onDataImported }: TariffPdfPreviewProps) {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tariffs, setTariffs] = useState<TariffRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTariffsPdf();
  }, []);

  const loadTariffsPdf = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tariffspdf')
        .select('*')
        .order('service_name', { ascending: true })
        .order('weight_from', { ascending: true });

      if (error) throw error;

      setTariffs(data || []);
      setSelectedIds(new Set(data?.map(t => t.id) || []));
    } catch (err: any) {
      console.error('Error cargando tariffspdf:', err);
      setError(err.message || 'Error al cargar datos temporales');
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
      setSelectedIds(new Set(tariffs.map(t => t.id)));
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
      const selectedTariffs = tariffs.filter(t => selectedIds.has(t.id));

      for (const tariff of selectedTariffs) {
        const { id, created_at, updated_at, ...tariffData } = tariff;

        const existingTariff = await supabase
          .from('custom_tariffs')
          .select('id')
          .eq('user_id', userData.id)
          .eq('service_name', tariff.service_name)
          .eq('weight_from', tariff.weight_from)
          .eq('weight_to', tariff.weight_to)
          .maybeSingle();

        if (existingTariff.data) {
          await supabase
            .from('custom_tariffs')
            .update(tariffData)
            .eq('id', existingTariff.data.id);
        } else {
          await supabase
            .from('custom_tariffs')
            .insert([{
              ...tariffData,
              user_id: userData.id
            }]);
        }
      }

      await supabase
        .from('tariffspdf')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (onDataImported) {
        onDataImported();
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
        <p className="text-yellow-900 font-medium">No hay datos para importar</p>
        <p className="text-sm text-yellow-700 mt-2">
          Parece que no se extrajeron tarifas del PDF. Intenta con otro archivo.
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
              {serviceTariffs.map((tariff) => (
                <div
                  key={tariff.id}
                  className={`flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors ${
                    selectedIds.has(tariff.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(tariff.id)}
                    onChange={() => toggleSelection(tariff.id)}
                    className="w-5 h-5 rounded border-gray-300"
                  />
                  <div className="flex-1 grid grid-cols-5 gap-2 text-xs">
                    <div>
                      <span className="font-medium text-gray-700">Peso:</span>
                      <span className="ml-1">{tariff.weight_from}-{tariff.weight_to}kg</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Prov:</span>
                      <span className="ml-1">{tariff.provincial_sal?.toFixed(2) || '-'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Reg:</span>
                      <span className="ml-1">{tariff.regional_sal?.toFixed(2) || '-'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Nac:</span>
                      <span className="ml-1">{tariff.nacional_sal?.toFixed(2) || '-'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Port:</span>
                      <span className="ml-1">{tariff.portugal_sal?.toFixed(2) || '-'}</span>
                    </div>
                  </div>
                </div>
              ))}
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
