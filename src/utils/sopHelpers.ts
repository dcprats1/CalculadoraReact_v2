/**
 * SOP Helper Utilities
 *
 * Funciones compartidas entre SOPGenerator y ComparatorMiniSOPGenerator
 * para mantener consistencia en la normalización de servicios y zonas,
 * y evitar duplicación de código.
 */

export const FTP_FILE_URL = 'https://www.logicalogistica.com/area-privada/base%20SOP%20FTP.xlsx';

export type ModeSuffix = 'sal' | 'rec' | 'int';

/**
 * Mapeo de nombres de servicio del Excel a nombres canónicos
 */
export const SERVICE_NAME_ALIASES: Record<string, string> = {
  'express 8 30': 'Urg8:30H Courier',
  'express 830': 'Urg8:30H Courier',
  'express8 30': 'Urg8:30H Courier',
  'express 10 30': 'Urg10H Courier',
  'express 1030': 'Urg10H Courier',
  'express10 30': 'Urg10H Courier',
  'express 14 00': 'Urg14H Courier',
  'express 1400': 'Urg14H Courier',
  'express14 00': 'Urg14H Courier',
  'express 19 00': 'Urg19H Courier',
  'express 1900': 'Urg19H Courier',
  'express19 00': 'Urg19H Courier',
  'business parcel': 'Business Parcel',
  'economy parcel': 'Economy Parcel',
  'maritimo': 'Marítimo',
  'maritimo maritimo': 'Marítimo',
  'parcel shop': 'Parcel Shop',
  'eurobusiness parcel': 'EuroBusiness Parcel'
};

/**
 * Mapeo de zonas del Excel a identificadores normalizados
 */
export const BASE_RANGE_ALIASES: Record<string, string> = {
  provincial: 'provincial',
  prov: 'provincial',
  regional: 'regional',
  reg: 'regional',
  nacional: 'nacional',
  nacional_: 'nacional',
  pen: 'nacional',
  peninsula: 'nacional',
  portugal: 'portugal',
  port: 'portugal',
  andorra: 'andorra',
  gibraltar: 'gibraltar',
  canarias_mayores: 'canarias_mayores',
  can_my: 'canarias_mayores',
  canarias_menores: 'canarias_menores',
  can_mn: 'canarias_menores',
  baleares_mayores: 'baleares_mayores',
  bal_my: 'baleares_mayores',
  baleares_menores: 'baleares_menores',
  bal_mn: 'baleares_menores',
  ceuta: 'ceuta',
  melilla: 'melilla',
  madeira_mayores: 'madeira_mayores',
  madeira_mayores_maritimo: 'madeira_mayores',
  madeiramayores: 'madeira_mayores',
  madeiramayoresmaritimo: 'madeira_mayores',
  mad_my: 'madeira_mayores',
  madeira_menores: 'madeira_menores',
  madeira_menores_maritimo: 'madeira_menores',
  madeiramenores: 'madeira_menores',
  madeiramenoresmaritimo: 'madeira_menores',
  mad_mn: 'madeira_menores',
  azores_mayores: 'azores_mayores',
  azores_mayores_maritimo: 'azores_mayores',
  azoresmayores: 'azores_mayores',
  azoresmayoresmaritimo: 'azores_mayores',
  az_my: 'azores_mayores',
  azores_menores: 'azores_menores',
  azores_menores_maritimo: 'azores_menores',
  azoresmenores: 'azores_menores',
  azoresmenoresmaritimo: 'azores_menores',
  az_mn: 'azores_menores'
};

/**
 * Normaliza un nombre de servicio a formato clave
 * @param value Nombre del servicio
 * @returns Clave normalizada en minúsculas sin acentos
 */
export const createServiceKey = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Resuelve el nombre de servicio del Excel a nombre canónico
 * @param raw Nombre del servicio tal como aparece en el Excel
 * @returns Nombre canónico o null si no se encuentra
 */
export const resolveExcelServiceKey = (raw: string): string | null => {
  const normalized = createServiceKey(raw);
  if (!normalized) {
    return null;
  }

  const aliasTarget = SERVICE_NAME_ALIASES[normalized];
  const resolved = aliasTarget ?? raw;
  const canonical = createServiceKey(resolved);
  return canonical || null;
};

/**
 * Normaliza un nombre de zona
 * @param value Nombre de zona
 * @returns Clave normalizada
 */
export const createZoneKey = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');

/**
 * Resuelve el alias de zona a nombre canónico
 * @param raw Nombre de zona del Excel
 * @returns Nombre canónico de zona
 */
export const resolveZoneAlias = (raw: string): string | null => {
  const normalized = createZoneKey(raw);
  return BASE_RANGE_ALIASES[normalized] ?? null;
};

/**
 * Normaliza el nombre de rango/zona del Excel incluyendo sufijos de modalidad
 * Esta función replica la lógica de SOPGenerator para manejar correctamente
 * los nombres de zona con sufijos _sal, _rec, _int
 *
 * @param range Nombre de rango del Excel (ej: "Provincial_Salida", "Nacional_Rec", etc.)
 * @returns Clave normalizada con sufijo (ej: "provincial_sal") o null si no se puede resolver
 */
export const normalizeRangeName = (range: string): string | null => {
  if (!range) {
    return null;
  }

  const normalized = range
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  let suffix: ModeSuffix = 'sal';
  let baseCandidate = normalized;

  const explicitSuffix = baseCandidate.match(/_(sal|rec|int)$/);
  if (explicitSuffix) {
    suffix = explicitSuffix[1] as ModeSuffix;
    baseCandidate = baseCandidate.slice(0, -explicitSuffix[0].length);
  } else {
    if (/_recogida?/.test(baseCandidate) || /_rec\b/.test(baseCandidate)) {
      suffix = 'rec';
      baseCandidate = baseCandidate.replace(/_recogida?/, '').replace(/_rec\b/, '');
    } else if (/_interciudad/.test(baseCandidate) || /_inter/.test(baseCandidate) || /_int$/.test(baseCandidate)) {
      suffix = 'int';
      baseCandidate = baseCandidate
        .replace(/_interciudad/, '')
        .replace(/_inter/, '')
        .replace(/_int$/, '');
    } else if (/_salida/.test(baseCandidate)) {
      suffix = 'sal';
      baseCandidate = baseCandidate.replace(/_salida/, '');
    }
  }

  baseCandidate = baseCandidate.replace(/_+/g, '_').replace(/^_|_$/g, '');

  const lookupKeys = [
    baseCandidate,
    baseCandidate.replace(/_/g, ' '),
    baseCandidate.replace(/_/g, '')
  ];

  const base = lookupKeys.reduce<string | null>((acc, key) => {
    if (acc) return acc;
    return BASE_RANGE_ALIASES[key] ?? null;
  }, null);

  if (!base) {
    return null;
  }

  return `${base}_${suffix}`;
};

/**
 * Sanitiza nombre de archivo eliminando caracteres especiales
 * @param value Nombre a sanitizar
 * @returns Nombre limpio para uso en archivos
 */
export const sanitizeFileName = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\- ]/gi, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();

/**
 * Parsea un rango de peso del formato Excel (ej: "0-1", "1-3", "kg. adc")
 * @param rangeStr String del rango
 * @returns Objeto con from y to, o null si no es válido
 */
export const parseWeightRange = (rangeStr: string): { from: number; to: number } | null => {
  const normalized = rangeStr.toLowerCase().trim();

  if (normalized.includes('adc') || normalized.includes('adicional')) {
    return { from: 15, to: 999 };
  }

  const match = normalized.match(/(\d+(?:\.\d+)?)\s*[-a]\s*(\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }

  const from = parseFloat(match[1]);
  const to = parseFloat(match[2]);

  if (!Number.isFinite(from) || !Number.isFinite(to)) {
    return null;
  }

  return { from, to };
};

/**
 * Determina si un peso está dentro de un rango
 * @param weight Peso a verificar
 * @param from Peso inicial del rango
 * @param to Peso final del rango
 * @returns true si el peso está en el rango
 */
export const isWeightInRange = (weight: number, from: number, to: number): boolean => {
  if (to >= 999) {
    return weight > from;
  }
  return weight > from && weight <= to;
};
