import React, { useState, useEffect } from 'react';
import { usePreferences } from '../../contexts/PreferencesContext';
import { Save, Loader2, CheckCircle } from 'lucide-react';

export function PreferencesTab() {
  const { preferences, updatePreferences, isLoading } = usePreferences();
  const [formData, setFormData] = useState({
    fixed_spc_value: '',
    fixed_discount_percentage: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (preferences) {
      setFormData({
        fixed_spc_value: preferences.fixed_spc_value?.toString() || '',
        fixed_discount_percentage: preferences.fixed_discount_percentage?.toString() || '',
      });
    }
  }, [preferences]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    const updates = {
      fixed_spc_value: formData.fixed_spc_value ? parseFloat(formData.fixed_spc_value) : null,
      fixed_discount_percentage: formData.fixed_discount_percentage ? parseFloat(formData.fixed_discount_percentage) : null,
    };

    const success = await updatePreferences(updates);

    setIsSaving(false);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Preferencias de cálculo
        </h3>

        <div className="space-y-6 bg-gray-50 rounded-lg p-6">
          <div>
            <label htmlFor="fixed_spc_value" className="block text-sm font-medium text-gray-700 mb-2">
              Valor SPC fijo (opcional)
            </label>
            <input
              type="number"
              id="fixed_spc_value"
              step="0.01"
              value={formData.fixed_spc_value}
              onChange={(e) => setFormData({ ...formData, fixed_spc_value: e.target.value })}
              placeholder="Ej: 1.50"
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Si estableces un valor (positivo o negativo), los cálculos usarán este SPC automáticamente
            </p>
          </div>

          <div>
            <label htmlFor="fixed_discount_percentage" className="block text-sm font-medium text-gray-700 mb-2">
              Descuento lineal fijo % (opcional)
            </label>
            <input
              type="number"
              id="fixed_discount_percentage"
              step="0.1"
              min="0"
              max="100"
              value={formData.fixed_discount_percentage}
              onChange={(e) => setFormData({ ...formData, fixed_discount_percentage: e.target.value })}
              placeholder="Ej: 5.0"
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Si estableces un valor, los cálculos aplicarán este descuento automáticamente (debe ser positivo)
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        {saveSuccess && (
          <div className="flex items-center text-green-600">
            <CheckCircle className="h-5 w-5 mr-2" />
            <span className="text-sm font-medium">Preferencias guardadas</span>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="ml-auto flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="-ml-1 mr-2 h-5 w-5" />
              Guardar cambios
            </>
          )}
        </button>
      </div>
    </div>
  );
}
