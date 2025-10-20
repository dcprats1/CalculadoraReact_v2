export interface PricingPlan {
  id: string;
  tier: number;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  devices: number;
  monthlyIfPaidMonthly: number;
  monthsFree: number;
  pricePerDevicePerYear: number;
  savingsPerDeviceVsPlan1: number;
  savingsPercentage: number;
  isBestValue?: boolean;
  badge?: string;
  stripeMonthlyPriceId?: string;
  stripeAnnualPriceId?: string;
}

export const TIER_TO_DEVICES: Record<number, number> = {
  1: 1,
  2: 3,
  3: 5,
  4: 8,
};

export const pricingPlans: PricingPlan[] = [
  {
    id: 'plan-1',
    tier: 1,
    name: 'Plan Básico',
    monthlyPrice: 90,
    annualPrice: 990,
    devices: 1,
    monthlyIfPaidMonthly: 90 * 12,
    monthsFree: 1,
    pricePerDevicePerYear: 990,
    savingsPerDeviceVsPlan1: 0,
    savingsPercentage: 8.3,
    badge: 'Básico',
  },
  {
    id: 'plan-2',
    tier: 2,
    name: 'Plan Profesional',
    monthlyPrice: 180,
    annualPrice: 1890,
    devices: 3,
    monthlyIfPaidMonthly: 180 * 12,
    monthsFree: 1.5,
    pricePerDevicePerYear: 630,
    savingsPerDeviceVsPlan1: 360,
    savingsPercentage: 12.5,
    badge: 'Popular',
  },
  {
    id: 'plan-3',
    tier: 3,
    name: 'Plan Empresa',
    monthlyPrice: 270,
    annualPrice: 2700,
    devices: 5,
    monthlyIfPaidMonthly: 270 * 12,
    monthsFree: 2,
    pricePerDevicePerYear: 540,
    savingsPerDeviceVsPlan1: 450,
    savingsPercentage: 16.7,
  },
  {
    id: 'plan-4',
    tier: 4,
    name: 'Plan Corporativo',
    monthlyPrice: 315,
    annualPrice: 3150,
    devices: 8,
    monthlyIfPaidMonthly: 315 * 12,
    monthsFree: 2,
    pricePerDevicePerYear: 393.75,
    savingsPerDeviceVsPlan1: 596.25,
    savingsPercentage: 16.7,
    isBestValue: true,
    badge: 'MEJOR VALOR',
  },
];

export const basePlan1AnnualCost = 990;

export const getTotalSavingsVsIndividual = (plan: PricingPlan): number => {
  return basePlan1AnnualCost * plan.devices - plan.annualPrice;
};

export const getMonthlyCostPerDevice = (plan: PricingPlan): number => {
  return plan.pricePerDevicePerYear / 12;
};

export const getAnnualSavings = (plan: PricingPlan): number => {
  return plan.monthlyIfPaidMonthly - plan.annualPrice;
};

export const planHighlights = pricingPlans.map((plan) => ({
  title: `${plan.devices} ${plan.devices === 1 ? 'dispositivo' : 'dispositivos'}`,
  subtitle: `${plan.monthsFree} ${plan.monthsFree === 1 ? 'mes' : 'meses'} gratis`,
  price: `€${plan.annualPrice.toLocaleString()}/año`,
  perDevice: `€${Math.round(plan.pricePerDevicePerYear)}/dispositivo`,
  savings:
    plan.savingsPerDeviceVsPlan1 > 0
      ? `Ahorras €${plan.savingsPerDeviceVsPlan1.toFixed(0)} por dispositivo`
      : null,
}));

export const getPlanByTier = (tier: number): PricingPlan | undefined => {
  return pricingPlans.find((plan) => plan.tier === tier);
};
