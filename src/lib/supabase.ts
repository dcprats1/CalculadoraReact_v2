import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database table types
export interface Tariff {
  id: string;
  service_name: string;
  weight_from: number;
  weight_to: number | null;
  provincial_price: number;
  regional_price: number;
  nacional_price: number;
  portugal_price: number;
  andorra_price: number;
  gibraltar_price: number;
  madeira_mayores_price: number;
  madeira_menores_price: number;
  azores_mayores_price: number;
  azores_menores_price: number;
  canarias_mayores_price: number;
  canarias_menores_price: number;
  baleares_mayores_price: number;
  baleares_menores_price: number;
  ceuta_price: number;
  melilla_price: number;
  provincial_arr: number | null;
  regional_arr: number | null;
  nacional_arr: number | null;
  portugal_arr: number | null;
  andorra_arr: number | null;
  gibraltar_arr: number | null;
  madeira_mayores_arr: number | null;
  madeira_menores_arr: number | null;
  azores_mayores_arr: number | null;
  azores_menores_arr: number | null;
  canarias_mayores_arr: number | null;
  canarias_menores_arr: number | null;
  baleares_mayores_arr: number | null;
  baleares_menores_arr: number | null;
  ceuta_arr: number | null;
  melilla_arr: number | null;
  provincial_sal: number;
  provincial_rec: number;
  provincial_int: number;
  regional_sal: number;
  regional_rec: number;
  regional_int: number;
  nacional_sal: number;
  nacional_rec: number;
  nacional_int: number;
  portugal_sal: number;
  portugal_rec: number;
  portugal_int: number;
  andorra_sal: number;
  andorra_rec: number;
  andorra_int: number;
  gibraltar_sal: number;
  gibraltar_rec: number;
  gibraltar_int: number;
  madeira_mayores_sal: number;
  madeira_mayores_rec: number;
  madeira_mayores_int: number;
  madeira_menores_sal: number;
  madeira_menores_rec: number;
  madeira_menores_int: number;
  azores_mayores_sal: number;
  azores_mayores_rec: number;
  azores_mayores_int: number;
  azores_menores_sal: number;
  azores_menores_rec: number;
  azores_menores_int: number;
  canarias_mayores_sal: number;
  canarias_mayores_rec: number;
  canarias_mayores_int: number;
  canarias_menores_sal: number;
  canarias_menores_rec: number;
  canarias_menores_int: number;
  baleares_mayores_sal: number;
  baleares_mayores_rec: number;
  baleares_mayores_int: number;
  baleares_menores_sal: number;
  baleares_menores_rec: number;
  baleares_menores_int: number;
  ceuta_sal: number;
  ceuta_rec: number;
  ceuta_int: number;
  melilla_sal: number;
  melilla_rec: number;
  melilla_int: number;
  created_at: string;
  updated_at: string;
}

export interface DiscountPlan {
  id: string;
  plan_name: string;
  service_name: string;
  discount_type: 'percentage' | 'fixed' | 'custom';
  discount_value: number;
  min_volume: number;
  max_volume?: number;
  applies_to: 'price' | 'cost' | 'both';
  is_active: boolean;
  created_at: string;
}

export interface ConstantByService {
  id: string;
  service_name: string;
  constant_name: string;
  constant_value: string;
  constant_type: 'decimal' | 'integer' | 'text' | 'boolean';
  description?: string;
  created_at: string;
}

export interface PackageDimensions {
  height: number; // cm
  width: number;  // cm
  length: number; // cm
}

export interface Simulation {
  id: string;
  user_id?: string;
  simulation_name: string;
  service_name: string;
  destination_zone: string;
  margin_percentage: number;
  discount_plan_id?: string;
  total_cost: number;
  total_price: number;
  total_packages: number;
  total_weight: number;
  created_at: string;
}

export interface SimulationDetail {
  id: string;
  simulation_id: string;
  package_number: number;
  weight: number;
  volumetric_weight?: number;
  final_weight?: number;
  height?: number;
  width?: number;
  length?: number;
  cost: number;
  price: number;
  created_at: string;
}

// Legacy type for backward compatibility
export type DestinationZone = 'provincial' | 'regional' | 'national';
