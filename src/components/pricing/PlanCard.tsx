import React, { useState } from 'react';
import { Check, Loader2, Smartphone } from 'lucide-react';
import { PricingPlan, getAnnualSavings } from '../../data/plans.data';

interface PlanCardProps {
  plan: PricingPlan;
  isAnnual: boolean;
  onSelect: (tier: number, paymentType: 'monthly' | 'annual') => void;
  isLoading?: boolean;
  viewOnly?: boolean;
  isCurrentPlan?: boolean;
}

export function PlanCard({ plan, isAnnual, onSelect, isLoading, viewOnly = false, isCurrentPlan = false }: PlanCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelect = async () => {
    if (viewOnly) return;
    setIsProcessing(true);
    try {
      await onSelect(plan.tier, isAnnual ? 'annual' : 'monthly');
    } finally {
      setIsProcessing(false);
    }
  };

  const displayPrice = isAnnual ? plan.annualPrice : plan.monthlyPrice;
  const pricePerDevice = isAnnual
    ? Math.round(plan.pricePerDevicePerYear)
    : Math.round((plan.monthlyPrice * 12) / plan.devices);

  const monthlyEquivalent = isAnnual ? Math.round(plan.annualPrice / 12) : null;
  const annualSavings = isAnnual ? getAnnualSavings(plan) : null;

  const badgeColor = plan.isBestValue
    ? 'bg-green-600'
    : plan.badge === 'Popular'
    ? 'bg-blue-600'
    : 'bg-gray-600';

  const buttonColor = plan.isBestValue
    ? 'bg-green-600 hover:bg-green-700'
    : 'bg-gray-900 hover:bg-gray-800';

  return (
    <div
      className={`relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col ${
        plan.isBestValue ? 'ring-2 ring-green-600 scale-105' : ''
      } ${isCurrentPlan ? 'ring-2 ring-blue-600' : ''}`}
    >
      {isCurrentPlan && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
            Tu plan actual
          </span>
        </div>
      )}
      {plan.badge && !isCurrentPlan && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span
            className={`${badgeColor} text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg`}
          >
            {plan.badge}
          </span>
        </div>
      )}

      <div className="p-8 flex-1 flex flex-col">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <Smartphone className="h-4 w-4" />
            <span className="text-sm">
              {plan.devices} {plan.devices === 1 ? 'dispositivo' : 'dispositivos'}
            </span>
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="mb-2">
            <span className="text-5xl font-bold text-gray-900">€{displayPrice}</span>
            <span className="text-gray-600 text-lg">
              /{isAnnual ? 'año' : 'mes'}
            </span>
          </div>

          {isAnnual && monthlyEquivalent && (
            <p className="text-sm text-gray-600">
              Equivale a <span className="font-semibold">€{monthlyEquivalent}/mes</span>
            </p>
          )}

          {!isAnnual && (
            <p className="text-sm text-gray-500">
              €{plan.monthlyPrice * 12}/año sin descuento
            </p>
          )}
        </div>

        {isAnnual && plan.monthsFree > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
            <p className="text-green-800 font-semibold text-sm text-center">
              {plan.monthsFree} {plan.monthsFree === 1 ? 'mes' : 'meses'} gratis
            </p>
            <p className="text-green-700 text-xs text-center mt-1">
              Pagas {12 - plan.monthsFree}, usas 12
            </p>
          </div>
        )}

        {isAnnual && annualSavings && annualSavings > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
            <p className="text-blue-800 font-semibold text-sm text-center">
              Ahorras €{annualSavings} al año
            </p>
            <p className="text-blue-700 text-xs text-center mt-1">
              vs. pago mensual
            </p>
          </div>
        )}

        <div className="mb-6">
          <p className="text-center text-sm text-gray-600">
            <span className="font-semibold text-gray-900">
              €{pricePerDevice}/dispositivo
            </span>
            {isAnnual ? '/año' : '/año'}
          </p>
          {plan.savingsPerDeviceVsPlan1 > 0 && (
            <p className="text-center text-xs text-green-600 mt-1">
              Ahorras €{plan.savingsPerDeviceVsPlan1.toFixed(0)} vs. Plan Básico
            </p>
          )}
        </div>

        {viewOnly ? (
          <div className="w-full bg-gray-100 text-gray-600 font-semibold py-4 px-6 rounded-xl text-center">
            {isCurrentPlan ? 'Plan activo' : 'Contacta comercial para cambiar'}
          </div>
        ) : (
          <button
            onClick={handleSelect}
            disabled={isProcessing || isLoading}
            className={`w-full ${buttonColor} text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Procesando...
              </>
            ) : (
              `Seleccionar ${plan.name}`
            )}
          </button>
        )}

        <div className="mt-8 space-y-3">
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-gray-700">
              {plan.devices} {plan.devices === 1 ? 'dispositivo activo' : 'dispositivos activos'}
            </span>
          </div>
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-gray-700">Soporte técnico 24/7</span>
          </div>
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-gray-700">
              Actualizaciones automáticas incluidas
            </span>
          </div>
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-gray-700">
              Comparador comercial y generador de tarifas
            </span>
          </div>
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-gray-700">Exportación a Excel/PDF</span>
          </div>
        </div>
      </div>
    </div>
  );
}
