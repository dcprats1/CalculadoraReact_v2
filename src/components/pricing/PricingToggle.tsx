import React from 'react';

interface PricingToggleProps {
  isAnnual: boolean;
  onToggle: (isAnnual: boolean) => void;
}

export function PricingToggle({ isAnnual, onToggle }: PricingToggleProps) {
  return (
    <div className="flex items-center justify-center gap-4 mb-12">
      <span
        className={`text-lg font-medium transition-colors ${
          !isAnnual ? 'text-gray-900' : 'text-gray-500'
        }`}
      >
        Mensual
      </span>

      <button
        onClick={() => onToggle(!isAnnual)}
        className="relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        style={{
          backgroundColor: isAnnual ? '#16a34a' : '#9ca3af',
        }}
        role="switch"
        aria-checked={isAnnual}
        aria-label="Cambiar entre pago mensual y anual"
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
            isAnnual ? 'translate-x-9' : 'translate-x-1'
          }`}
        />
      </button>

      <div className="flex items-center gap-2">
        <span
          className={`text-lg font-medium transition-colors ${
            isAnnual ? 'text-gray-900' : 'text-gray-500'
          }`}
        >
          Anual
        </span>
        {isAnnual && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 animate-pulse">
            Ahorra hasta 16.7%
          </span>
        )}
      </div>
    </div>
  );
}
