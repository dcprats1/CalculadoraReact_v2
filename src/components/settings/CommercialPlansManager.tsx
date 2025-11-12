import React, { useState, useEffect } from 'react';
import { X, Plus, Save, Trash2, Edit2, Copy } from 'lucide-react';
import { useCommercialPlans } from '../../hooks/useCommercialPlans';
import {
  CommercialPlan,
  PlanDiscounts,
  EMPTY_PLAN_DISCOUNTS,
  DOMESTIC_SERVICES,
  DOMESTIC_WEIGHT_RANGES,
  INTERNATIONAL_WEIGHT_RANGES,
  SERVICE_DISPLAY_NAMES,
  WEIGHT_RANGE_DISPLAY_NAMES,
  DomesticServiceKey,
  DomesticWeightKey,
  InternationalWeightKey,
} from '../../types/commercialPlans';

interface CommercialPlansManagerProps {
  onClose: () => void;
  onPlanSelected?: (plan: CommercialPlan | null) => void;
}

type EditMode = 'create' | 'edit' | null;

export default function CommercialPlansManager({ onClose, onPlanSelected }: CommercialPlansManagerProps) {
  const { plans, loading, error, createPlan, updatePlan, deletePlan } = useCommercialPlans();

  const [editMode, setEditMode] = useState<EditMode>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [planName, setPlanName] = useState('');
  const [discounts, setDiscounts] = useState<PlanDiscounts>(JSON.parse(JSON.stringify(EMPTY_PLAN_DISCOUNTS)));
  const [saveLoading, setSaveLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const resetForm = () => {
    setEditMode(null);
    setSelectedPlanId(null);
    setPlanName('');
    setDiscounts(JSON.parse(JSON.stringify(EMPTY_PLAN_DISCOUNTS)));
    setValidationError(null);
  };

  const handleCreateNew = () => {
    resetForm();
    setEditMode('create');
  };

  const handleEdit = (plan: CommercialPlan) => {
    setEditMode('edit');
    setSelectedPlanId(plan.id);
    setPlanName(plan.plan_name);
    setDiscounts(JSON.parse(JSON.stringify(plan.discounts)));
    setValidationError(null);
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este plan comercial? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await deletePlan(planId);
      if (onPlanSelected) {
        onPlanSelected(null);
      }
    } catch (err) {
      alert('Error al eliminar el plan: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    }
  };

  const handleDomesticDiscountChange = (service: DomesticServiceKey, weightRange: DomesticWeightKey, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);

    if (isNaN(numValue) || numValue < 0 || numValue > 100) {
      return;
    }

    setDiscounts(prev => ({
      ...prev,
      domestic: {
        ...prev.domestic,
        [service]: {
          ...prev.domestic[service],
          [weightRange]: numValue,
        },
      },
    }));
  };

  const handleInternationalDiscountChange = (weightRange: InternationalWeightKey, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);

    if (isNaN(numValue) || numValue < 0 || numValue > 100) {
      return;
    }

    setDiscounts(prev => ({
      ...prev,
      international: {
        EuroBusinessParcel: {
          ...prev.international.EuroBusinessParcel,
          [weightRange]: numValue,
        },
      },
    }));
  };

  const handleDuplicateRow = (fromService: DomesticServiceKey, toService: DomesticServiceKey) => {
    setDiscounts(prev => ({
      ...prev,
      domestic: {
        ...prev.domestic,
        [toService]: { ...prev.domestic[fromService] },
      },
    }));
  };

  const validateForm = (): boolean => {
    if (!planName.trim()) {
      setValidationError('El nombre del plan es obligatorio');
      return false;
    }

    if (planName.length > 100) {
      setValidationError('El nombre del plan no puede superar 100 caracteres');
      return false;
    }

    const planExists = plans.some(p =>
      p.plan_name.toLowerCase() === planName.toLowerCase() &&
      p.id !== selectedPlanId
    );

    if (planExists) {
      setValidationError('Ya existe un plan con este nombre');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaveLoading(true);

    try {
      if (editMode === 'create') {
        const newPlan = await createPlan(planName, discounts);
        if (onPlanSelected && newPlan) {
          onPlanSelected(newPlan);
        }
      } else if (editMode === 'edit' && selectedPlanId) {
        const updatedPlan = await updatePlan(selectedPlanId, planName, discounts);
        if (onPlanSelected && updatedPlan) {
          onPlanSelected(updatedPlan);
        }
      }
      resetForm();
    } catch (err) {
      alert('Error al guardar el plan: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Gestión de Planes Comerciales</h2>
            <p className="text-blue-100 text-sm mt-1">Crea, modifica o elimina tus planes personalizados</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Plans List Section */}
          {!editMode && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Planes Existentes</h3>
                <button
                  onClick={handleCreateNew}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  disabled={loading}
                >
                  <Plus size={18} />
                  Crear Nuevo Plan
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8 text-gray-500">Cargando planes...</div>
              ) : plans.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  No tienes planes personalizados. Crea uno nuevo para empezar.
                </div>
              ) : (
                <div className="grid gap-3">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">{plan.plan_name}</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Creado: {new Date(plan.created_at).toLocaleDateString('es-ES')}
                            {plan.updated_at !== plan.created_at && (
                              <> • Actualizado: {new Date(plan.updated_at).toLocaleDateString('es-ES')}</>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(plan)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar plan"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(plan.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar plan"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Edit/Create Form */}
          {editMode && (
            <div>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {editMode === 'create' ? 'Crear Nuevo Plan' : 'Editar Plan'}
                  </h3>
                  <button
                    onClick={resetForm}
                    className="text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>

                {/* Plan Name Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Plan *
                  </label>
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="Ej: Plan Q1 2025, Plan Cliente Premium..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={100}
                  />
                  {validationError && (
                    <p className="text-red-600 text-sm mt-1">{validationError}</p>
                  )}
                </div>

                {/* Domestic Services Table */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">Doméstico</span>
                    <span className="text-sm text-gray-500">Provincial, regional y península (excluye intercity)</span>
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Servicio</th>
                          {DOMESTIC_WEIGHT_RANGES.map((range) => (
                            <th key={range} className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">
                              {WEIGHT_RANGE_DISPLAY_NAMES[range]}
                            </th>
                          ))}
                          <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold w-16">
                            Acción
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {DOMESTIC_SERVICES.map((service, index) => (
                          <tr key={service} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="border border-gray-300 px-3 py-2 font-medium text-sm">
                              {SERVICE_DISPLAY_NAMES[service]}
                            </td>
                            {DOMESTIC_WEIGHT_RANGES.map((range) => (
                              <td key={range} className="border border-gray-300 px-1 py-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={discounts.domestic[service][range] || ''}
                                  onChange={(e) => handleDomesticDiscountChange(service, range, e.target.value)}
                                  className="w-full px-2 py-1 text-center border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
                                  placeholder="0"
                                />
                              </td>
                            ))}
                            <td className="border border-gray-300 px-1 py-1 text-center">
                              {index > 0 && (
                                <button
                                  onClick={() => handleDuplicateRow(DOMESTIC_SERVICES[index - 1], service)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Copiar fila anterior"
                                >
                                  <Copy size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* International Services Table */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">Internacional</span>
                    <span className="text-sm text-gray-500">Aplica únicamente a Portugal</span>
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Servicio</th>
                          {INTERNATIONAL_WEIGHT_RANGES.map((range) => (
                            <th key={range} className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">
                              {WEIGHT_RANGE_DISPLAY_NAMES[range]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-white">
                          <td className="border border-gray-300 px-3 py-2 font-medium text-sm">
                            {SERVICE_DISPLAY_NAMES['EuroBusinessParcel']}
                          </td>
                          {INTERNATIONAL_WEIGHT_RANGES.map((range) => (
                            <td key={range} className="border border-gray-300 px-1 py-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={discounts.international.EuroBusinessParcel[range] || ''}
                                onChange={(e) => handleInternationalDiscountChange(range, e.target.value)}
                                className="w-full px-2 py-1 text-center border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
                                placeholder="0"
                              />
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    * Valores vacíos se consideran 0%. Los descuentos se aplican sobre la tarifa base.
                  </p>
                </div>

                {/* Save Button */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={resetForm}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={saveLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saveLoading || !planName.trim()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={18} />
                    {saveLoading ? 'Guardando...' : 'Guardar Plan'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
