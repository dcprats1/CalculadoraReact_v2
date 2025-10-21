import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Save, RotateCcw, Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase, CustomTariff } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCustomTariffs, useCustomTariffsActive, useTariffs } from '../../hooks/useSupabaseData';
import { STATIC_SERVICES } from '../../utils/calculations';

const WEIGHT_RANGES = [
  { from: '0', to: '1', label: '0-1kg' },
  { from: '1', to: '3', label: '1-3kg' },
  { from: '3', to: '5', label: '3-5kg' },
  { from: '5', to: '10', label: '5-10kg' },
  { from: '10', to: '15', label: '10-15kg' },
  { from: '15', to: '999', label: '15-999kg' }
] as const;

interface Destination {
  key: string;
  label: string;
  columns: {
    field: keyof CustomTariff;
    label: string;
  }[];
}

const DESTINATIONS: Destination[] = [
  {
    key: 'provincial',
    label: 'Prov.',
    columns: [
      { field: 'provincial_sal', label: 'Sal' },
      { field: 'provincial_rec', label: 'Rec' },
      { field: 'provincial_int', label: 'Int' },
      { field: 'provincial_arr', label: 'Arr' }
    ]
  },
  {
    key: 'regional',
    label: 'Reg.',
    columns: [
      { field: 'regional_sal', label: 'Sal' },
      { field: 'regional_rec', label: 'Rec' },
      { field: 'regional_int', label: 'Int' },
      { field: 'regional_arr', label: 'Arr' }
    ]
  },
  {
    key: 'nacional',
    label: 'Nac.',
    columns: [
      { field: 'nacional_sal', label: 'Sal' },
      { field: 'nacional_rec', label: 'Rec' },
      { field: 'nacional_int', label: 'Int' },
      { field: 'nacional_arr', label: 'Arr' }
    ]
  },
  {
    key: 'portugal',
    label: 'Port.',
    columns: [
      { field: 'portugal_sal', label: 'Sal' },
      { field: 'portugal_rec', label: 'Rec' },
      { field: 'portugal_int', label: 'Int' },
      { field: 'portugal_arr', label: 'Arr' }
    ]
  },
  {
    key: 'canarias_mayores',
    label: 'Can.My.',
    columns: [
      { field: 'canarias_mayores_sal', label: 'Sal' },
      { field: 'canarias_mayores_rec', label: 'Rec' },
      { field: 'canarias_mayores_int', label: 'Int' },
      { field: 'canarias_mayores_arr', label: 'Arr' }
    ]
  },
  {
    key: 'canarias_menores',
    label: 'Can.Mn.',
    columns: [
      { field: 'canarias_menores_sal', label: 'Sal' },
      { field: 'canarias_menores_rec', label: 'Rec' },
      { field: 'canarias_menores_int', label: 'Int' },
      { field: 'canarias_menores_arr', label: 'Arr' }
    ]
  },
  {
    key: 'baleares_mayores',
    label: 'Bal.My.',
    columns: [
      { field: 'baleares_mayores_sal', label: 'Sal' },
      { field: 'baleares_mayores_rec', label: 'Rec' },
      { field: 'baleares_mayores_int', label: 'Int' },
      { field: 'baleares_mayores_arr', label: 'Arr' }
    ]
  },
  {
    key: 'baleares_menores',
    label: 'Bal.Mn.',
    columns: [
      { field: 'baleares_menores_sal', label: 'Sal' },
      { field: 'baleares_menores_rec', label: 'Rec' },
      { field: 'baleares_menores_int', label: 'Int' },
      { field: 'baleares_menores_arr', label: 'Arr' }
    ]
  },
  {
    key: 'ceuta',
    label: 'Ceuta',
    columns: [
      { field: 'ceuta_sal', label: 'Sal' },
      { field: 'ceuta_rec', label: 'Rec' },
      { field: 'ceuta_int', label: 'Int' },
      { field: 'ceuta_arr', label: 'Arr' }
    ]
  },
  {
    key: 'melilla',
    label: 'Melilla',
    columns: [
      { field: 'melilla_sal', label: 'Sal' },
      { field: 'melilla_rec', label: 'Rec' },
      { field: 'melilla_int', label: 'Int' },
      { field: 'melilla_arr', label: 'Arr' }
    ]
  }
];

type CellKey = `${string}_${string}_${string}`;

interface CustomTariffsEditorProps {
  onClose?: () => void;
}

export const CustomTariffsEditor: React.FC<CustomTariffsEditorProps> = () => {
  const { userData } = useAuth();
  const { customTariffs, refetch: refetchCustomTariffs } = useCustomTariffs();
  const { activeStates, refetch: refetchActiveStates } = useCustomTariffsActive();
  const { tariffs: officialTariffs } = useTariffs();

  const [selectedService, setSelectedService] = useState<string>(STATIC_SERVICES[0]);
  const [editData, setEditData] = useState<Record<CellKey, number | null>>({});
  const [activeCell, setActiveCell] = useState<CellKey | null>(null);
  const [draftValue, setDraftValue] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const isActive = useMemo(() => {
    return activeStates.some(state => state.service_name === selectedService && state.is_active);
  }, [activeStates, selectedService]);

  const loadServiceData = useCallback(() => {
    const data: Record<CellKey, number | null> = {};

    WEIGHT_RANGES.forEach(range => {
      DESTINATIONS.forEach(dest => {
        dest.columns.forEach(col => {
          const cellKey: CellKey = `${range.from}_${range.to}_${col.field}`;

          const customTariff = customTariffs.find(
            t => t.service_name === selectedService &&
                 t.weight_from === range.from &&
                 t.weight_to === range.to
          );

          if (customTariff && customTariff[col.field] !== undefined) {
            data[cellKey] = customTariff[col.field] as number | null;
          } else {
            data[cellKey] = null;
          }
        });
      });
    });

    setEditData(data);
    setHasUnsavedChanges(false);
  }, [customTariffs, selectedService]);

  useEffect(() => {
    loadServiceData();
  }, [loadServiceData]);

  const formatValue = (value: number | null): string => {
    if (value === null || value === undefined) return '';
    return value.toFixed(2);
  };

  const parseValue = (str: string): number | null => {
    const trimmed = str.trim();
    if (!trimmed) return null;

    const normalized = trimmed.replace(',', '.');
    const parsed = parseFloat(normalized);

    if (isNaN(parsed) || parsed < 0) return null;
    return Math.round(parsed * 100) / 100;
  };

  const getCellValue = (cellKey: CellKey): number | null => {
    return editData[cellKey] ?? null;
  };

  const setCellValue = (cellKey: CellKey, value: number | null) => {
    setEditData(prev => ({ ...prev, [cellKey]: value }));
    setHasUnsavedChanges(true);
  };

  const buildEditSequence = (): CellKey[] => {
    const sequence: CellKey[] = [];
    DESTINATIONS.forEach(dest => {
      WEIGHT_RANGES.forEach(range => {
        dest.columns.forEach(col => {
          sequence.push(`${range.from}_${range.to}_${col.field}` as CellKey);
        });
      });
    });
    return sequence;
  };

  const editSequence = useMemo(buildEditSequence, []);

  const moveFocus = (currentKey: CellKey, direction: 1 | -1): boolean => {
    const currentIndex = editSequence.indexOf(currentKey);
    if (currentIndex === -1) return false;

    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= editSequence.length) return false;

    const nextKey = editSequence[nextIndex];
    setActiveCell(nextKey);
    setDraftValue(formatValue(getCellValue(nextKey)));

    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(`input[data-cell-key="${nextKey}"]`);
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);

    return true;
  };

  const commitDraft = () => {
    if (!activeCell) return;

    const parsedValue = parseValue(draftValue);
    setCellValue(activeCell, parsedValue);
    setActiveCell(null);
    setDraftValue('');
  };

  const cancelDraft = () => {
    setActiveCell(null);
    setDraftValue('');
  };

  const handleCellFocus = (cellKey: CellKey) => {
    setActiveCell(cellKey);
    setDraftValue(formatValue(getCellValue(cellKey)));
  };

  const handleCellBlur = () => {
    commitDraft();
  };

  const handleCellKeyDown = (e: React.KeyboardEvent, cellKey: CellKey) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitDraft();
      moveFocus(cellKey, 1);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitDraft();
      moveFocus(cellKey, e.shiftKey ? -1 : 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelDraft();
    }
  };

  const handleSave = async () => {
    if (!userData) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const tariffsToUpsert: Partial<CustomTariff>[] = [];

      WEIGHT_RANGES.forEach(range => {
        const tariffRow: Partial<CustomTariff> = {
          user_id: userData.id,
          service_name: selectedService,
          weight_from: range.from,
          weight_to: range.to
        };

        DESTINATIONS.forEach(dest => {
          dest.columns.forEach(col => {
            const cellKey: CellKey = `${range.from}_${range.to}_${col.field}`;
            const value = editData[cellKey];
            tariffRow[col.field] = value as number | null;
          });
        });

        tariffsToUpsert.push(tariffRow);
      });

      const { data: existing } = await supabase
        .from('custom_tariffs')
        .select('id, weight_from, weight_to')
        .eq('user_id', userData.id)
        .eq('service_name', selectedService);

      const existingMap = new Map(
        existing?.map(e => [`${e.weight_from}_${e.weight_to}`, e.id]) || []
      );

      for (const tariff of tariffsToUpsert) {
        const key = `${tariff.weight_from}_${tariff.weight_to}`;
        const existingId = existingMap.get(key);

        if (existingId) {
          await supabase
            .from('custom_tariffs')
            .update(tariff)
            .eq('id', existingId);
        } else {
          await supabase
            .from('custom_tariffs')
            .insert([tariff]);
        }
      }

      await refetchCustomTariffs();
      setHasUnsavedChanges(false);
      setSaveMessage('Tarifas guardadas correctamente');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error saving custom tariffs:', error);
      setSaveMessage('Error al guardar las tarifas');
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreOfficial = async () => {
    if (!window.confirm('¿Deseas restaurar los valores oficiales para este servicio? Esto sobrescribirá los valores actuales.')) {
      return;
    }

    const newData: Record<CellKey, number | null> = {};

    WEIGHT_RANGES.forEach(range => {
      DESTINATIONS.forEach(dest => {
        dest.columns.forEach(col => {
          const cellKey: CellKey = `${range.from}_${range.to}_${col.field}`;

          const officialTariff = officialTariffs.find(
            t => t.service_name === selectedService &&
                 t.weight_from.toString() === range.from &&
                 (t.weight_to === null ? range.to === '999' : t.weight_to.toString() === range.to)
          );

          if (officialTariff) {
            const fieldValue = officialTariff[col.field as keyof typeof officialTariff];
            newData[cellKey] = fieldValue !== undefined && fieldValue !== null ? Number(fieldValue) : null;
          } else {
            newData[cellKey] = null;
          }
        });
      });
    });

    setEditData(newData);
    setHasUnsavedChanges(true);
  };

  const handleClear = async () => {
    if (!window.confirm('¿Deseas limpiar todas las tarifas personalizadas de este servicio? Esta acción no se puede deshacer.')) {
      return;
    }

    if (!userData) return;

    try {
      await supabase
        .from('custom_tariffs')
        .delete()
        .eq('user_id', userData.id)
        .eq('service_name', selectedService);

      await refetchCustomTariffs();
      loadServiceData();
      setSaveMessage('Tarifas eliminadas correctamente');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error clearing custom tariffs:', error);
      setSaveMessage('Error al eliminar las tarifas');
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  const handleToggleActive = async () => {
    if (!userData) return;

    try {
      const existingState = activeStates.find(s => s.service_name === selectedService);

      if (existingState) {
        await supabase
          .from('custom_tariffs_active')
          .update({ is_active: !existingState.is_active })
          .eq('id', existingState.id);
      } else {
        await supabase
          .from('custom_tariffs_active')
          .insert([{
            user_id: userData.id,
            service_name: selectedService,
            is_active: true
          }]);
      }

      await refetchActiveStates();
    } catch (error) {
      console.error('Error toggling active state:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">
            Servicio a editar
          </label>
          <select
            value={selectedService}
            onChange={(e) => {
              if (hasUnsavedChanges) {
                if (!window.confirm('Tienes cambios sin guardar. ¿Deseas cambiar de servicio de todas formas?')) {
                  return;
                }
              }
              setSelectedService(e.target.value);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            {STATIC_SERVICES.map(service => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleActive}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              isActive
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {isActive ? 'Tabla Personalizada Activa' : 'Tabla Oficial Activa'}
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-900">
          <strong>Estado actual:</strong> {isActive ? 'Usando tabla personalizada' : 'Usando tabla oficial'}
        </p>
      </div>

      {saveMessage && (
        <div className={`rounded-lg p-3 text-sm font-medium ${
          saveMessage.includes('Error') ? 'bg-red-50 text-red-900 border border-red-200' : 'bg-green-50 text-green-900 border border-green-200'
        }`}>
          {saveMessage}
        </div>
      )}

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="sticky left-0 z-10 bg-gray-100 px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-300">
                Peso
              </th>
              {DESTINATIONS.map(dest => (
                <th key={dest.key} colSpan={dest.columns.length} className="px-2 py-2 text-center font-semibold text-gray-700 border-r border-gray-300">
                  {dest.label}
                </th>
              ))}
            </tr>
            <tr className="bg-gray-50">
              <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 border-r border-gray-300"></th>
              {DESTINATIONS.map(dest => (
                <React.Fragment key={dest.key}>
                  {dest.columns.map(col => (
                    <th key={col.field} className="px-1 py-1 text-center text-xs font-medium text-gray-600 border-r border-gray-200">
                      {col.label}
                    </th>
                  ))}
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {WEIGHT_RANGES.map(range => (
              <tr key={`${range.from}_${range.to}`} className="hover:bg-gray-50">
                <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-gray-700 border-r border-gray-300">
                  {range.label}
                </td>
                {DESTINATIONS.map(dest => (
                  <React.Fragment key={dest.key}>
                    {dest.columns.map(col => {
                      const cellKey: CellKey = `${range.from}_${range.to}_${col.field}`;
                      const isEditing = activeCell === cellKey;
                      const value = getCellValue(cellKey);

                      return (
                        <td key={col.field} className="px-1 py-1 border-r border-gray-200">
                          <input
                            type="text"
                            inputMode="decimal"
                            data-cell-key={cellKey}
                            value={isEditing ? draftValue : formatValue(value)}
                            onFocus={() => handleCellFocus(cellKey)}
                            onBlur={handleCellBlur}
                            onChange={(e) => isEditing && setDraftValue(e.target.value)}
                            onKeyDown={(e) => handleCellKeyDown(e, cellKey)}
                            className="w-full px-1 py-1 text-right text-xs border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                            style={{ minWidth: '60px' }}
                          />
                        </td>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap border-t pt-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Guardando...' : 'Grabar'}
          </button>

          <button
            onClick={handleRestoreOfficial}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar Oficial
          </button>

          <button
            onClick={handleClear}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Limpiar
          </button>
        </div>

        {hasUnsavedChanges && (
          <span className="text-sm text-orange-600 font-medium">
            Cambios pendientes sin guardar
          </span>
        )}
      </div>
    </div>
  );
};