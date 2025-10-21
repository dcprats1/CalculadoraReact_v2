import React, { useState } from 'react';
import { X, Calculator, Shield, Info } from 'lucide-react';
import { pricingPlans } from '../../data/plans.data';
import { PricingToggle } from './PricingToggle';
import { PlanCard } from './PlanCard';

interface PlanViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: number;
}

export function PlanViewModal({ isOpen, onClose, currentTier }: PlanViewModalProps) {
  const [isAnnual, setIsAnnual] = useState(true);

  if (!isOpen) return null;

  const handleDummySelect = () => {};

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block w-full max-w-7xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                <Calculator className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Planes disponibles</h2>
                <p className="text-sm text-gray-600">Comparativa de precios y características</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="px-6 py-8 max-h-[calc(100vh-12rem)] overflow-y-auto">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-900 font-medium">
                  Esta es una vista informativa de los planes disponibles
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  Para cambiar de plan, actualizar métodos de pago o consultar facturas, por favor contacta con el departamento comercial.
                </p>
              </div>
            </div>

            <div className="mb-6">
              <PricingToggle isAnnual={isAnnual} onToggle={setIsAnnual} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
              {pricingPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isAnnual={isAnnual}
                  onSelect={handleDummySelect}
                  viewOnly={true}
                  isCurrentPlan={currentTier === plan.tier}
                />
              ))}
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-gray-700" />
                Beneficios incluidos en todos los planes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-2">Precisión Total</h4>
                  <p className="text-sm text-gray-600">
                    Cálculos exactos incluyendo costes ocultos e incrementos
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-2">Ahorro Inmediato</h4>
                  <p className="text-sm text-gray-600">
                    Recupera tu inversión en días con un solo uso diario
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-2">Comparativa Competitiva</h4>
                  <p className="text-sm text-gray-600">
                    Genera propuestas profesionales en minutos
                  </p>
                </div>
              </div>
            </div>

            {isAnnual && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-4 mt-6">
                <p className="text-center text-gray-800">
                  <span className="font-bold text-green-700">Plan Corporativo:</span> Hasta 58% más barato por dispositivo que planes individuales
                </p>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
