import {
  CommercialPlan,
  DomesticServiceKey,
  DomesticWeightKey,
  InternationalWeightKey,
} from '../types/commercialPlans';

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

export function applyCustomPlanDiscount(
  baseCost: number,
  plan: CommercialPlan | null,
  serviceName: string,
  weight: number,
  isInternational: boolean = false
): number {
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
