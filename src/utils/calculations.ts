import { Tariff, DiscountPlan } from '../lib/supabase';
import {
  findPlanForServiceGroup,
  getCustomPlanDefinition,
  getCustomPlanPercentage,
  normalizePlanGroupKey
} from './customPlans';

const SOP_DEBUG_ENABLED =
  typeof import.meta !== 'undefined' &&
  typeof import.meta.env !== 'undefined' &&
  Boolean(import.meta.env.DEV);

const sopLog = (...args: unknown[]) => {
  if (SOP_DEBUG_ENABLED) {
    console.log('[SOP]', ...args);
  }
};

export const STATIC_SERVICES = [
  'Urg8:30H Courier',
  'Urg10H Courier',
  'Urg14H Courier',
  'Urg19H Courier',
  'Business Parcel',
  'EuroBusiness Parcel',
  'Economy Parcel',
  'Marítimo',
  'Parcel Shop'
] as const;

export const DESTINATION_ZONES = [
  'Provincial',
  'Regional',
  'Nacional',
  'Portugal',
  'Madeira Mayores',
  'Madeira Menores',
  'Azores Mayores',
  'Azores Menores',
  'Andorra',
  'Gibraltar',
  'Canarias Mayores',
  'Canarias Menores',
  'Baleares Mayores',
  'Baleares Menores',
  'Ceuta',
  'Melilla'
] as const;

export type DestinationZone = typeof DESTINATION_ZONES[number];

const ZONE_KEY_MAP: Record<DestinationZone, string> = {
  Provincial: 'provincial',
  Regional: 'regional',
  Nacional: 'nacional',
  Portugal: 'portugal',
  'Madeira Mayores': 'madeira_mayores',
  'Madeira Menores': 'madeira_menores',
  'Azores Mayores': 'azores_mayores',
  'Azores Menores': 'azores_menores',
  Andorra: 'andorra',
  Gibraltar: 'gibraltar',
  'Canarias Mayores': 'canarias_mayores',
  'Canarias Menores': 'canarias_menores',
  'Baleares Mayores': 'baleares_mayores',
  'Baleares Menores': 'baleares_menores',
  Ceuta: 'ceuta',
  Melilla: 'melilla'
};

export const SHIPPING_MODES = ['salida', 'recogida', 'interciudad'] as const;

export type ShippingMode = typeof SHIPPING_MODES[number];

export const SHIPPING_MODE_LABELS: Record<ShippingMode, string> = {
  salida: 'Salida',
  recogida: 'Recogida',
  interciudad: 'Interciudad'
};

const SHIPPING_MODE_SUFFIX: Record<ShippingMode, 'sal' | 'rec' | 'int'> = {
  salida: 'sal',
  recogida: 'rec',
  interciudad: 'int'
};

const BUSINESS_ISLAND_ZONES = new Set<DestinationZone>([
  'Canarias Mayores',
  'Canarias Menores',
  'Baleares Mayores',
  'Baleares Menores'
]);

const MARITIME_SPECIAL_ZONES = new Set<DestinationZone>([
  'Azores Mayores',
  'Azores Menores',
  'Madeira Mayores',
  'Madeira Menores'
]);

const OPEN_RANGE_THRESHOLD = 999;

const EPSILON = 1e-9;
const CENT_FACTOR = 100;

export const roundUp = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value <= 0) {
    return 0;
  }

  return Math.ceil(value * CENT_FACTOR - EPSILON) / CENT_FACTOR;
};

const INTERMEDIATE_FACTOR = 1000000;

export const roundIntermediate = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value <= 0) {
    return 0;
  }

  return Math.round(value * INTERMEDIATE_FACTOR) / INTERMEDIATE_FACTOR;
};

export const getEnergyRateForService = (service: string): number => {
  if (service === 'Economy Parcel' || service === 'Marítimo') {
    return 0;
  }

  return 0.0705;
};

const normalizeServiceName = (serviceName: string): string =>
  serviceName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const isMaritimeService = (serviceName: string): boolean =>
  normalizeServiceName(serviceName) === 'maritimo';

const isBusinessParcelService = (serviceName: string): boolean =>
  normalizeServiceName(serviceName) === 'business parcel';

export const isParcelShopService = (serviceName: string): boolean =>
  normalizeServiceName(serviceName) === 'parcel shop';

const COST_FIELD_MAP: Record<DestinationZone, Record<ShippingMode, keyof Tariff>> = {
  Provincial: {
    salida: 'provincial_sal',
    recogida: 'provincial_rec',
    interciudad: 'provincial_int'
  },
  Regional: {
    salida: 'regional_sal',
    recogida: 'regional_rec',
    interciudad: 'regional_int'
  },
  Nacional: {
    salida: 'nacional_sal',
    recogida: 'nacional_rec',
    interciudad: 'nacional_int'
  },
  Portugal: {
    salida: 'portugal_sal',
    recogida: 'portugal_rec',
    interciudad: 'portugal_int'
  },
  'Madeira Mayores': {
    salida: 'madeira_mayores_sal',
    recogida: 'madeira_mayores_rec',
    interciudad: 'madeira_mayores_int'
  },
  'Madeira Menores': {
    salida: 'madeira_menores_sal',
    recogida: 'madeira_menores_rec',
    interciudad: 'madeira_menores_int'
  },
  'Azores Mayores': {
    salida: 'azores_mayores_sal',
    recogida: 'azores_mayores_rec',
    interciudad: 'azores_mayores_int'
  },
  'Azores Menores': {
    salida: 'azores_menores_sal',
    recogida: 'azores_menores_rec',
    interciudad: 'azores_menores_int'
  },
  Andorra: {
    salida: 'andorra_sal',
    recogida: 'andorra_rec',
    interciudad: 'andorra_int'
  },
  Gibraltar: {
    salida: 'gibraltar_sal',
    recogida: 'gibraltar_rec',
    interciudad: 'gibraltar_int'
  },
  'Canarias Mayores': {
    salida: 'canarias_mayores_sal',
    recogida: 'canarias_mayores_rec',
    interciudad: 'canarias_mayores_int'
  },
  'Canarias Menores': {
    salida: 'canarias_menores_sal',
    recogida: 'canarias_menores_rec',
    interciudad: 'canarias_menores_int'
  },
  'Baleares Mayores': {
    salida: 'baleares_mayores_sal',
    recogida: 'baleares_mayores_rec',
    interciudad: 'baleares_mayores_int'
  },
  'Baleares Menores': {
    salida: 'baleares_menores_sal',
    recogida: 'baleares_menores_rec',
    interciudad: 'baleares_menores_int'
  },
  Ceuta: {
    salida: 'ceuta_sal',
    recogida: 'ceuta_rec',
    interciudad: 'ceuta_int'
  },
  Melilla: {
    salida: 'melilla_sal',
    recogida: 'melilla_rec',
    interciudad: 'melilla_int'
  }
};

// NOTA: Las columnas *_price ya no existen en la BD
// La tabla tariffs solo contiene columnas *_sal, *_rec, *_int y *_arr
// Los precios se calculan dinámicamente a partir de los costes

const ARR_FIELD_MAP: Partial<Record<DestinationZone, keyof Tariff>> = {
  Provincial: 'provincial_arr',
  Regional: 'regional_arr',
  Nacional: 'nacional_arr',
  Portugal: 'portugal_arr',
  'Madeira Mayores': 'madeira_mayores_arr',
  'Madeira Menores': 'madeira_menores_arr',
  'Azores Mayores': 'azores_mayores_arr',
  'Azores Menores': 'azores_menores_arr',
  Andorra: 'andorra_arr',
  Gibraltar: 'gibraltar_arr',
  'Canarias Mayores': 'canarias_mayores_arr',
  'Canarias Menores': 'canarias_menores_arr',
  'Baleares Mayores': 'baleares_mayores_arr',
  'Baleares Menores': 'baleares_menores_arr',
  Ceuta: 'ceuta_arr',
  Melilla: 'melilla_arr'
};

type ServiceIncrementConfig = {
  base: number;
  overrides: Partial<Record<DestinationZone, number>>;
};

const SERVICE_INCREMENT_RULES: Record<string, ServiceIncrementConfig> = {
  'Urg8:30H Courier': {
    base: 9,
    overrides: {
      'Canarias Mayores': 10,
      'Canarias Menores': 10
    }
  },
  'Urg10H Courier': {
    base: 9,
    overrides: {
      'Canarias Mayores': 10,
      'Canarias Menores': 10,
      'Baleares Mayores': 10,
      'Baleares Menores': 10
    }
  },
  'Urg14H Courier': {
    base: 9,
    overrides: {
      'Canarias Mayores': 10,
      'Canarias Menores': 10,
      'Baleares Mayores': 10,
      'Baleares Menores': 10
    }
  },
  'Urg19H Courier': {
    base: 6,
    overrides: {
      'Canarias Mayores': 10,
      'Canarias Menores': 10,
      'Baleares Mayores': 10,
      'Baleares Menores': 10
    }
  },
  'Economy Parcel': {
    base: 2,
    overrides: {
      'Canarias Mayores': 4,
      'Canarias Menores': 4,
      'Baleares Mayores': 4,
      'Baleares Menores': 4
    }
  },
  'Marítimo': { base: 4, overrides: {} },
  'Business Parcel': {
    base: 0,
    overrides: {
      'Canarias Mayores': 4,
      'Canarias Menores': 4
    }
  },
  'EuroBusiness Parcel': { base: 0, overrides: {} },
  'Parcel Shop': { base: 0, overrides: {} }
};

const SERVICE_INCREMENT_2025_RULES: Record<string, Partial<Record<DestinationZone, number>>> = {
  'Urg8:30H Courier': {
    Provincial: 5,
    Regional: 5,
    Nacional: 5,
    Portugal: 5,
    'Baleares Mayores': 5,
    'Baleares Menores': 5
  },
  'Urg10H Courier': {
    Provincial: 5,
    Regional: 5,
    Nacional: 5,
    Portugal: 5,
    'Baleares Mayores': 5,
    'Baleares Menores': 5
  },
  'Urg14H Courier': {
    Provincial: 5,
    Regional: 5,
    Nacional: 5,
    Portugal: 5,
    'Baleares Mayores': 5,
    'Baleares Menores': 5
  },
  'Urg19H Courier': {
    Provincial: 3,
    Regional: 3,
    Nacional: 3,
    Portugal: 3,
    Andorra: 3,
    Gibraltar: 3
  }
};

const UNIVERSAL_INCREMENT_2025_OVERRIDES: Partial<Record<DestinationZone, number>> = {
  'Canarias Mayores': 3,
  'Canarias Menores': 3,
  'Baleares Mayores': 3,
  'Baleares Menores': 3
};

const getServiceIncrementConfig = (service: string): ServiceIncrementConfig => {
  const config = SERVICE_INCREMENT_RULES[service];
  if (!config) {
    return { base: 0, overrides: {} };
  }
  return {
    base: config.base,
    overrides: config.overrides ?? {}
  };
};

const getZoneIncrement2024 = (service: string, zone: DestinationZone): number => {
  const config = getServiceIncrementConfig(service);
  return config.overrides[zone] ?? config.base;
};

const getZoneIncrement2025 = (service: string, zone: DestinationZone): number => {
  const serviceOverrides = SERVICE_INCREMENT_2025_RULES[service];
  const serviceValue = serviceOverrides?.[zone] ?? 0;

  if (service === 'EuroBusiness Parcel') {
    return serviceValue;
  }

  const universalValue = UNIVERSAL_INCREMENT_2025_OVERRIDES[zone] ?? 0;

  return Math.max(serviceValue, universalValue);
};

export const COST_BREAKDOWN_HEADERS = [
  'Coste Inicial calculado en base al peso y medidas indicadas',
  'Descuento lineal',
  'Climate Protect 1,5%',
  'Canon Red (Fijo) 0,27€',
  'Canon Digital (Fijo) 0,06€',
  'No Vol. (FIJO) 0,04€',
  'Ampl. Cobertura (1,95%)',
  'Energía (7,50%)',
  'Suplementos (Variable)',
  'Irregular (Variable)',
  'Total suma de conceptos anteriores',
  'Incr. 2024 (%) editable',
  'Incr. 2025 (%) editable',
  'Incr. 2026 (%) editable',
  'SPC en € (editable)',
  'TOTAL COSTE (Suma de todo lo anterior)'
] as const;

export interface PackageDimensions {
  height: number;
  width: number;
  length: number;
}

export interface PackageData {
  id: string;
  weight: number;
  dimensions?: {
    height: number; // cm
    width: number;  // cm
    length: number; // cm
  };
  volumetricWeight?: number;
  finalWeight?: number;
  quantity?: number;
}

export type CostBreakdownStatus = 'idle' | 'calculated' | 'not_available';

export interface CostBreakdown {
  initialCost: number;
  linearDiscount: number; // % aplicado sobre el coste inicial
  climateProtect: number; // 1.5%
  canonRed: number; // 0.27€ fixed
  canonDigital: number; // 0.06€ fixed
  noVol: number; // 0.04€ fixed
  amplCobertura: number; // 1.95%
  energia: number; // 7.50%
  suplementos: number; // Variable
  irregular: number; // Variable
  mileageCost: number; // Coste variable por kilometraje
  saturdayCost: number; // Coste fijo por entrega en sábado
  subtotal: number;
  incr2024: number; // % automatizado
  incr2025: number; // % automatizado
  incr2026: number; // % editable
  incr2024Percent: number;
  incr2025Percent: number;
  incr2026Percent: number;
  spc: number; // € editable
  totalCost: number;
  status: CostBreakdownStatus;
}

const BASE_COST_BREAKDOWN: Omit<CostBreakdown, 'status'> = {
  initialCost: 0,
  linearDiscount: 0,
  climateProtect: 0,
  canonRed: 0,
  canonDigital: 0,
  noVol: 0,
  amplCobertura: 0,
  energia: 0,
  suplementos: 0,
  irregular: 0,
  mileageCost: 0,
  saturdayCost: 0,
  subtotal: 0,
  incr2024: 0,
  incr2025: 0,
  incr2026: 0,
  incr2024Percent: 0,
  incr2025Percent: 0,
  incr2026Percent: 0,
  spc: 0,
  totalCost: 0
};

export const EMPTY_COST_BREAKDOWN: CostBreakdown = {
  ...BASE_COST_BREAKDOWN,
  status: 'idle'
};

export function createEmptyCostBreakdown(status: CostBreakdownStatus = 'idle'): CostBreakdown {
  return { ...BASE_COST_BREAKDOWN, status };
}

export interface CalculationResult {
  serviceName: string;
  cost: number;
  price: number;
  margin: number;
  marginPercentage: number;
  discount: number;
  originalPrice: number;
  actualWeight: number;
  volumetricWeight?: number;
  finalWeight: number;
  costBreakdown?: CostBreakdown;
  quantity?: number;
}

export interface SimulationResult {
  packages: PackageData[];
  results: CalculationResult[];
  totals: {
    totalCost: number;
    totalPrice: number;
    totalWeight: number;
    totalPackages: number;
    averageMarginPercentage: number;
  };
}

export function findTariffForWeight(tariffs: Tariff[], serviceName: string, weight: number): Tariff | null {
  const roundedWeight = Math.ceil(Math.max(weight, 0));

  // Los rangos son inclusivos: 0-1, 1-3, 3-5, 5-10, 10-15, 15-999
  // Un peso de 1.001kg redondeado a 2kg debe ir al rango 1-3 (no al 0-1)
  // La lógica correcta es: weight > weight_from && weight <= weight_to
  // EXCEPTO para el primer rango (0-X) que debe incluir desde 0

  return tariffs.find(tariff => {
    if (tariff.service_name !== serviceName) return false;

    const isFirstRange = tariff.weight_from === 0;
    const isOpenRange = tariff.weight_to === null || tariff.weight_to >= 999;

    if (isFirstRange) {
      // Primer rango: incluye desde 0 hasta weight_to (inclusive)
      return roundedWeight >= tariff.weight_from &&
             (tariff.weight_to === null || roundedWeight <= tariff.weight_to);
    } else if (isOpenRange) {
      // Rango abierto (15-999): incluye desde weight_from + 0.001 en adelante
      return roundedWeight > tariff.weight_from;
    } else {
      // Rangos intermedios: excluye weight_from, incluye weight_to
      // Ejemplo: rango 1-3 aplica para pesos 2kg y 3kg (no 1kg)
      return roundedWeight > tariff.weight_from && roundedWeight <= tariff.weight_to;
    }
  }) || null;
}

export function calculateVolumetricWeight(
  height: number,
  width: number,
  length: number,
  conversionFactor: number
): number {
  const volumeM3 = (height * width * length) / 1_000_000;
  return volumeM3 * conversionFactor;
}

export function getFinalWeight(actualWeight: number, volumetricWeight?: number): number {
  const baseWeight = volumetricWeight !== undefined
    ? Math.max(actualWeight, volumetricWeight)
    : actualWeight;

  if (baseWeight <= 0) {
    return 0;
  }

  return Math.ceil(baseWeight);
}

export function getConversionFactorForService(serviceName: string, zone?: DestinationZone): number {
  const defaultFactor = 167;

  if (isMaritimeService(serviceName)) {
    return 333;
  }

  if (isBusinessParcelService(serviceName) && zone && BUSINESS_ISLAND_ZONES.has(zone)) {
    return 333;
  }

  return defaultFactor;
}

/**
 * PATRONES DE CÁLCULO:
 *
 * PATRÓN 1 - DESCUENTO LINEAL:
 * - Todos los porcentajes (Climate, Cobertura, Energía, Incrementos) se calculan sobre la Base Bruta
 * - El descuento lineal se calcula sobre la Base Bruta
 * - Fórmula: Total = (Base + ΣSupl_brutos + ΣFijos) - Descuento
 *
 * PATRÓN 2 - PLAN DE DESCUENTO:
 * - El descuento del plan se aplica sobre el ARR (arrastre) primero
 * - Se genera Base Neta = Base Bruta - Descuento Plan
 * - Todos los porcentajes se calculan sobre la Base Neta
 * - Fórmula: Total = BaseNeta + ΣSupl_netos + ΣFijos
 *
 * RANGOS PLUSONE (+1kg):
 * - NO se aplican conceptos fijos (Canon Red, Digital, No Vol)
 * - Los porcentuales siguen el patrón activo (sobre base bruta o neta)
 */

/**
 * Calcula el desglose completo de costes con dos flujos diferenciados según tipo de descuento.
 * @param initialCost El coste base inicial (antes de descuentos lineales, cánones, etc.)
 * @param incr2024 Porcentaje de incremento 2024
 * @param incr2025 Porcentaje de incremento 2025
 * @param incr2026 Porcentaje de incremento 2026
 * @param spc Suplemento en euros
 * @param suplementos Suplementos variables en euros
 * @param irregular Suplemento irregular en euros
 * @param linearDiscountPercentage Porcentaje de descuento lineal
 * @param saturdayCost Coste de entrega en sábado
 * @param mileageCost Coste de kilometraje
 * @param options Opciones adicionales
 */
export function calculateCostBreakdown(
  initialCost: number,
  incr2024: number = 0,
  incr2025: number = 0,
  incr2026: number = 0,
  spc: number = 0,
  suplementos: number = 0,
  irregular: number = 0,
  linearDiscountPercentage: number = 0,
  saturdayCost: number = 0,
  mileageCost: number = 0,
  options: {
    planDiscountAmount?: number;
    energyRate?: number;
    baseOverride?: number | null;
    serviceName?: string;
    isPlusOneRange?: boolean;
    arrValue?: number | null;
    useIntermediateRounding?: boolean;
  } = {}
): CostBreakdown {
  const {
    planDiscountAmount = 0,
    energyRate = 0.0705,
    baseOverride = null,
    serviceName,
    isPlusOneRange = false,
    arrValue = null,
    useIntermediateRounding = true
  } = options;

  const parcelShopService = serviceName ? isParcelShopService(serviceName) : false;
  const safeInitial = initialCost > 0 ? initialCost : 0;
  const effectiveLinearDiscountPercentage = parcelShopService ? 0 : linearDiscountPercentage;

  // DETERMINAR QUÉ PATRÓN USAR
  const hasPlanDiscount = planDiscountAmount > 0;
  const hasLinearDiscount = effectiveLinearDiscountPercentage > 0 && !hasPlanDiscount;
  const hasBaseOverride = baseOverride !== null && Number.isFinite(baseOverride);

  // Variables para el resultado
  let baseForSupplements = safeInitial; // Base sobre la que se calculan los suplementos porcentuales
  let baseForTotal = safeInitial; // Base que se suma al total
  let totalDiscount = 0;

  // =============================================================================
  // CASO 1: BASE OVERRIDE (prioridad máxima)
  // =============================================================================
  if (hasBaseOverride) {
    baseForSupplements = Math.max(0, baseOverride);
    baseForTotal = baseForSupplements;
    totalDiscount = 0;

    if (useIntermediateRounding) {
      baseForSupplements = roundIntermediate(baseForSupplements);
      baseForTotal = roundIntermediate(baseForTotal);
    }
  }
  // =============================================================================
  // CASO 2: PATRÓN 2 - PLAN DE DESCUENTO (descuento sobre ARR)
  // =============================================================================
  else if (hasPlanDiscount) {
    // El descuento del plan se calcula sobre el ARR y se resta de la base bruta
    const planDiscountProcessed = useIntermediateRounding
      ? roundIntermediate(planDiscountAmount)
      : roundUp(planDiscountAmount);

    totalDiscount = Math.min(safeInitial, planDiscountProcessed);

    // Base Neta = Base Bruta - Descuento Plan
    baseForTotal = Math.max(0, safeInitial - totalDiscount);
    baseForSupplements = baseForTotal; // Los suplementos se calculan sobre la base neta

    if (useIntermediateRounding) {
      baseForTotal = roundIntermediate(baseForTotal);
      baseForSupplements = roundIntermediate(baseForSupplements);
    }
  }
  // =============================================================================
  // CASO 3: PATRÓN 1 - DESCUENTO LINEAL (descuento al final)
  // =============================================================================
  else if (hasLinearDiscount) {
    // El descuento lineal se calcula sobre ARR (si existe) o sobre la base bruta
    const baseForDiscount = (arrValue !== null && arrValue !== undefined && arrValue > 0)
      ? arrValue
      : safeInitial;

    const linearDiscountAmount = useIntermediateRounding
      ? roundIntermediate(baseForDiscount * (effectiveLinearDiscountPercentage / 100))
      : roundUp(baseForDiscount * (effectiveLinearDiscountPercentage / 100));

    totalDiscount = Math.min(safeInitial, linearDiscountAmount);

    // Los suplementos se calculan sobre la base bruta original
    baseForSupplements = safeInitial;
    // La base que se suma al total es la bruta (el descuento se resta al final)
    baseForTotal = safeInitial;
  }
  // =============================================================================
  // CASO 4: SIN DESCUENTO (equivalente a Patrón 1 sin descuento)
  // =============================================================================
  else {
    baseForSupplements = safeInitial;
    baseForTotal = safeInitial;
    totalDiscount = 0;
  }

  // =============================================================================
  // CALCULAR CONCEPTOS PORCENTUALES Y FIJOS
  // =============================================================================
  let climateProtect = 0;
  let canonRed = 0;
  let canonDigital = 0;
  let noVol = 0;
  let amplCobertura = 0;
  let energia = 0;
  let incr2024Amount = 0;
  let incr2025Amount = 0;
  let incr2026Amount = 0;

  if (!parcelShopService) {
    // Conceptos porcentuales: SIEMPRE se calculan sobre baseForSupplements
    climateProtect = useIntermediateRounding
      ? roundIntermediate(baseForSupplements * 0.015)
      : roundUp(baseForSupplements * 0.015);

    amplCobertura = useIntermediateRounding
      ? roundIntermediate(baseForSupplements * 0.0195)
      : roundUp(baseForSupplements * 0.0195);

    if (energyRate > 0) {
      energia = useIntermediateRounding
        ? roundIntermediate(baseForSupplements * energyRate)
        : roundUp(baseForSupplements * energyRate);
    }

    if (incr2024 > 0) {
      incr2024Amount = useIntermediateRounding
        ? roundIntermediate(baseForSupplements * (incr2024 / 100))
        : roundUp(baseForSupplements * (incr2024 / 100));
    }

    if (incr2025 > 0) {
      incr2025Amount = useIntermediateRounding
        ? roundIntermediate(baseForSupplements * (incr2025 / 100))
        : roundUp(baseForSupplements * (incr2025 / 100));
    }

    if (incr2026 > 0) {
      incr2026Amount = useIntermediateRounding
        ? roundIntermediate(baseForSupplements * (incr2026 / 100))
        : roundUp(baseForSupplements * (incr2026 / 100));
    }

    // Conceptos fijos: SOLO si NO es rango plusOne
    if (!isPlusOneRange) {
      canonRed = roundUp(0.27);
      canonDigital = roundUp(0.06);
      noVol = roundUp(0.04);
    }
  }

  // Otros conceptos redondeados
  const suplementosRounded = suplementos > 0
    ? (useIntermediateRounding ? roundIntermediate(suplementos) : roundUp(suplementos))
    : 0;

  const irregularRounded = irregular > 0
    ? (useIntermediateRounding ? roundIntermediate(irregular) : roundUp(irregular))
    : 0;

  const safeMileage = mileageCost > 0
    ? (useIntermediateRounding ? roundIntermediate(mileageCost) : roundUp(mileageCost))
    : 0;

  const saturdayCostRounded = saturdayCost > 0
    ? (useIntermediateRounding ? roundIntermediate(saturdayCost) : roundUp(saturdayCost))
    : 0;

  const spcRounded = spc > 0
    ? (useIntermediateRounding ? roundIntermediate(spc) : roundUp(spc))
    : 0;

  // =============================================================================
  // CÁLCULO FINAL SEGÚN PATRÓN
  // =============================================================================
  let subtotalBeforeIncrements: number;

  if (hasLinearDiscount && !hasPlanDiscount && !hasBaseOverride) {
    // PATRÓN 1: Sumar todo y restar descuento al final
    const sumBeforeDiscount = baseForTotal +
      climateProtect +
      canonRed +
      canonDigital +
      noVol +
      amplCobertura +
      energia +
      suplementosRounded +
      irregularRounded +
      safeMileage +
      saturdayCostRounded;

    subtotalBeforeIncrements = sumBeforeDiscount - totalDiscount;
  } else {
    // PATRÓN 2 o SIN DESCUENTO: La base ya tiene el descuento aplicado (o no hay descuento)
    subtotalBeforeIncrements = baseForTotal +
      climateProtect +
      canonRed +
      canonDigital +
      noVol +
      amplCobertura +
      energia +
      suplementosRounded +
      irregularRounded +
      safeMileage +
      saturdayCostRounded;
  }

  const subtotal = useIntermediateRounding
    ? roundIntermediate(subtotalBeforeIncrements)
    : roundUp(subtotalBeforeIncrements);

  const totalCostBeforeRounding = subtotal + incr2024Amount + incr2025Amount + incr2026Amount + spcRounded;
  const totalCost = roundUp(totalCostBeforeRounding);

  return {
    initialCost: safeInitial,
    linearDiscount: totalDiscount,
    climateProtect,
    canonRed,
    canonDigital,
    noVol,
    amplCobertura,
    energia,
    suplementos: suplementosRounded,
    irregular: irregularRounded,
    mileageCost: safeMileage,
    saturdayCost: saturdayCostRounded,
    subtotal,
    incr2024: incr2024Amount,
    incr2025: incr2025Amount,
    incr2026: incr2026Amount,
    incr2024Percent: incr2024,
    incr2025Percent: incr2025,
    incr2026Percent: incr2026,
    spc: spcRounded,
    totalCost,
    status: 'calculated'
  };
}

export function getInitialCostForZone(
  tariff: Tariff,
  zone: DestinationZone,
  shippingMode: ShippingMode
): number {
  const field = COST_FIELD_MAP[zone]?.[shippingMode];
  if (!field) {
    return 0;
  }

  const value = getTariffNumericValue(tariff, field);
  return value ?? 0;
}

const buildFieldCandidates = (field: string): string[] => {
  const variants = new Set<string>([field]);

  if (field.includes('national')) {
    variants.add(field.replace('national', 'nacional'));
  }

  if (field.includes('nacional')) {
    variants.add(field.replace('nacional', 'national'));
  }

  if (field.includes('price')) {
    variants.add(field.replace('price', 'precio'));
  }

  if (field.endsWith('_sal')) {
    variants.add(field.replace('_sal', '_salida'));
  }

  if (field.endsWith('_rec')) {
    variants.add(field.replace('_rec', '_recogida'));
  }

  if (field.endsWith('_int')) {
    variants.add(field.replace('_int', '_interciudad'));
  }

  return Array.from(variants);
};

const getTariffNumericValue = (
  tariff: Tariff,
  field: string | string[]
): number | null => {
  const baseCandidates = Array.isArray(field)
    ? field.flatMap(buildFieldCandidates)
    : buildFieldCandidates(field);
  const candidates = Array.from(new Set(baseCandidates));

  const record = tariff as Record<string, unknown>;

  for (const candidate of candidates) {
    const value = record[candidate];
    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === 'number') {
      if (Number.isFinite(value)) {
        return value;
      }
      continue;
    }

    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const isPlusOneRange = (tariff: Tariff): boolean => {
  if (tariff.weight_to === null || tariff.weight_to === undefined) {
    return true;
  }

  if (tariff.weight_to <= tariff.weight_from) {
    return true;
  }

  if (tariff.weight_from >= 15 && tariff.weight_to >= OPEN_RANGE_THRESHOLD) {
    return true;
  }

  return false;
};

/**
 * Extrae el coste puro del rango plusOne (kilo adicional) sin aplicar ningún concepto
 * @param tariffs - Array de tarifas del servicio
 * @param zone - Zona de destino
 * @param mode - Modo de envío (salida, recogida, interciudad)
 * @param serviceName - Nombre del servicio
 * @returns El valor puro del kilo adicional o null si no existe
 */
export const extractPlusOneCost = (
  tariffs: Tariff[],
  zone: DestinationZone,
  mode: ShippingMode,
  serviceName: string
): number | null => {
  if (!tariffs.length) {
    return null;
  }

  const sorted = [...tariffs].sort((a, b) => a.weight_from - b.weight_from);
  const plusOneTariff = [...sorted].reverse().find(isPlusOneRange);

  if (!plusOneTariff) {
    return null;
  }

  const costField = COST_FIELD_MAP[zone]?.[mode];
  if (!costField) {
    return null;
  }

  return getTariffNumericValue(plusOneTariff, costField);
};

/**
 * Interfaz para el resultado de calculatePercentualSupplements
 */
export interface PercentualSupplements {
  climateProtect: number;
  amplCobertura: number;
  energia: number;
  total: number;
}

/**
 * Calcula SOLO los conceptos porcentuales sobre un importe base
 * NO incluye conceptos fijos (canon red, digital, noVol)
 * @param baseAmount - Importe base sobre el que aplicar los porcentajes
 * @param energyRate - Tasa de energía (por defecto 0.0705 = 7.05%)
 * @param isParcelShop - Si es servicio ParcelShop (no aplica conceptos)
 * @returns Objeto con el desglose de conceptos porcentuales y el total
 */
export const calculatePercentualSupplements = (
  baseAmount: number,
  energyRate: number = 0.0705,
  isParcelShop: boolean = false
): PercentualSupplements => {
  if (isParcelShop || baseAmount <= 0) {
    return {
      climateProtect: 0,
      amplCobertura: 0,
      energia: 0,
      total: 0
    };
  }

  const safeBase = roundUp(baseAmount);
  const climateProtect = roundUp(safeBase * 0.015); // 1.5%
  const amplCobertura = roundUp(safeBase * 0.0195); // 1.95%
  const energia = energyRate > 0 ? roundUp(safeBase * energyRate) : 0;

  const total = roundUp(climateProtect + amplCobertura + energia);

  return {
    climateProtect,
    amplCobertura,
    energia,
    total
  };
};

const getAdditionalStep = (serviceName: string, zone: DestinationZone): number => {
  if (isMaritimeService(serviceName) && MARITIME_SPECIAL_ZONES.has(zone)) {
    return 10;
  }

  return 1;
};

const resolveTariffCost = (
  tariffs: Tariff[],
  costField: keyof Tariff,
  weight: number,
  serviceName: string,
  zone: DestinationZone
): number | null => {
  if (!tariffs.length) {
    return null;
  }

  const effectiveWeight = Math.max(weight, 0);
  const roundedWeight = Math.ceil(effectiveWeight);
  if (roundedWeight <= 0) {
    return 0;
  }

  const sorted = [...tariffs].sort((a, b) => a.weight_from - b.weight_from);
  const finiteRanges = sorted
    .filter(tariff => !isPlusOneRange(tariff))
    .map(tariff => ({
      from: tariff.weight_from,
      to: tariff.weight_to ?? null,
      cost: getTariffNumericValue(tariff, costField)
    }));

  const pricedRanges = finiteRanges.filter(range => range.cost !== null);
  if (!pricedRanges.length) {
    return null;
  }

  const plusOneRange = [...sorted].reverse().find(isPlusOneRange) ?? null;
  const plusOneCost = plusOneRange ? getTariffNumericValue(plusOneRange, costField) : null;
  const step = getAdditionalStep(serviceName, zone);

  const lowestPricedRange = pricedRanges[0];
  const containingRange = pricedRanges.find(range => {
    const upperBound = range.to ?? range.from;
    const isFirstRange = range.from === 0;

    // Aplicar lógica correcta de rangos
    if (isFirstRange) {
      return roundedWeight >= range.from && roundedWeight <= upperBound;
    } else {
      return roundedWeight > range.from && roundedWeight <= upperBound;
    }
  });

  let baseRange = containingRange;
  if (!baseRange) {
    if (roundedWeight < lowestPricedRange.from) {
      baseRange = lowestPricedRange;
    } else {
      // Buscar el último rango que podría contener este peso
      // Debe buscar rangos donde from < roundedWeight Y to >= roundedWeight
      baseRange = [...pricedRanges].reverse().find(range => {
        const upperBound = range.to ?? range.from;
        const isFirstRange = range.from === 0;

        // Aplicar misma lógica que containingRange
        if (isFirstRange) {
          return roundedWeight >= range.from && roundedWeight <= upperBound;
        } else {
          return roundedWeight > range.from && roundedWeight <= upperBound;
        }
      }) ?? lowestPricedRange;
    }
  }

  const resolvedBaseRange = baseRange ?? lowestPricedRange;
  const baseCost = resolvedBaseRange.cost ?? 0;
  const baseThreshold = resolvedBaseRange.to ?? resolvedBaseRange.from;

  if (roundedWeight <= baseThreshold) {
    return baseCost;
  }

  if (plusOneCost === null) {
    return null;
  }

  const extraWeight = Math.max(0, roundedWeight - baseThreshold);
  if (extraWeight <= 0) {
    return baseCost;
  }

  const increments = Math.ceil(extraWeight / step);
  return baseCost + increments * plusOneCost;
};

export type ZoneCostReason = 'missing_tariff' | 'restriction';

export interface ZoneCostResult {
  available: boolean;
  cost: number;
  reason?: ZoneCostReason;
  finalWeight?: number;
}

export function computeZoneCostForPackage(
  pkg: PackageData,
  serviceName: string,
  zone: DestinationZone,
  shippingMode: ShippingMode,
  tariffs: Tariff[]
): ZoneCostResult {
  if (isParcelShopService(serviceName)) {
    const exceedsWeightLimit = pkg.weight > 30;
    const exceedsDimensionLimit = pkg.dimensions
      ? pkg.dimensions.height + pkg.dimensions.width + pkg.dimensions.length > 150
      : false;

    if (exceedsWeightLimit || exceedsDimensionLimit) {
      return { available: false, cost: 0, reason: 'restriction' };
    }
  }

  const costField = COST_FIELD_MAP[zone]?.[shippingMode];
  if (!costField) {
    return { available: false, cost: 0, reason: 'missing_tariff' };
  }

  const factor = getConversionFactorForService(serviceName, zone);
  const volumetricWeight = pkg.dimensions
    ? calculateVolumetricWeight(
        pkg.dimensions.height,
        pkg.dimensions.width,
        pkg.dimensions.length,
        factor
      )
    : undefined;

  const finalWeight = getFinalWeight(pkg.weight, volumetricWeight);
  const cost = resolveTariffCost(tariffs, costField, finalWeight, serviceName, zone);

  if (cost === null) {
    return { available: false, cost: 0, reason: 'missing_tariff', finalWeight };
  }

  return { available: true, cost, finalWeight };
}

export function calculatePackageCost(
  tariff: Tariff,
  zone: DestinationZone,
  packageData: PackageData,
  discountPlan?: DiscountPlan,
  marginPercentage: number = 0,
  shippingMode: ShippingMode = 'salida',
  resolvedCost?: number
): CalculationResult {
  // Calculate volumetric weight if dimensions are provided
  let volumetricWeight: number | undefined;
  if (packageData.dimensions) {
    const conversionFactor = getConversionFactorForService(tariff.service_name, zone);
    volumetricWeight = calculateVolumetricWeight(
      packageData.dimensions.height,
      packageData.dimensions.width,
      packageData.dimensions.length,
      conversionFactor
    );
  }

  // Determine final weight (higher of actual vs volumetric)
  const finalWeight = getFinalWeight(packageData.weight, volumetricWeight);

  // Get base cost based on zone
  const costField = COST_FIELD_MAP[zone]?.[shippingMode];
  const baseCostValue = resolvedCost ?? (costField ? getTariffNumericValue(tariff, costField) ?? 0 : 0);

  // NOTA: Ya no usamos *_price de la BD, el precio se calcula a partir del coste
  // Aplicamos descuentos al coste si hay plan disponible
  let finalCost = baseCostValue;
  let discount = 0;

  // Apply discount if available (se aplica al coste, no al precio)
  if (discountPlan && discountPlan.service_name === tariff.service_name) {
    if (discountPlan.discount_type === 'percentage') {
      discount = (baseCostValue * discountPlan.discount_value) / 100;
      finalCost = baseCostValue - discount;
    } else if (discountPlan.discount_type === 'fixed') {
      discount = discountPlan.discount_value;
      finalCost = baseCostValue - discount;
    }
  }

  // Apply margin to get final selling price using correct formula: PVP = Cost / (1 - Margin%/100)
  const marginFactor = 1 - (marginPercentage / 100);
  const finalSellingPrice = marginFactor > 0 ? finalCost / marginFactor : finalCost;

  return {
    serviceName: tariff.service_name,
    cost: baseCostValue,
    price: finalSellingPrice,
    margin: finalSellingPrice - baseCostValue,
    marginPercentage: baseCostValue > 0 ? ((finalSellingPrice - baseCostValue) / baseCostValue) * 100 : 0,
    discount,
    originalPrice: baseCostValue,
    actualWeight: packageData.weight,
    volumetricWeight,
    finalWeight
  };
}

export function calculateSimulation(
  packages: PackageData[],
  serviceName: string,
  zone: DestinationZone,
  marginPercentage: number,
  tariffs: Tariff[],
  discountPlan?: DiscountPlan,
  shippingMode: ShippingMode = 'salida'
): SimulationResult {
  const results: CalculationResult[] = [];
  let totalCost = 0;
  let totalPrice = 0;
  let totalWeight = 0;

  const serviceTariffs = tariffs.filter(tariff => tariff.service_name === serviceName);

  if (!serviceTariffs.length) {
    throw new Error(`No se encontraron tarifas para el servicio ${serviceName}`);
  }

  for (const pkg of packages) {
    const quantity = Math.max(1, Math.round(pkg.quantity ?? 1));
    // Use final weight (actual vs volumetric) for tariff lookup
    const conversionFactor = getConversionFactorForService(serviceName, zone);
    const volumetricWeight = pkg.dimensions
      ? calculateVolumetricWeight(
          pkg.dimensions.height,
          pkg.dimensions.width,
          pkg.dimensions.length,
          conversionFactor
        )
      : undefined;
    const finalWeight = getFinalWeight(pkg.weight, volumetricWeight);

    const zoneCost = computeZoneCostForPackage(
      pkg,
      serviceName,
      zone,
      shippingMode,
      serviceTariffs
    );

    if (!zoneCost.available) {
      throw new Error(`No hay coste disponible para ${serviceName} en la zona ${zone}`);
    }

    const tariff = findTariffForWeight(serviceTariffs, serviceName, finalWeight);

    if (!tariff) {
      throw new Error(`No tariff found for service ${serviceName} and weight ${finalWeight}kg`);
    }

    const result = calculatePackageCost(
      tariff,
      zone,
      pkg,
      discountPlan,
      marginPercentage,
      shippingMode,
      zoneCost.cost
    );
    const resultWithQuantity: CalculationResult = {
      ...result,
      quantity
    };

    results.push(resultWithQuantity);

    totalCost += result.cost * quantity;
    totalPrice += result.price * quantity;
    totalWeight += result.finalWeight * quantity;
  }

  const averageMarginPercentage = totalCost > 0 ? ((totalPrice - totalCost) / totalCost) * 100 : 0;

  return {
    packages,
    results,
    totals: {
      totalCost,
      totalPrice,
      totalWeight,
      totalPackages: packages.length,
      averageMarginPercentage
    }
  };
}

export function compareServices(
  packages: PackageData[],
  services: string[],
  zone: DestinationZone,
  marginPercentage: number,
  tariffs: Tariff[],
  discountPlans: DiscountPlan[] = [],
  shippingMode: ShippingMode = 'salida'
): Record<string, SimulationResult> {
  const comparisons: Record<string, SimulationResult> = {};

  for (const serviceName of services) {
    try {
      const applicableDiscountPlan = discountPlans.find(
        plan => plan.service_name === serviceName && plan.is_active
      );

      const simulation = calculateSimulation(
        packages,
        serviceName,
        zone,
        marginPercentage,
        tariffs,
        applicableDiscountPlan,
        shippingMode
      );

      comparisons[serviceName] = simulation;
    } catch (error) {
      console.warn(`Could not calculate for service ${serviceName}:`, error);
    }
  }

  return comparisons;
}

// Se eliminó getIncrementPercentages (lógica incompleta con dependencias externas)
// y se usará la lógica getZoneIncrement2024/2025 ya definida.

export interface ZoneBreakdownResult {
    zone: DestinationZone;
    label: string;
    breakdown: CostBreakdown;
    sellingPrice: number;
    marginAmount: number;
    marginPercentage: number;
    status: 'ok';
    increments: { incr2024: number; incr2025: number; incr2026: number };
}

/**
 * Calcula el desglose total para cada servicio en la zona, basado en un coste inicial total.
 * @returns {ZoneBreakdownResult[]} Array con los resultados de desglose por servicio.
 */
export function calculateZoneBreakdowns(
  tariffs: Tariff[],
  discountPlans: DiscountPlan[] = [],
  services: string[],
  packages: PackageData[],
  zone: DestinationZone,
  marginPercentage: number,
  ajustes: { spc: number; suplementos: number; linearDiscountPercentage?: number; saturdayCostEuro?: number }, // Se permite pasar el % de descuento y sábado aquí.
  irregularCost: number,
  totalInitialCost: number,
  shippingMode: ShippingMode = 'salida'
): ZoneBreakdownResult[] {
  const results: ZoneBreakdownResult[] = [];

  for (const serviceName of services) {
    try {
      const applicableDiscountPlan = discountPlans.find(
        plan => plan.service_name === serviceName && plan.is_active
      );
      
      // 1. Obtener los porcentajes de incremento basados en la lógica interna del archivo.
      const incr2024Percent = getZoneIncrement2024(serviceName, zone);
      const incr2025Percent = getZoneIncrement2025(serviceName, zone);

      // 2. Determinar el porcentaje de descuento lineal a aplicar sobre el totalInitialCost.
      // Se da prioridad al porcentaje pasado en 'ajustes', sino se usa el del plan de descuento si aplica.
      let linearDiscountPercentage = ajustes.linearDiscountPercentage ?? 0;

      if (linearDiscountPercentage === 0 && applicableDiscountPlan?.discount_type === 'percentage') {
          // Nota: Aquí se está asumiendo que el plan de descuento se aplica al Coste Inicial total.
          linearDiscountPercentage = applicableDiscountPlan.discount_value;
      }

      // 3. Calcular el desglose completo del coste total.
      const breakdown = calculateCostBreakdown(totalInitialCost, {
        incr2024Percent,
        incr2025Percent,
        incr2026Percent: 0, // Asumiendo 2026 es 0 si no está en ajustes (se puede modificar)
        spcEuro: ajustes.spc,
        suplementosEuro: ajustes.suplementos,
        irregularEuro: irregularCost,
        linearDiscountPercentage,
        saturdayCostEuro: ajustes.saturdayCostEuro ?? 0,
      });

      // 4. Calcular el precio de venta (PVP) basado en el margen sobre el Coste Total.
      const totalCost = breakdown.totalCost;
      const sellingPrice = totalCost / (1 - marginPercentage / 100);
      const marginAmount = sellingPrice - totalCost;
      const marginPct = totalCost > 0 ? (marginAmount / totalCost) * 100 : 0;
      
      results.push({
        zone,
        label: serviceName, // Usando el nombre del servicio como etiqueta
        breakdown,
        sellingPrice,
        marginAmount,
        marginPercentage: marginPct,
        status: 'ok',
        increments: {
          incr2024: incr2024Percent,
          incr2025: incr2025Percent,
          incr2026: 0
        },
      });
    } catch (error) {
      console.warn(`Could not calculate for service ${serviceName}:`, error);
    }
  }

  return results;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatWeight(weight: number): string {
  return `${weight.toFixed(2)} kg`;
}

export function formatDimensions(height: number, width: number, length: number): string {
  return `${height} × ${width} × ${length} cm`;
}

export function formatVolume(height: number, width: number, length: number): string {
  const volumeM3 = (height * width * length) / 1000000;
  return `${volumeM3.toFixed(4)} m³`;
}

export interface VirtualTariffRow {
  service_name: string;
  zone: string;
  weight_from: number;
  weight_to: number | null;
  pvp: number;
}

export interface BuildVirtualTariffOptions {
  marginPercentage: number;
  planGroup?: string;
  discountPlans?: DiscountPlan[];
  linearDiscount?: number;
  spc?: number;
  variableSurcharge?: number;
  irregularSurcharge?: number;
  increment2026?: number;
  selectedService?: string;
  provincialCostOverride?: number | null;
}

const getZoneKey = (zone: DestinationZone): string => ZONE_KEY_MAP[zone];

const getZoneCostFromTariff = (
  tariff: Tariff,
  zone: DestinationZone,
  mode: ShippingMode = 'salida'
): number | null => {
  const field = COST_FIELD_MAP[zone]?.[mode];
  if (!field) {
    return null;
  }
  return getTariffNumericValue(tariff, field);
};

// NOTA: getZonePriceFromTariff eliminada porque las columnas *_price ya no existen
// Los precios se calculan dinámicamente a partir de los costes

export const getZoneArrFromTariff = (tariff: Tariff, zone: DestinationZone): number | null => {
  const field = ARR_FIELD_MAP[zone];
  if (!field) {
    return null;
  }

  return getTariffNumericValue(tariff, field);
};

const resolvePlanWeightForTariffRow = (
  tariffs: Tariff[],
  current: Tariff,
  zone: DestinationZone
): number => {
  const lastFinite = getLastFiniteTariff(tariffs);

  if (current.weight_to !== null && current.weight_to !== undefined) {
    return current.weight_to;
  }

  const baseThreshold = lastFinite
    ? lastFinite.weight_to ?? lastFinite.weight_from
    : current.weight_from;

  const step = getAdditionalStep(current.service_name, zone);
  return baseThreshold + step;
};

const getPlanPercentageForWeight = (
  plan: DiscountPlan,
  serviceName: string,
  weight: number
): number => {
  if (plan.discount_type === 'custom') {
    const definition = getCustomPlanDefinition(plan.id);
    if (!definition || definition.discountPlan.service_name !== serviceName) {
      return 0;
    }
    return getCustomPlanPercentage(plan.id, serviceName, weight);
  }

  if (plan.discount_type === 'percentage') {
    return plan.discount_value ?? 0;
  }

  return 0;
};

const getLastFiniteTariff = (tariffs: Tariff[]): Tariff | null => {
  const finite = tariffs
    .filter(tariff => tariff.weight_to !== null && tariff.weight_to !== undefined)
    .sort((a, b) => (a.weight_to ?? 0) - (b.weight_to ?? 0));

  return finite.length ? finite[finite.length - 1] : null;
};

const findContainingFiniteTariff = (tariffs: Tariff[], weight: number): Tariff | null => {
  const rounded = Math.ceil(Math.max(weight, 0));
  return (
    tariffs
      .filter(tariff => tariff.weight_to !== null && tariff.weight_to !== undefined)
      .find(tariff => {
        const upper = tariff.weight_to ?? tariff.weight_from;
        const isFirstRange = tariff.weight_from === 0;

        // Aplicar misma lógica que findTariffForWeight
        if (isFirstRange) {
          return rounded >= tariff.weight_from && rounded <= upper;
        } else {
          return rounded > tariff.weight_from && rounded <= upper;
        }
      }) ?? null
  );
};

interface TariffCostDetails {
  baseTariff: Tariff;
  baseThreshold: number;
  additionalTariff: Tariff | null;
  additionalUnits: number;
  step: number;
}

const resolvePlanCostDetails = (
  tariffs: Tariff[],
  serviceName: string,
  zone: DestinationZone,
  weight: number
): TariffCostDetails | null => {
  if (!tariffs.length) {
    return null;
  }

  const sorted = [...tariffs].sort((a, b) => a.weight_from - b.weight_from);
  const finiteTariffs = sorted.filter(tariff => !isPlusOneRange(tariff));

  if (!finiteTariffs.length) {
    return null;
  }

  const roundedWeight = Math.ceil(Math.max(weight, 0));
  const plusOneTariff = [...sorted].reverse().find(isPlusOneRange) ?? null;
  const step = getAdditionalStep(serviceName, zone);

  let baseTariff = finiteTariffs.find(tariff => {
    const upperBound = tariff.weight_to ?? tariff.weight_from;
    const isFirstRange = tariff.weight_from === 0;

    // Aplicar misma lógica de rangos
    if (isFirstRange) {
      return roundedWeight >= tariff.weight_from && roundedWeight <= upperBound;
    } else {
      return roundedWeight > tariff.weight_from && roundedWeight <= upperBound;
    }
  });

  if (!baseTariff) {
    if (roundedWeight < finiteTariffs[0].weight_from) {
      baseTariff = finiteTariffs[0];
    } else {
      baseTariff = [...finiteTariffs]
        .reverse()
        .find(tariff => tariff.weight_from <= roundedWeight) ?? finiteTariffs[finiteTariffs.length - 1];
    }
  }

  if (!baseTariff) {
    return null;
  }

  const baseThreshold = baseTariff.weight_to ?? baseTariff.weight_from;
  const additionalUnits =
    roundedWeight > baseThreshold && plusOneTariff
      ? Math.ceil(Math.max(0, roundedWeight - baseThreshold) / Math.max(1, step))
      : 0;

  return {
    baseTariff,
    baseThreshold,
    additionalTariff: plusOneTariff,
    additionalUnits,
    step: Math.max(1, step)
  };
};

const ALLOWED_ZONES_FOR_PLAN_DISCOUNT: Set<DestinationZone> = new Set([
  'Provincial',
  'Regional',
  'Nacional'
]);

export const calculatePlanDiscountForWeight = (
  tariffs: Tariff[],
  serviceName: string,
  zone: DestinationZone,
  plan: DiscountPlan,
  weight: number,
  shippingMode?: ShippingMode
): number => {
  if (!plan) {
    return 0;
  }

  if (plan.discount_type === 'fixed') {
    return plan.discount_value > 0 ? roundUp(plan.discount_value) : 0;
  }

  // Los descuentos SOLO se aplican a Salida y Recogida, NUNCA a Interciudad
  if (shippingMode === 'interciudad') {
    return 0;
  }

  // Verificar que la zona está permitida
  const isEuroBusiness = serviceName === 'EuroBusiness Parcel';
  const isPortugal = zone === 'Portugal';

  // Portugal: solo para EuroBusiness
  if (isPortugal && !isEuroBusiness) {
    return 0;
  }

  // Otras zonas: solo Provincial, Regional, Nacional
  if (!isPortugal && !ALLOWED_ZONES_FOR_PLAN_DISCOUNT.has(zone)) {
    return 0;
  }

  const arrField = ARR_FIELD_MAP[zone];
  if (!arrField) {
    return 0;
  }

  const details = resolvePlanCostDetails(tariffs, serviceName, zone, weight);
  if (!details) {
    return 0;
  }

  const applyPercentageDiscount = (
    arrValue: number | null,
    percent: number,
    multiplier: number = 1
  ): number => {
    if (!arrValue || percent <= 0 || multiplier <= 0) {
      return 0;
    }

    return roundUp(arrValue * (percent / 100) * multiplier);
  };

  const percentForWeight = (weightValue: number): number =>
    getPlanPercentageForWeight(plan, serviceName, weightValue);

  let discountTotal = 0;

  const baseArr = getTariffNumericValue(details.baseTariff, arrField);
  if (Number.isFinite(baseArr as number)) {
    const basePercent = percentForWeight(details.baseThreshold);
    discountTotal += applyPercentageDiscount(baseArr as number, basePercent);
  }

  if (details.additionalUnits > 0 && details.additionalTariff) {
    const arrAdditional = getTariffNumericValue(details.additionalTariff, arrField);
    if (Number.isFinite(arrAdditional as number)) {
      const additionalPercent = percentForWeight(details.baseThreshold + details.step);
      discountTotal += applyPercentageDiscount(
        arrAdditional as number,
        additionalPercent,
        details.additionalUnits
      );
    }
  }

  return discountTotal;
};

export function buildVirtualTariffTable(
  tariffs: Tariff[],
  options: BuildVirtualTariffOptions
): VirtualTariffRow[] {
  const rows: VirtualTariffRow[] = [];
  if (!Array.isArray(tariffs) || tariffs.length === 0) {
    return rows;
  }
  const {
    marginPercentage,
    planGroup = '',
    discountPlans = [],
    linearDiscount = 0,
    spc = 0,
    variableSurcharge = 0,
    irregularSurcharge = 0,
    increment2026 = 0,
    selectedService = '',
    provincialCostOverride = null
  } = options;

  const normalizedPlanGroup = planGroup ? normalizePlanGroupKey(planGroup) : '';

  const safeMargin = Number.isFinite(marginPercentage) ? marginPercentage : 0;
  const marginFactor = safeMargin < 100 ? 1 - safeMargin / 100 : 0;

  const tariffsByService = new Map<string, Tariff[]>();
  tariffs.forEach(tariff => {
    const existing = tariffsByService.get(tariff.service_name);
    if (existing) {
      existing.push(tariff);
    } else {
      tariffsByService.set(tariff.service_name, [tariff]);
    }
  });

  for (const tariff of tariffs) {
    for (const zone of DESTINATION_ZONES) {
      for (const mode of SHIPPING_MODES) {
        const baseCost = getZoneCostFromTariff(tariff, zone, mode);
        // Ya no existe getZonePriceFromTariff, solo usamos baseCost
        const referenceValue = baseCost;

        if (referenceValue === null) {
          continue;
        }

        const planForService = normalizedPlanGroup
          ? findPlanForServiceGroup(discountPlans, normalizedPlanGroup, tariff.service_name)
          : undefined;

        const isPlanActive = Boolean(planForService);
        const isSelectedService = selectedService === tariff.service_name;
        const hasProvincialOverride =
          !isPlanActive && isSelectedService && provincialCostOverride !== null;

        const effectiveLinearDiscount = isPlanActive || hasProvincialOverride ? 0 : linearDiscount;

        let planDiscountAmount = 0;
        let planWeightForLog: number | null = null;

        if (planForService) {
          const serviceTariffsForPlan = tariffsByService.get(tariff.service_name) ?? [tariff];
          const resolvedPlanWeight = resolvePlanWeightForTariffRow(
            serviceTariffsForPlan,
            tariff,
            zone
          );

          planDiscountAmount = calculatePlanDiscountForWeight(
            serviceTariffsForPlan,
            tariff.service_name,
            zone,
            planForService,
            resolvedPlanWeight
          );
          planWeightForLog = resolvedPlanWeight;
        }

        const baseOverride = hasProvincialOverride && zone === 'Provincial'
          ? provincialCostOverride
          : null;

        const isPlusOne = isPlusOneRange(tariff);
        const arrValue = getZoneArrFromTariff(tariff, zone);

        const breakdown = calculateCostBreakdown(
          referenceValue,
          getZoneIncrement2024(tariff.service_name, zone),
          getZoneIncrement2025(tariff.service_name, zone),
          increment2026,
          spc,
          variableSurcharge,
          irregularSurcharge,
          effectiveLinearDiscount,
          0,
          0,
          {
            planDiscountAmount,
            energyRate: getEnergyRateForService(tariff.service_name),
            baseOverride,
            isPlusOneRange: isPlusOne,
            arrValue: arrValue,
            useIntermediateRounding: true,
            serviceName: tariff.service_name
          }
        );

        const totalCost = breakdown.totalCost;
        const pvpRaw = marginFactor > 0 ? totalCost / marginFactor : totalCost;
        const roundedPvp = roundUp(pvpRaw);
        const zoneKey = `${getZoneKey(zone)}_${SHIPPING_MODE_SUFFIX[mode]}`;

        const discountCalculatedOn = (arrValue !== null && arrValue !== undefined && arrValue > 0) ? 'ARR' : 'COST';

        sopLog('virtual-row', {
          service: tariff.service_name,
          zone,
          mode,
          weight_from: tariff.weight_from,
          weight_to: tariff.weight_to,
          isPlusOneRange: isPlusOne,
          baseCost: referenceValue,
          arrValue: arrValue,
          discountCalculatedOn,
          planWeight: planWeightForLog,
          planApplied: planForService?.plan_name ?? null,
          planDiscountAmount,
          linearDiscountApplied: effectiveLinearDiscount,
          baseOverride,
          supplements: {
            climateProtect: breakdown.climateProtect,
            canonRed: breakdown.canonRed,
            canonDigital: breakdown.canonDigital,
            noVol: breakdown.noVol,
            amplCobertura: breakdown.amplCobertura,
            energia: breakdown.energia,
            suplementos: breakdown.suplementos,
            irregular: breakdown.irregular,
            spc,
            incr2024: breakdown.incr2024,
            incr2025: breakdown.incr2025,
            incr2026: breakdown.incr2026
          },
          totalCost: breakdown.totalCost,
          marginPercentage: safeMargin,
          pvp: roundedPvp,
          note: isPlusOne
            ? 'plusOne: discounts on ARR (fallback COST), percentual supplements on discounted cost, no fixed supplements'
            : 'full shipment: discounts on ARR (fallback COST), all supplements on original cost, fixed supplements applied'
        });

        rows.push({
          service_name: tariff.service_name,
          zone: zoneKey,
          weight_from: tariff.weight_from,
          weight_to: tariff.weight_to,
          pvp: roundedPvp
        });
      }
    }
  }

  return rows;
}
