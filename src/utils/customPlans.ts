import type { DiscountPlan } from '../lib/supabase';

const PLAN_WEIGHT_ORDER = [
  'upto1',
  'upto3',
  'upto5',
  'upto10',
  'upto15',
  'additional'
] as const;

export type PlanWeightKey = typeof PLAN_WEIGHT_ORDER[number];

export interface PlanPercentages {
  upto1: number;
  upto3: number;
  upto5: number;
  upto10: number;
  upto15: number;
  additional: number;
}

interface RawCustomPlan {
  baseId: string;
  planName: string;
  message: string;
  services: Record<string, PlanPercentages>;
}

interface CustomPlanEntry {
  id: string;
  discountPlan: DiscountPlan;
  message: string;
  percentages: PlanPercentages;
}

const RAW_CUSTOM_PLANS: RawCustomPlan[] = [
  {
    baseId: 'custom-plan-integral-2026',
    planName: 'Plan Integral 2026',
    message: 'Válida desde 01/01/26',
    services: {
      'Urg8:30H Courier': { upto1: 35, upto3: 35, upto5: 35, upto10: 35, upto15: 35, additional: 15 },
      'Urg10H Courier': { upto1: 50, upto3: 50, upto5: 40, upto10: 40, upto15: 40, additional: 15 },
      'Urg14H Courier': { upto1: 50, upto3: 50, upto5: 40, upto10: 35, upto15: 35, additional: 15 },
      'Urg19H Courier': { upto1: 50, upto3: 50, upto5: 40, upto10: 35, upto15: 35, additional: 15 },
      'Business Parcel': { upto1: 60, upto3: 60, upto5: 50, upto10: 50, upto15: 50, additional: 40 },
      'Economy Parcel': { upto1: 40, upto3: 40, upto5: 40, upto10: 40, upto15: 40, additional: 35 }
    }
  },
  {
    baseId: 'custom-plan-integral-2025-plus10',
    planName: 'Plan Integral 2025 +10',
    message: 'Válida sólo hasta 31/12/25',
    services: {
      'Urg8:30H Courier': { upto1: 45, upto3: 45, upto5: 45, upto10: 45, upto15: 45, additional: 25 },
      'Urg10H Courier': { upto1: 60, upto3: 60, upto5: 50, upto10: 50, upto15: 50, additional: 25 },
      'Urg14H Courier': { upto1: 60, upto3: 60, upto5: 50, upto10: 45, upto15: 45, additional: 25 },
      'Urg19H Courier': { upto1: 60, upto3: 60, upto5: 50, upto10: 45, upto15: 45, additional: 25 },
      'Business Parcel': { upto1: 70, upto3: 70, upto5: 60, upto10: 60, upto15: 60, additional: 50 },
      'Economy Parcel': { upto1: 50, upto3: 50, upto5: 50, upto10: 50, upto15: 50, additional: 45 }
    }
  }
];

const toServiceKey = (serviceName: string): string => serviceName.toLowerCase().replace(/\s+/g, '-');

const CUSTOM_PLAN_ENTRIES: CustomPlanEntry[] = RAW_CUSTOM_PLANS.flatMap(plan => {
  return Object.entries(plan.services).map(([serviceName, percentages]) => {
    const id = `${plan.baseId}-${toServiceKey(serviceName)}`;

    const discountPlan: DiscountPlan = {
      id,
      plan_name: plan.planName,
      service_name: serviceName,
      discount_type: 'custom',
      discount_value: 0,
      min_volume: 0,
      max_volume: undefined,
      applies_to: 'cost',
      is_active: true,
      created_at: '1970-01-01T00:00:00Z'
    };

    return {
      id,
      discountPlan,
      message: plan.message,
      percentages
    };
  });
});

export const CUSTOM_DISCOUNT_PLANS: DiscountPlan[] = CUSTOM_PLAN_ENTRIES.map(entry => entry.discountPlan);

const CUSTOM_PLAN_MAP = new Map<string, CustomPlanEntry>(
  CUSTOM_PLAN_ENTRIES.map(entry => [entry.id, entry])
);

export const CUSTOM_PLAN_IDS = new Set<string>(CUSTOM_PLAN_ENTRIES.map(entry => entry.id));

export const getCustomPlanDefinition = (planId: string) => CUSTOM_PLAN_MAP.get(planId);

export const getCustomPlanMessage = (planId: string): string | undefined => {
  return CUSTOM_PLAN_MAP.get(planId)?.message;
};

const getWeightBracket = (weight: number): PlanWeightKey => {
  const rounded = Math.ceil(Math.max(0, weight));

  if (rounded <= 1) return 'upto1';
  if (rounded <= 3) return 'upto3';
  if (rounded <= 5) return 'upto5';
  if (rounded <= 10) return 'upto10';
  if (rounded <= 15) return 'upto15';
  return 'additional';
};

export const getCustomPlanPercentage = (
  planId: string,
  serviceName: string,
  weight: number
): number => {
  const definition = CUSTOM_PLAN_MAP.get(planId);
  if (!definition || definition.discountPlan.service_name !== serviceName) {
    return 0;
  }

  const bracket = getWeightBracket(weight);
  return definition.percentages[bracket] ?? 0;
};

export const getCustomPlansForService = (serviceName: string): DiscountPlan[] => {
  return CUSTOM_PLAN_ENTRIES
    .filter(entry => entry.discountPlan.service_name === serviceName)
    .map(entry => entry.discountPlan);
};

export const normalizePlanGroupKey = (planName: string): string => planName.trim().toLowerCase();

export const getPlanGroupKey = (plan: DiscountPlan): string => normalizePlanGroupKey(plan.plan_name);

export const findPlanForServiceGroup = (
  plans: DiscountPlan[],
  planGroup: string,
  serviceName: string
): DiscountPlan | undefined => {
  if (!planGroup) {
    return undefined;
  }

  const normalized = normalizePlanGroupKey(planGroup);

  return plans.find(
    plan => normalizePlanGroupKey(plan.plan_name) === normalized && plan.service_name === serviceName
  );
};

export const getUniquePlanGroups = (plans: DiscountPlan[]): string[] => {
  const seen = new Set<string>();

  plans.forEach(plan => {
    seen.add(getPlanGroupKey(plan));
  });

  return Array.from(seen.values());
};
