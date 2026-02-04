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

export interface CustomTariff {
  id: string;
  user_id: string;
  service_name: string;
  weight_from: string;
  weight_to: string | null;
  provincial_sal: number | null;
  provincial_rec: number | null;
  provincial_int: number | null;
  regional_sal: number | null;
  regional_rec: number | null;
  regional_int: number | null;
  nacional_sal: number | null;
  nacional_rec: number | null;
  nacional_int: number | null;
  portugal_sal: number | null;
  portugal_rec: number | null;
  portugal_int: number | null;
  andorra_sal: number | null;
  andorra_rec: number | null;
  andorra_int: number | null;
  gibraltar_sal: number | null;
  gibraltar_rec: number | null;
  gibraltar_int: number | null;
  canarias_mayores_sal: number | null;
  canarias_mayores_rec: number | null;
  canarias_mayores_int: number | null;
  canarias_menores_sal: number | null;
  canarias_menores_rec: number | null;
  canarias_menores_int: number | null;
  baleares_mayores_sal: number | null;
  baleares_mayores_rec: number | null;
  baleares_mayores_int: number | null;
  baleares_menores_sal: number | null;
  baleares_menores_rec: number | null;
  baleares_menores_int: number | null;
  ceuta_sal: number | null;
  ceuta_rec: number | null;
  ceuta_int: number | null;
  melilla_sal: number | null;
  melilla_rec: number | null;
  melilla_int: number | null;
  azores_mayores_sal: number | null;
  azores_mayores_rec: number | null;
  azores_mayores_int: number | null;
  azores_menores_sal: number | null;
  azores_menores_rec: number | null;
  azores_menores_int: number | null;
  madeira_mayores_sal: number | null;
  madeira_mayores_rec: number | null;
  madeira_mayores_int: number | null;
  madeira_menores_sal: number | null;
  madeira_menores_rec: number | null;
  madeira_menores_int: number | null;
  andorra_arr: number | null;
  baleares_mayores_arr: number | null;
  baleares_menores_arr: number | null;
  canarias_mayores_arr: number | null;
  canarias_menores_arr: number | null;
  ceuta_arr: number | null;
  gibraltar_arr: number | null;
  melilla_arr: number | null;
  nacional_arr: number | null;
  portugal_arr: number | null;
  provincial_arr: number | null;
  regional_arr: number | null;
  created_at: string;
  updated_at: string;
}

export interface CustomTariffActive {
  id: string;
  user_id: string;
  service_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Legacy type for backward compatibility
export type DestinationZone = 'provincial' | 'regional' | 'national';

export interface TariffInternationalEurope {
  id: string;
  service_name: string;
  weight_from: number;
  weight_to: number | null;
  country: string;
  cost: number;
  created_at: string;
  updated_at: string;
}

export const EUROPE_DESTINATIONS = [
  'Alemania', 'Austria', 'Belgica', 'Bulgaria', 'Chipre', 'Corcega', 'Croacia',
  'Dinamarca', 'Eslovaquia', 'Eslovenia', 'Estonia', 'Finlandia', 'Francia',
  'Grecia', 'Hungria', 'Irlanda', 'Italia', 'Letonia', 'Liechtenstein',
  'Lituania', 'Luxemburgo', 'Malta', 'Monaco', 'Noruega', 'Paises Bajos',
  'Polonia', 'Reino Unido Z1', 'Reino Unido Z2', 'Republica Checa', 'Rumania',
  'San Marino', 'Serbia', 'Suecia', 'Suiza', 'Vaticano'
] as const;

export type EuropeDestination = typeof EUROPE_DESTINATIONS[number];

export type EuropeZone = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

export interface EuropeCountryData {
  name: string;
  iso: string;
  zone: EuropeZone;
  ttr: string;
  displayName?: string;
}

export const EUROPE_ZONE_COLORS: Record<EuropeZone, string> = {
  A: '#22c55e',
  B: '#3b82f6',
  C: '#f97316',
  D: '#ec4899',
  E: '#9ca3af',
  F: '#6b7280',
  G: '#eab308',
  H: '#06b6d4',
};

export const EUROPE_ZONE_DATA: Record<string, EuropeCountryData> = {
  'Alemania':       { name: 'Alemania', iso: 'DE', zone: 'A', ttr: '2-3' },
  'Austria':        { name: 'Austria', iso: 'AT', zone: 'C', ttr: '3-4' },
  'Belgica':        { name: 'Belgica', iso: 'BE', zone: 'A', ttr: '2-3' },
  'Bulgaria':       { name: 'Bulgaria', iso: 'BG', zone: 'F', ttr: '4-5' },
  'Chipre':         { name: 'Chipre', iso: 'CY', zone: 'H', ttr: '5-6' },
  'Corcega':        { name: 'Corcega', iso: 'FR2', zone: 'G', ttr: '2-3', displayName: 'Corcega (Francia)' },
  'Croacia':        { name: 'Croacia', iso: 'HR', zone: 'D', ttr: '3-4' },
  'Dinamarca':      { name: 'Dinamarca', iso: 'DK', zone: 'D', ttr: '3-4' },
  'Eslovaquia':     { name: 'Eslovaquia', iso: 'SK', zone: 'D', ttr: '2-3' },
  'Eslovenia':      { name: 'Eslovenia', iso: 'SI', zone: 'D', ttr: '3-4' },
  'Estonia':        { name: 'Estonia', iso: 'EE', zone: 'F', ttr: '4-5' },
  'Finlandia':      { name: 'Finlandia', iso: 'FI', zone: 'G', ttr: '5-7' },
  'Francia':        { name: 'Francia', iso: 'FR', zone: 'B', ttr: '1-2' },
  'Grecia':         { name: 'Grecia', iso: 'GR', zone: 'F', ttr: '6-8' },
  'Hungria':        { name: 'Hungria', iso: 'HU', zone: 'D', ttr: '2-3' },
  'Irlanda':        { name: 'Irlanda', iso: 'IE', zone: 'G', ttr: '4-5' },
  'Italia':         { name: 'Italia', iso: 'IT', zone: 'B', ttr: '2-3' },
  'Letonia':        { name: 'Letonia', iso: 'LV', zone: 'E', ttr: '5-7' },
  'Liechtenstein':  { name: 'Liechtenstein', iso: 'LI', zone: 'E', ttr: '2-3' },
  'Lituania':       { name: 'Lituania', iso: 'LT', zone: 'D', ttr: '4-5' },
  'Luxemburgo':     { name: 'Luxemburgo', iso: 'LU', zone: 'C', ttr: '2-3' },
  'Malta':          { name: 'Malta', iso: 'MT', zone: 'H', ttr: '4-5' },
  'Monaco':         { name: 'Monaco', iso: 'MC', zone: 'E', ttr: '1-2' },
  'Noruega':        { name: 'Noruega', iso: 'NO', zone: 'G', ttr: '4-6' },
  'Paises Bajos':   { name: 'Paises Bajos', iso: 'NL', zone: 'A', ttr: '2-3' },
  'Polonia':        { name: 'Polonia', iso: 'PL', zone: 'A', ttr: '3-4' },
  'Reino Unido Z1': { name: 'Reino Unido Z1', iso: 'GB1', zone: 'E', ttr: '3-4', displayName: 'Reino Unido (Gales, Inglaterra)' },
  'Reino Unido Z2': { name: 'Reino Unido Z2', iso: 'GB2', zone: 'E', ttr: '4-5', displayName: 'Reino Unido (Escocia, Irlanda N., Islas)' },
  'Republica Checa':{ name: 'Republica Checa', iso: 'CZ', zone: 'C', ttr: '2-3' },
  'Rumania':        { name: 'Rumania', iso: 'RO', zone: 'D', ttr: '4-5' },
  'San Marino':     { name: 'San Marino', iso: 'SM', zone: 'E', ttr: '2-3' },
  'Serbia':         { name: 'Serbia', iso: 'RS', zone: 'H', ttr: '4-5' },
  'Suecia':         { name: 'Suecia', iso: 'SE', zone: 'G', ttr: '4-6' },
  'Suiza':          { name: 'Suiza', iso: 'CH', zone: 'E', ttr: '3-4' },
  'Vaticano':       { name: 'Vaticano', iso: 'VA', zone: 'E', ttr: '4-5' },
};

export function getEuropeDestinationsByZone(): Record<EuropeZone, string[]> {
  const byZone: Record<EuropeZone, string[]> = { A: [], B: [], C: [], D: [], E: [], F: [], G: [], H: [] };
  for (const [country, data] of Object.entries(EUROPE_ZONE_DATA)) {
    byZone[data.zone].push(country);
  }
  return byZone;
}

export function sortEuropeDestinationsByZone(destinations: string[], highlightedCountry?: string): string[] {
  return [...destinations].sort((a, b) => {
    if (highlightedCountry) {
      if (a === highlightedCountry) return -1;
      if (b === highlightedCountry) return 1;
      const zoneA = EUROPE_ZONE_DATA[a]?.zone || 'Z';
      const zoneB = EUROPE_ZONE_DATA[b]?.zone || 'Z';
      const highlightedZone = EUROPE_ZONE_DATA[highlightedCountry]?.zone;
      if (highlightedZone) {
        if (zoneA === highlightedZone && zoneB !== highlightedZone) return -1;
        if (zoneB === highlightedZone && zoneA !== highlightedZone) return 1;
      }
    }
    const zoneA = EUROPE_ZONE_DATA[a]?.zone || 'Z';
    const zoneB = EUROPE_ZONE_DATA[b]?.zone || 'Z';
    if (zoneA !== zoneB) return zoneA.localeCompare(zoneB);
    return a.localeCompare(b, 'es');
  });
}
