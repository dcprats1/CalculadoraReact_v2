import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Save, RotateCcw, Trash2, X, AlertTriangle } from 'lucide-react';
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
  onClose: () => void;
}

export const CustomTariffsEditor: React.FC<CustomTariffsEditorProps> = ({ onClose }) => {
  const { userData } = useAuth();
  // IMPORTANTE: Pasamos userData.id para filtrar por usuario actual
  // Esto garantiza que solo se cargan las tarifas personalizadas del usuario autenticado
  const { customTariffs, refetch: refetchCustomTariffs } = useCustomTariffs(userData?.id);
  const { activeStates, refetch: refetchActiveStates } = useCustomTariffsActive(userData?.id);
  const { tariffs: officialTariffs } = useTariffs();

  const [selectedService, setSelectedService] = useState<string>(STATIC_SERVICES[0]);
  const [editData, setEditData] = useState<Record<CellKey, number | null>>({});
  const [activeCell, setActiveCell] = useState<CellKey | null>(null);
  const [draftValue, setDraftValue] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

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
            const officialTariff = officialTariffs.find(
              t => t.service_name === selectedService &&
                   t.weight_from.toString() === range.from &&
                   (t.weight_to === null ? range.to === '999' : t.weight_to.toString() === range.to)
            );

            if (officialTariff) {
              const fieldValue = officialTariff[col.field as keyof typeof officialTariff];
              data[cellKey] = fieldValue !== undefined && fieldValue !== null ? Number(fieldValue) : null;
            } else {
              data[cellKey] = null;
            }
          }
        });
      });
    });

    setEditData(data);
    setHasUnsavedChanges(false);
  }, [customTariffs, selectedService, officialTariffs]);

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

  const isCustomValue = (cellKey: CellKey): boolean => {
    const [weight_from, weight_to, field] = cellKey.split('_');
    const currentValue = editData[cellKey];

    const officialTariff = officialTariffs.find(
      t => t.service_name === selectedService &&
           t.weight_from.toString() === weight_from &&
           (t.weight_to === null ? weight_to === '999' : t.weight_to.toString() === weight_to)
    );

    if (!officialTariff) return false;

    const officialValue = officialTariff[field as keyof typeof officialTariff] as number | null | undefined;
    const normalizedOfficialValue = officialValue !== undefined && officialValue !== null ? Number(officialValue) : null;
    const normalizedCurrentValue = currentValue !== undefined && currentValue !== null ? Number(currentValue) : null;

    return normalizedCurrentValue !== normalizedOfficialValue;
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
      // Paso 1: Cargar TODOS los registros existentes de custom_tariffs para este servicio
      const { data: existingRecords } = await supabase
        .from('custom_tariffs')
        .select('*')
        .eq('user_id', userData.id)
        .eq('service_name', selectedService);

      // Crear mapa de registros existentes por rango de peso
      const existingMap = new Map(
        existingRecords?.map(e => [`${e.weight_from}_${e.weight_to}`, e]) || []
      );

      const tariffsToUpsert: Partial<CustomTariff>[] = [];
      const recordIdsToDelete: string[] = [];
      let totalModifiedFields = 0;
      let totalRestoredRanges = 0;

      // Paso 2: Para cada rango de peso, construir objeto completo
      WEIGHT_RANGES.forEach(range => {
        const officialTariff = officialTariffs.find(
          t => t.service_name === selectedService &&
               t.weight_from.toString() === range.from &&
               (t.weight_to === null ? range.to === '999' : t.weight_to.toString() === range.to)
        );

        // Obtener el registro existente (si existe)
        const rangeKey = `${range.from}_${range.to}`;
        const existingRecord = existingMap.get(rangeKey);

        // Construir objeto completo: base oficial + valores ya personalizados + cambios actuales
        const completeTariff: Partial<CustomTariff> = {
          user_id: userData.id,
          service_name: selectedService,
          weight_from: range.from,
          weight_to: range.to
        };

        let hasModificationsInThisRange = false;
        let modifiedFieldsCount = 0;
        let allFieldsMatchOfficial = true;

        DESTINATIONS.forEach(dest => {
          dest.columns.forEach(col => {
            const cellKey: CellKey = `${range.from}_${range.to}_${col.field}`;
            const editedValue = editData[cellKey];

            // Valor oficial
            const officialValue = officialTariff
              ? (officialTariff[col.field as keyof typeof officialTariff] as number | null | undefined)
              : null;
            const normalizedOfficialValue = officialValue !== undefined && officialValue !== null
              ? Number(officialValue)
              : null;

            // Valor editado actual (en memoria)
            const normalizedEditedValue = editedValue !== undefined && editedValue !== null
              ? Number(editedValue)
              : null;

            // Valor que ya estaba personalizado en DB
            const existingValue = existingRecord && existingRecord[col.field] !== undefined
              ? existingRecord[col.field] as number | null
              : null;

            // Verificar si este campo coincide con el oficial
            if (normalizedEditedValue !== normalizedOfficialValue) {
              allFieldsMatchOfficial = false;
            }

            // Decidir qué valor guardar:
            // 1. Si el valor actual en editor difiere del oficial → usar el del editor
            // 2. Si el valor ya estaba personalizado en DB → preservarlo
            // 3. Si no hay personalización → usar oficial (o null si no existe oficial)

            if (normalizedEditedValue !== normalizedOfficialValue) {
              // Caso 1: Usuario modificó este campo (difiere del oficial)
              completeTariff[col.field] = normalizedEditedValue;
              hasModificationsInThisRange = true;
              modifiedFieldsCount++;
            } else if (existingValue !== null && existingValue !== normalizedOfficialValue) {
              // Caso 2: Campo ya estaba personalizado en DB (preservar)
              completeTariff[col.field] = existingValue;
              hasModificationsInThisRange = true;
            } else {
              // Caso 3: Campo coincide con oficial o no tiene valor
              completeTariff[col.field] = normalizedOfficialValue;
            }
          });
        });

        // Determinar acción para este rango:
        // - Si todos los campos coinciden con oficial Y existe un registro en DB → ELIMINAR
        // - Si hay modificaciones → GUARDAR/ACTUALIZAR
        // - Si no hay modificaciones ni registro existente → NO HACER NADA

        if (allFieldsMatchOfficial && existingRecord) {
          // Usuario restauró valores oficiales: eliminar el registro personalizado
          recordIdsToDelete.push(existingRecord.id);
          totalRestoredRanges++;
        } else if (hasModificationsInThisRange) {
          // Hay personalizaciones: guardar/actualizar
          if (existingRecord) {
            completeTariff.id = existingRecord.id;
          }
          tariffsToUpsert.push(completeTariff);
          totalModifiedFields += modifiedFieldsCount;
        }
      });

      // Verificar si hay cambios para aplicar
      if (tariffsToUpsert.length === 0 && recordIdsToDelete.length === 0) {
        setSaveMessage('No hay cambios para guardar');
        setTimeout(() => setSaveMessage(null), 3000);
        setIsSaving(false);
        return;
      }

      // Paso 3: Eliminar registros restaurados a oficial
      if (recordIdsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('custom_tariffs')
          .delete()
          .in('id', recordIdsToDelete);

        if (deleteError) {
          console.error('Error deleting restored tariff rows:', deleteError);
          throw deleteError;
        }
      }

      // Paso 4: Guardar registros personalizados (UPDATE o INSERT según corresponda)
      for (const tariff of tariffsToUpsert) {
        if (tariff.id) {
          // UPDATE: registro ya existe
          const { id, ...updateData } = tariff;
          const { error: updateError } = await supabase
            .from('custom_tariffs')
            .update(updateData)
            .eq('id', id);

          if (updateError) {
            console.error('Error updating tariff row:', updateError);
            throw updateError;
          }
        } else {
          // INSERT: registro nuevo
          const { error: insertError } = await supabase
            .from('custom_tariffs')
            .insert([tariff]);

          if (insertError) {
            console.error('Error inserting tariff row:', insertError);
            throw insertError;
          }
        }
      }

      await refetchCustomTariffs();
      setHasUnsavedChanges(false);

      // Construir mensaje de éxito informativo
      const messages: string[] = [];
      if (totalModifiedFields > 0) {
        messages.push(`${totalModifiedFields} campo(s) modificado(s) en ${tariffsToUpsert.length} rango(s)`);
      }
      if (totalRestoredRanges > 0) {
        messages.push(`${totalRestoredRanges} rango(s) restaurado(s) a oficial`);
      }

      setSaveMessage(messages.join(' • '));
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error: any) {
      console.error('Error saving custom tariffs:', error);

      let errorMessage = 'Error al guardar las tarifas';
      if (error?.message) {
        if (error.message.includes('row-level security')) {
          errorMessage = 'Error de permisos. Por favor, cierra sesi\u00f3n y vuelve a iniciar.';
        } else if (error.message.includes('duplicate key')) {
          errorMessage = 'Ya existe una tarifa personalizada para este rango de peso.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      setSaveMessage(errorMessage);
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

  const handleClearAll = async () => {
    const confirmMessage =
      '¡ATENCIÓN! Esta acción eliminará TODAS las tarifas personalizadas de TODOS los servicios.\n\n' +
      'Esta operación NO afecta a la tabla de costes oficial, solo a tus personalizaciones.\n\n' +
      '¿Estás seguro de que deseas continuar?';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    if (!userData) return;

    setIsClearing(true);
    setSaveMessage(null);

    try {
      const { error: tariffError } = await supabase
        .from('custom_tariffs')
        .delete()
        .eq('user_id', userData.id);

      if (tariffError) throw tariffError;

      const { error: activeError } = await supabase
        .from('custom_tariffs_active')
        .delete()
        .eq('user_id', userData.id);

      if (activeError) throw activeError;

      await refetchCustomTariffs();
      await refetchActiveStates();
      loadServiceData();

      setSaveMessage('Todas las tarifas personalizadas han sido eliminadas correctamente');
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (error) {
      console.error('Error clearing all custom tariffs:', error);
      setSaveMessage('Error al eliminar las tarifas personalizadas');
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setIsClearing(false);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Tabla de Costes Personalizada</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-900 text-center leading-relaxed">
                . Costes de Salida (Sal), Recogida (Rec) e Interciudad (Int) son costes totales.<br />
                Arrastres (Arr) solo se tendrá en cuenta para la aplicación de planes comerciales<br />
                PUEDES MODIFICAR ESTA TABLA Y GUARDARLA. ESTARÁ DISPONIBLE COMO TARIFA "PERSONALIZADA".
              </p>
            </div>

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
                          <th key={col.field} className={`px-1 py-1 text-center text-xs font-medium border-r border-gray-200 ${col.label === 'Arr' ? 'text-red-700 bg-red-50' : 'text-gray-600'}`}>
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
                            const isArrColumn = col.label === 'Arr';
                            const isPersonalized = isCustomValue(cellKey);

                            return (
                              <td key={col.field} className={`px-1 py-1 border-r border-gray-200 ${isArrColumn ? 'bg-red-50' : ''}`}>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  data-cell-key={cellKey}
                                  value={isEditing ? draftValue : formatValue(value)}
                                  onFocus={() => handleCellFocus(cellKey)}
                                  onBlur={handleCellBlur}
                                  onChange={(e) => isEditing && setDraftValue(e.target.value)}
                                  onKeyDown={(e) => handleCellKeyDown(e, cellKey)}
                                  className={`w-full px-1 py-1 text-right text-xs border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors ${isArrColumn ? 'text-red-700 font-semibold' : ''} ${isPersonalized ? 'bg-amber-50 font-medium' : 'bg-white'}`}
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
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap border-t p-6 bg-gray-50">
          <div className="flex items-center gap-2">
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
              Limpiar Servicio
            </button>

            <button
              onClick={handleClearAll}
              disabled={isClearing}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <AlertTriangle className="h-4 w-4" />
              {isClearing ? 'Eliminando...' : 'LIMPIAR TOTAL'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <span className="text-sm text-orange-600 font-medium">
                Cambios pendientes sin guardar
              </span>
            )}

            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
              className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Guardando...' : 'GRABAR'}
            </button>

            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              CERRAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
