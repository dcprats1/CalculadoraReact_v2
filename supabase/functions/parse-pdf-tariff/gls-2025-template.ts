/**
 * gls-2025-template.ts
 *
 * Plantilla exacta basada en "MAPA DE LECTURA DEL PDF DE TARIFAS"
 * Define la estructura real del PDF GLS 2025
 */

export interface TemplateColumn {
  name: string;
  dbSuffix: string;
  order: number;
}

export interface TemplateWeightRange {
  from: string;
  to: string;
  textPatterns: RegExp[];
}

export interface TemplateZone {
  name: string;
  dbPrefix: string;
  detectionPatterns: RegExp[];
}

export interface TemplateService {
  name: string;
  dbName: string;
  pageNumbers: number[];
  detectionPatterns: RegExp[];
  columns: TemplateColumn[];
  zones: TemplateZone[];
  weightRanges: TemplateWeightRange[];
  hasRecogidaColumn: boolean;
}

/**
 * PLANTILLA GLS 2025 - Basada en MAPA DE LECTURA
 *
 * Orden de columnas (de izquierda a derecha):
 * 1. Peso
 * 2. Recogida (solo algunos servicios)
 * 3. Arrastre
 * 4. Entrega
 * 5. Salidas
 * 6. Recogidas
 * 7. Interciudad
 * 8. Km (solo Express 10:30)
 */

const STANDARD_WEIGHT_RANGES: TemplateWeightRange[] = [
  {
    from: "0",
    to: "1",
    textPatterns: [/^1\s*[Kk]g\.?$/i, /^1$/]
  },
  {
    from: "1",
    to: "3",
    textPatterns: [/^3\s*[Kk]g\.?$/i, /^3$/]
  },
  {
    from: "3",
    to: "5",
    textPatterns: [/^5\s*[Kk]g\.?$/i, /^5$/]
  },
  {
    from: "5",
    to: "10",
    textPatterns: [/^10\s*[Kk]g\.?$/i, /^10$/]
  },
  {
    from: "10",
    to: "15",
    textPatterns: [/^15\s*[Kk]g\.?$/i, /^15$/]
  },
  {
    from: "15",
    to: "999",
    textPatterns: [/^\+\s*[Kk]g\.?$/i, /^\+$/i, /adicional/i]
  }
];

const STANDARD_ZONES: TemplateZone[] = [
  {
    name: "Provincial",
    dbPrefix: "provincial",
    detectionPatterns: [/^provincial$/i, /provincial/i]
  },
  {
    name: "Regional",
    dbPrefix: "regional",
    detectionPatterns: [/^regional$/i, /regional/i]
  },
  {
    name: "Nacional",
    dbPrefix: "nacional",
    detectionPatterns: [/^nacional$/i, /nacional/i]
  }
];

const STANDARD_COLUMNS_WITH_RECOGIDA: TemplateColumn[] = [
  { name: "Recogida", dbSuffix: "_rec_col1", order: 1 },
  { name: "Arrastre", dbSuffix: "_arr", order: 2 },
  { name: "Entrega", dbSuffix: "_ent", order: 3 },
  { name: "Salidas", dbSuffix: "_sal", order: 4 },
  { name: "Recogidas", dbSuffix: "_rec", order: 5 },
  { name: "Interciudad", dbSuffix: "_int", order: 6 }
];

const STANDARD_COLUMNS_WITHOUT_RECOGIDA: TemplateColumn[] = [
  { name: "Arrastre", dbSuffix: "_arr", order: 1 },
  { name: "Entrega", dbSuffix: "_ent", order: 2 },
  { name: "Salidas", dbSuffix: "_sal", order: 3 },
  { name: "Recogidas", dbSuffix: "_rec", order: 4 },
  { name: "Interciudad", dbSuffix: "_int", order: 5 }
];

/**
 * PLANTILLA COMPLETA GLS 2025
 */
export const GLS_2025_TEMPLATE: TemplateService[] = [
  {
    name: "Express 08:30",
    dbName: "Urg8:30H Courier",
    pageNumbers: [4],
    detectionPatterns: [/express\s*0?8\s*:\s*30/i, /urg.*0?8:?30/i],
    columns: STANDARD_COLUMNS_WITH_RECOGIDA,
    zones: STANDARD_ZONES,
    weightRanges: STANDARD_WEIGHT_RANGES,
    hasRecogidaColumn: true
  },
  {
    name: "Express 10:30",
    dbName: "Express 10:30",
    pageNumbers: [4],
    detectionPatterns: [/express\s*10\s*:\s*30/i],
    columns: [
      { name: "Recogida", dbSuffix: "_rec_col1", order: 1 },
      { name: "Arrastre", dbSuffix: "_arr", order: 2 },
      { name: "Entrega", dbSuffix: "_ent", order: 3 },
      { name: "Salidas", dbSuffix: "_sal", order: 4 },
      { name: "Recogidas", dbSuffix: "_rec", order: 5 },
      { name: "Interciudad", dbSuffix: "_int", order: 6 },
      { name: "Km", dbSuffix: "_km", order: 7 }
    ],
    zones: STANDARD_ZONES,
    weightRanges: STANDARD_WEIGHT_RANGES,
    hasRecogidaColumn: true
  },
  {
    name: "Express 14:30",
    dbName: "Urg14H Courier",
    pageNumbers: [5],
    detectionPatterns: [/express\s*14\s*:\s*30/i, /express\s*14\s*:\s*00/i, /urg.*14/i],
    columns: STANDARD_COLUMNS_WITH_RECOGIDA,
    zones: [
      ...STANDARD_ZONES,
      {
        name: "Portugal (Peninsular)",
        dbPrefix: "portugal",
        detectionPatterns: [/portugal.*peninsular/i, /portugal/i]
      }
    ],
    weightRanges: STANDARD_WEIGHT_RANGES,
    hasRecogidaColumn: true
  },
  {
    name: "Express 19:00",
    dbName: "Urg19H Courier",
    pageNumbers: [6],
    detectionPatterns: [/express\s*19\s*:\s*00/i, /urg.*19/i],
    columns: STANDARD_COLUMNS_WITH_RECOGIDA,
    zones: [
      ...STANDARD_ZONES,
      {
        name: "Portugal (Peninsular)",
        dbPrefix: "portugal",
        detectionPatterns: [/portugal.*peninsular/i, /portugal/i]
      },
      {
        name: "Ceuta & Melilla",
        dbPrefix: "ceuta_melilla",
        detectionPatterns: [/ceuta.*melilla/i, /ceuta/i]
      },
      {
        name: "Gibraltar",
        dbPrefix: "gibraltar",
        detectionPatterns: [/gibraltar/i]
      },
      {
        name: "Andorra",
        dbPrefix: "andorra",
        detectionPatterns: [/andorra/i]
      }
    ],
    weightRanges: STANDARD_WEIGHT_RANGES,
    hasRecogidaColumn: true
  },
  {
    name: "Business Parcel",
    dbName: "Business Parcel",
    pageNumbers: [7],
    detectionPatterns: [/business\s*parcel/i],
    columns: STANDARD_COLUMNS_WITH_RECOGIDA,
    zones: [
      ...STANDARD_ZONES,
      {
        name: "Ceuta & Melilla",
        dbPrefix: "ceuta_melilla",
        detectionPatterns: [/ceuta.*melilla/i, /ceuta/i]
      },
      {
        name: "Gibraltar",
        dbPrefix: "gibraltar",
        detectionPatterns: [/gibraltar/i]
      },
      {
        name: "Andorra",
        dbPrefix: "andorra",
        detectionPatterns: [/andorra/i]
      }
    ],
    weightRanges: STANDARD_WEIGHT_RANGES,
    hasRecogidaColumn: true
  },
  {
    name: "Eurobusiness Parcel Portugal",
    dbName: "Eurobusiness Parcel",
    pageNumbers: [7],
    detectionPatterns: [/euro\s*business/i, /eurobusiness/i],
    columns: STANDARD_COLUMNS_WITH_RECOGIDA,
    zones: [
      {
        name: "Portugal (Peninsular)",
        dbPrefix: "portugal",
        detectionPatterns: [/portugal.*peninsular/i, /portugal/i]
      }
    ],
    weightRanges: STANDARD_WEIGHT_RANGES,
    hasRecogidaColumn: true
  },
  {
    name: "Economy Parcel",
    dbName: "Economy Parcel",
    pageNumbers: [8],
    detectionPatterns: [/economy\s*parcel/i],
    columns: STANDARD_COLUMNS_WITH_RECOGIDA,
    zones: STANDARD_ZONES,
    weightRanges: STANDARD_WEIGHT_RANGES,
    hasRecogidaColumn: true
  }
];

/**
 * Obtiene la plantilla para un servicio específico
 */
export function getTemplateForService(serviceName: string): TemplateService | null {
  const normalized = serviceName.toLowerCase().trim();

  for (const template of GLS_2025_TEMPLATE) {
    for (const pattern of template.detectionPatterns) {
      if (pattern.test(normalized)) {
        return template;
      }
    }
  }

  return null;
}

/**
 * Valida si una celda coincide con un patrón de peso
 */
export function matchesWeightPattern(text: string, weightRange: TemplateWeightRange): boolean {
  const normalized = text.trim();

  for (const pattern of weightRange.textPatterns) {
    if (pattern.test(normalized)) {
      return true;
    }
  }

  return false;
}

/**
 * Valida si una celda coincide con un patrón de zona
 */
export function matchesZonePattern(text: string, zone: TemplateZone): boolean {
  const normalized = text.trim();

  for (const pattern of zone.detectionPatterns) {
    if (pattern.test(normalized)) {
      return true;
    }
  }

  return false;
}
