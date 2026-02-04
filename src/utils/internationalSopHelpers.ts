import { roundUp } from './calculations';

export interface InternationalTariff {
  id?: string;
  service_name: string;
  country: string;
  weight_from: number;
  weight_to: number | null;
  cost: number;
}

export const INTERNATIONAL_DESTINATIONS = [
  'Alemania',
  'Austria',
  'Belgica',
  'Bulgaria',
  'Chipre',
  'Croacia',
  'Dinamarca',
  'Eslovaquia',
  'Eslovenia',
  'Estonia',
  'Finlandia',
  'Francia',
  'Corcega',
  'Grecia',
  'Hungria',
  'Irlanda',
  'Italia',
  'Letonia',
  'Liechtenstein',
  'Lituania',
  'Luxemburgo',
  'Malta',
  'Monaco',
  'Noruega',
  'Paises Bajos',
  'Polonia',
  'Reino Unido Z1',
  'Reino Unido Z2',
  'Republica Checa',
  'Rumania',
  'San Marino',
  'Serbia',
  'Suecia',
  'Suiza',
  'Vaticano'
] as const;

export type InternationalDestination = typeof INTERNATIONAL_DESTINATIONS[number];

const DESTINATION_ALIASES: Record<string, string> = {
  alemania: 'Alemania',
  austria: 'Austria',
  belgica: 'Belgica',
  bulgaria: 'Bulgaria',
  chipre: 'Chipre',
  croacia: 'Croacia',
  dinamarca: 'Dinamarca',
  eslovaquia: 'Eslovaquia',
  eslovenia: 'Eslovenia',
  estonia: 'Estonia',
  finlandia: 'Finlandia',
  francia: 'Francia',
  corcega: 'Corcega',
  grecia: 'Grecia',
  hungria: 'Hungria',
  irlanda: 'Irlanda',
  italia: 'Italia',
  letonia: 'Letonia',
  liechtenstein: 'Liechtenstein',
  lituania: 'Lituania',
  luxemburgo: 'Luxemburgo',
  malta: 'Malta',
  monaco: 'Monaco',
  noruega: 'Noruega',
  paises_bajos: 'Paises Bajos',
  paisesbajos: 'Paises Bajos',
  holanda: 'Paises Bajos',
  polonia: 'Polonia',
  reino_unido_z1: 'Reino Unido Z1',
  reinounidoz1: 'Reino Unido Z1',
  uk_z1: 'Reino Unido Z1',
  reino_unido_z2: 'Reino Unido Z2',
  reinounidoz2: 'Reino Unido Z2',
  uk_z2: 'Reino Unido Z2',
  republica_checa: 'Republica Checa',
  republicacheca: 'Republica Checa',
  chequia: 'Republica Checa',
  rumania: 'Rumania',
  san_marino: 'San Marino',
  sanmarino: 'San Marino',
  serbia: 'Serbia',
  suecia: 'Suecia',
  suiza: 'Suiza',
  vaticano: 'Vaticano'
};

const normalizeText = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

export function normalizeInternationalDestination(rangeName: string): string | null {
  if (!rangeName) {
    return null;
  }

  const normalized = normalizeText(rangeName);
  const country = DESTINATION_ALIASES[normalized];

  if (country) {
    return country;
  }

  const directMatch = INTERNATIONAL_DESTINATIONS.find(
    dest => normalizeText(dest) === normalized
  );

  return directMatch ?? null;
}

export function calculateInternationalPvp(cost: number, marginPercentage: number): number {
  if (cost <= 0) {
    return 0;
  }

  const marginFactor = marginPercentage < 100 ? 1 - marginPercentage / 100 : 0;

  if (marginFactor <= 0) {
    return roundUp(cost);
  }

  const pvp = cost / marginFactor;
  return roundUp(pvp);
}

const formatWeightKey = (value: number | null, isWeightTo = false): string => {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (isWeightTo && value >= 999) {
    return 'null';
  }
  return Number.isInteger(value) ? String(value) : value.toString();
};

export function createInternationalMapKey(
  serviceName: string,
  country: string,
  weightFrom: number,
  weightTo: number | null
): string {
  const serviceKey = normalizeText(serviceName);
  const countryKey = normalizeText(country);
  return `${serviceKey}|${countryKey}|${formatWeightKey(weightFrom, false)}|${formatWeightKey(weightTo, true)}`;
}

export interface BuildInternationalValueMapOptions {
  marginPercentage: number;
}

export function buildInternationalValueMap(
  tariffs: InternationalTariff[],
  options: BuildInternationalValueMapOptions
): Map<string, number> {
  const valueMap = new Map<string, number>();

  if (!Array.isArray(tariffs) || tariffs.length === 0) {
    return valueMap;
  }

  const { marginPercentage } = options;

  for (const tariff of tariffs) {
    const pvp = calculateInternationalPvp(tariff.cost, marginPercentage);

    const mapKey = createInternationalMapKey(
      tariff.service_name,
      tariff.country,
      tariff.weight_from,
      tariff.weight_to
    );

    valueMap.set(mapKey, pvp);
  }

  return valueMap;
}

export function lookupInternationalPvp(
  valueMap: Map<string, number>,
  serviceName: string,
  country: string,
  weightFrom: number,
  weightTo: number | null
): number | null {
  const mapKey = createInternationalMapKey(serviceName, country, weightFrom, weightTo);
  const value = valueMap.get(mapKey);
  return value !== undefined ? value : null;
}
