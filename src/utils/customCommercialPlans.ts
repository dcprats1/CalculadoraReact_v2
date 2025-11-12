import {
  CommercialPlan,
  DomesticServiceKey,
  DomesticWeightKey,
  InternationalWeightKey,
} from '../types/commercialPlans';
import { Tariff } from '../lib/supabase';
import { DestinationZone } from './calculations';

const SERVICE_NAME_MAP: Record<string, DomesticServiceKey | null> = {
  'Urg8:30H Courier': 'Express8:30',
  'Urg10H Courier': 'Express10:30',
  'Urg14H Courier': 'Express14:00',
  'Urg19H Courier': 'Express19:00',
  'Business Parcel': 'BusinessParcel',
  'Economy Parcel': 'EconomyParcel',
};

export function getCustomPlanDiscountForWeight(
  plan: CommercialPlan | null,
  serviceName: string,
  weight: number
): number {
  if (!plan) return 0;

  const mappedService = SERVICE_NAME_MAP[serviceName];
  if (!mappedService) return 0;

  const serviceDiscounts = plan.discounts.domestic[mappedService];
  if (!serviceDiscounts) return 0;

  let discountKey: DomesticWeightKey;

  if (weight <= 1) {
    discountKey = '1kg';
  } else if (weight <= 3) {
    discountKey = '3kg';
  } else if (weight <= 5) {
    discountKey = '5kg';
  } else if (weight <= 10) {
    discountKey = '10kg';
  } else if (weight <= 15) {
    discountKey = '15kg';
  } else {
    discountKey = 'additional';
  }

  return serviceDiscounts[discountKey] || 0;
}

export function getCustomPlanDiscountForInternational(
  plan: CommercialPlan | null,
  serviceName: string,
  weight: number
): number {
  if (!plan) return 0;

  if (serviceName !== 'EuroBusiness Parcel') return 0;

  const serviceDiscounts = plan.discounts.international.EuroBusinessParcel;
  if (!serviceDiscounts) return 0;

  let discountKey: InternationalWeightKey;

  if (weight < 15) {
    discountKey = 'under15kg';
  } else if (weight === 15) {
    discountKey = '15kg';
  } else {
    discountKey = 'additional';
  }

  return serviceDiscounts[discountKey] || 0;
}

const ALLOWED_ZONES_FOR_DISCOUNT: Set<DestinationZone> = new Set([
  'Provincial',
  'Regional',
  'Nacional'
]);

const ARR_FIELD_MAP: Partial<Record<DestinationZone, keyof Tariff>> = {
  Provincial: 'provincial_arr',
  Regional: 'regional_arr',
  Nacional: 'nacional_arr',
  Portugal: 'portugal_arr'
};

function getTariffNumericValue(tariff: Tariff, field: keyof Tariff): number | null {
  const value = tariff[field];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function roundUp(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  return Math.ceil(value * 100 - 1e-9) / 100;
}

export function calculateCustomPlanDiscount(
  tariffs: Tariff[],
  plan: CommercialPlan | null,
  serviceName: string,
  zone: DestinationZone,
  weight: number,
  shippingMode?: 'salida' | 'recogida' | 'interciudad'
): number {
  if (!plan) return 0;

  // Los descuentos SOLO se aplican a Salida y Recogida, NUNCA a Interciudad
  if (shippingMode === 'interciudad') {
    return 0;
  }

  // Verificar que la zona está permitida
  const isEuroBusiness = serviceName === 'EuroBusiness Parcel';
  const isPortugal = zone === 'Portugal';

  if (isPortugal && !isEuroBusiness) {
    return 0;
  }

  if (!isPortugal && !ALLOWED_ZONES_FOR_DISCOUNT.has(zone)) {
    return 0;
  }

  // Obtener el campo ARR para esta zona
  const arrField = ARR_FIELD_MAP[zone];
  if (!arrField) {
    return 0;
  }

  // Obtener el porcentaje de descuento del plan
  let discountPercentage: number;
  if (isEuroBusiness && isPortugal) {
    discountPercentage = getCustomPlanDiscountForInternational(plan, serviceName, weight);
  } else {
    discountPercentage = getCustomPlanDiscountForWeight(plan, serviceName, weight);
  }

  if (discountPercentage === 0) {
    return 0;
  }

  // Redondear peso hacia arriba
  const roundedWeight = Math.ceil(weight);
  if (roundedWeight <= 0) {
    return 0;
  }

  // Buscar la tarifa base
  const sorted = [...tariffs]
    .filter(t => t.service_name === serviceName)
    .sort((a, b) => a.weight_from - b.weight_from);

  if (!sorted.length) {
    return 0;
  }

  // Buscar la tarifa que contiene el peso
  const baseTariff = sorted.find(
    t => t.weight_from <= roundedWeight &&
         (t.weight_to === null || t.weight_to === undefined || t.weight_to >= roundedWeight) &&
         t.weight_from !== 999
  );

  if (!baseTariff) {
    return 0;
  }

  // Obtener el valor ARR de la tarifa base
  const baseArr = getTariffNumericValue(baseTariff, arrField);
  if (!baseArr || !Number.isFinite(baseArr)) {
    return 0;
  }

  // Calcular el descuento sobre ARR
  const discountAmount = baseArr * (discountPercentage / 100);

  // Si el peso excede el rango base, calcular descuento adicional sobre +1
  const baseThreshold = baseTariff.weight_to ?? baseTariff.weight_from;
  if (roundedWeight > baseThreshold) {
    const plusOneTariff = sorted.find(t => t.weight_from === 999);
    if (plusOneTariff) {
      const arrAdditional = getTariffNumericValue(plusOneTariff, arrField);
      if (arrAdditional && Number.isFinite(arrAdditional)) {
        const extraWeight = roundedWeight - baseThreshold;
        const increments = Math.ceil(extraWeight);
        const additionalDiscount = arrAdditional * (discountPercentage / 100) * increments;
        return roundUp(discountAmount + additionalDiscount);
      }
    }
  }

  return roundUp(discountAmount);
}

// Función legacy para compatibilidad (deprecated)
export function applyCustomPlanDiscount(
  baseCost: number,
  plan: CommercialPlan | null,
  serviceName: string,
  weight: number,
  isInternational: boolean = false
): number {
  // Esta función está deprecated, pero se mantiene por compatibilidad
  // El cálculo real debe hacerse con calculateCustomPlanDiscount
  if (!plan || baseCost === 0) return baseCost;

  let discountPercentage: number;

  if (isInternational) {
    discountPercentage = getCustomPlanDiscountForInternational(plan, serviceName, weight);
  } else {
    discountPercentage = getCustomPlanDiscountForWeight(plan, serviceName, weight);
  }

  if (discountPercentage === 0) return baseCost;

  const discountAmount = baseCost * (discountPercentage / 100);
  return Math.max(0, baseCost - discountAmount);
}

export function getCustomPlanDisplayInfo(plan: CommercialPlan | null): { name: string; description: string } {
  if (!plan) {
    return {
      name: 'Sin plan personalizado',
      description: 'No hay plan personalizado aplicado',
    };
  }

  return {
    name: plan.plan_name,
    description: 'Plan comercial personalizado',
  };
}
