export interface DomesticDiscounts {
  '1kg': number;
  '3kg': number;
  '5kg': number;
  '10kg': number;
  '15kg': number;
  'additional': number;
}

export interface InternationalDiscounts {
  'under15kg': number;
  '15kg': number;
  'additional': number;
}

export interface PlanDiscounts {
  domestic: {
    'Express8:30': DomesticDiscounts;
    'Express10:30': DomesticDiscounts;
    'Express14:00': DomesticDiscounts;
    'Express19:00': DomesticDiscounts;
    'BusinessParcel': DomesticDiscounts;
    'EconomyParcel': DomesticDiscounts;
  };
  international: {
    'EuroBusinessParcel': InternationalDiscounts;
  };
}

export interface CommercialPlan {
  id: string;
  user_id: string;
  plan_name: string;
  discounts: PlanDiscounts;
  created_at: string;
  updated_at: string;
  is_system?: boolean;
}

export type DomesticServiceKey = keyof PlanDiscounts['domestic'];
export type InternationalServiceKey = keyof PlanDiscounts['international'];
export type DomesticWeightKey = keyof DomesticDiscounts;
export type InternationalWeightKey = keyof InternationalDiscounts;

export const DOMESTIC_SERVICES: DomesticServiceKey[] = [
  'Express8:30',
  'Express10:30',
  'Express14:00',
  'Express19:00',
  'BusinessParcel',
  'EconomyParcel',
];

export const DOMESTIC_WEIGHT_RANGES: DomesticWeightKey[] = [
  '1kg',
  '3kg',
  '5kg',
  '10kg',
  '15kg',
  'additional',
];

export const INTERNATIONAL_WEIGHT_RANGES: InternationalWeightKey[] = [
  'under15kg',
  '15kg',
  'additional',
];

export const EMPTY_PLAN_DISCOUNTS: PlanDiscounts = {
  domestic: {
    'Express8:30': { '1kg': 0, '3kg': 0, '5kg': 0, '10kg': 0, '15kg': 0, 'additional': 0 },
    'Express10:30': { '1kg': 0, '3kg': 0, '5kg': 0, '10kg': 0, '15kg': 0, 'additional': 0 },
    'Express14:00': { '1kg': 0, '3kg': 0, '5kg': 0, '10kg': 0, '15kg': 0, 'additional': 0 },
    'Express19:00': { '1kg': 0, '3kg': 0, '5kg': 0, '10kg': 0, '15kg': 0, 'additional': 0 },
    'BusinessParcel': { '1kg': 0, '3kg': 0, '5kg': 0, '10kg': 0, '15kg': 0, 'additional': 0 },
    'EconomyParcel': { '1kg': 0, '3kg': 0, '5kg': 0, '10kg': 0, '15kg': 0, 'additional': 0 },
  },
  international: {
    'EuroBusinessParcel': { 'under15kg': 0, '15kg': 0, 'additional': 0 },
  },
};

export const SERVICE_DISPLAY_NAMES: Record<DomesticServiceKey | InternationalServiceKey, string> = {
  'Express8:30': 'Express 8:30',
  'Express10:30': 'Express 10:30',
  'Express14:00': 'Express 14:00',
  'Express19:00': 'Express 19:00',
  'BusinessParcel': 'Business Parcel',
  'EconomyParcel': 'Economy Parcel',
  'EuroBusinessParcel': 'Euro Business Parcel',
};

export const WEIGHT_RANGE_DISPLAY_NAMES: Record<DomesticWeightKey | InternationalWeightKey, string> = {
  '1kg': '1 kg',
  '3kg': '3 kg',
  '5kg': '5 kg',
  '10kg': '10 kg',
  '15kg': '15 kg',
  'additional': 'kg adic.',
  'under15kg': '< 15 kg',
};
