import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Plus, Trash2, AlertCircle } from 'lucide-react';

interface CostOverride {
  id: string;
  service_name: string;
  weight_from: number;
  weight_to: number | null;
  cost_factor_name: string;
  override_value: number;
  is_active: boolean;
}

export function CustomCostsTab() {
  const [usesCustomTable, setUsesCustomTable] = useState(false);
  const [overrides, setOverrides] = useState<CostOverride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const [prefsResult, overridesResult] = await Promise.all([
        supabase
          .from('user_preferences')
          .select('uses_custom_cost_table')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('custom_cost_overrides')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('service_name'),
      ]);

      if (prefsResult.data) {
        setUsesCustomTable(prefsResult.data.uses_custom_cost_table || false);
      }

      if (overridesResult.data) {
        setOverrides(overridesResult.data);
      }
    } catch (err) {
      console.error('Error loading custom costs:', err);
      setError('Error al cargar datos personalizados');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleCustomTable() {
    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { error: updateError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          uses_custom_cost_table: !usesCustomTable,
        });

      if (updateError) throw updateError;

      setUsesCustomTable(!usesCustomTable);
      setSuccess('Configuración actualizada');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating preference:', err);
      setError('Error al actualizar configuración');
    } finally {
      setIsSaving(false);
    }
  }

  function addOverride() {
    const newOverride: CostOverride = {
      id: `new-${Date.now()}`,
      service_name: 'Nacional',
      weight_from: 0,
      weight_to: 5,
      cost_factor_name: 'national_price',
      override_value: 0,
      is_active: true,
    };
    setOverrides([...overrides, newOverride]);
  }

  function removeOverride(id: string) {
    setOverrides(overrides.filter(o => o.id !== id));
  }

  function updateOverride(id: string, field: keyof CostOverride, value: any) {
    setOverrides(overrides.map(o =>
      o.id === id ? { ...o, [field]: value } : o
    ));
  }

  async function handleSaveOverrides() {
    try {
      setIsSaving(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      await supabase
        .from('custom_cost_overrides')
        .delete()
        .eq('user_id', user.id);

      if (overrides.length > 0) {
        const overridesToInsert = overrides.map(o => ({
          user_id: user.id,
          service_name: o.service_name,
          weight_from: o.weight_from,
          weight_to: o.weight_to,
          cost_factor_name: o.cost_factor_name,
          override_value: o.override_value,
          is_active: true,
        }));

        const { error: insertError } = await supabase
          .from('custom_cost_overrides')
          .insert(overridesToInsert);

        if (insertError) throw insertError;
      }

      setSuccess('Tabla personalizada guardada correctamente');
      setTimeout(() => setSuccess(null), 3000);
      await loadData();
    } catch (err) {
      console.error('Error saving overrides:', err);
      setError('Error al guardar tabla personalizada');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-blue-900">Tabla de costes personalizada</h3>
            <p className="text-sm text-blue-700 mt-1">
              Puedes sobreescribir valores específicos de la tabla estándar de costes.
              Solo afectan a los valores que configures aquí.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Usar tabla personalizada</h3>
          <p className="text-sm text-gray-500 mt-1">
            {usesCustomTable
              ? 'La calculadora usa tus valores personalizados'
              : 'La calculadora usa la tabla estándar'}
          </p>
        </div>
        <button
          onClick={handleToggleCustomTable}
          disabled={isSaving}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
            usesCustomTable ? 'bg-blue-600' : 'bg-gray-200'
          } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              usesCustomTable ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {usesCustomTable && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Valores personalizados</h3>
            <button
              onClick={addOverride}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              Añadir valor
            </button>
          </div>

          {overrides.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500">No hay valores personalizados</p>
              <button
                onClick={addOverride}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700"
              >
                Añadir el primero
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {overrides.map((override) => (
                <div key={override.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Servicio
                      </label>
                      <select
                        value={override.service_name}
                        onChange={(e) => updateOverride(override.id, 'service_name', e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="Nacional">Nacional</option>
                        <option value="Provincial">Provincial</option>
                        <option value="Urgente">Urgente</option>
                        <option value="Paquetería">Paquetería</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Peso desde (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={override.weight_from}
                        onChange={(e) => updateOverride(override.id, 'weight_from', parseFloat(e.target.value))}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Peso hasta (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={override.weight_to || ''}
                        onChange={(e) => updateOverride(override.id, 'weight_to', e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="Ilimitado"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Valor (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={override.override_value}
                        onChange={(e) => updateOverride(override.id, 'override_value', parseFloat(e.target.value))}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={() => removeOverride(override.id)}
                        className="w-full px-3 py-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {overrides.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={handleSaveOverrides}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
          {success}
        </div>
      )}
    </div>
  );
}
