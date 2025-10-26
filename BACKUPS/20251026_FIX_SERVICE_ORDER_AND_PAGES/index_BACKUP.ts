import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface CoordinateBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TableCell {
  column: string;
  value: number | null;
}

interface TableRow {
  weightFrom: string;
  weightTo: string;
  cells: Record<string, number | null>;
}

interface ServiceTableDefinition {
  serviceName: string;
  dbName: string;
  page: number;
  detectionPatterns: RegExp[];
  columns: {
    name: string;
    dbSuffix: string;
    xRange: [number, number];
  }[];
  weightColumn: {
    xRange: [number, number];
  };
  zones: {
    name: string;
    dbPrefix: string;
    textPatterns: RegExp[];
    keywords: string[];
  }[];
}

interface DetectedZone {
  zoneName: string;
  dbPrefix: string;
  startRowIndex: number;
  endRowIndex: number;
  rowTexts: string[];
}

interface TableBlock {
  serviceName: string;
  startY: number;
  endY: number;
  items: TextItem[];
}

const GLS_2025_TEMPLATE: ServiceTableDefinition[] = [
  {
    serviceName: "Express 08:30",
    dbName: "Urg8:30H Courier",
    page: 4,
    detectionPatterns: [/express\s*0?8:?30/i, /urg\s*0?8:?30/i],
    columns: [
      { name: "Recogida", dbSuffix: "_rec", xRange: [100, 200] },
      { name: "Arrastre", dbSuffix: "_arr", xRange: [200, 300] },
      { name: "Entrega", dbSuffix: "_ent", xRange: [300, 400] },
      { name: "Salidas", dbSuffix: "_sal", xRange: [400, 500] },
      { name: "Recogidas", dbSuffix: "_rec_extra", xRange: [500, 600] },
      { name: "Interciudad", dbSuffix: "_int", xRange: [600, 700] },
    ],
    weightColumn: { xRange: [50, 100] },
    zones: [
      {
        name: "Provincial",
        dbPrefix: "provincial",
        textPatterns: [/provincial/i, /PROVINCIAL/],
        keywords: ["provincial", "Provincial"]
      },
      {
        name: "Regional",
        dbPrefix: "regional",
        textPatterns: [/regional/i, /REGIONAL/],
        keywords: ["regional", "Regional"]
      },
      {
        name: "Nacional",
        dbPrefix: "nacional",
        textPatterns: [/nacional/i, /NACIONAL/],
        keywords: ["nacional", "Nacional"]
      },
    ]
  },
  {
    serviceName: "Express 14:00",
    dbName: "Urg14H Courier",
    page: 5,
    detectionPatterns: [/express\s*14:?00/i, /urg\s*14/i],
    columns: [
      { name: "Recogida", dbSuffix: "_rec", xRange: [100, 200] },
      { name: "Arrastre", dbSuffix: "_arr", xRange: [200, 300] },
      { name: "Entrega", dbSuffix: "_ent", xRange: [300, 400] },
      { name: "Salidas", dbSuffix: "_sal", xRange: [400, 500] },
      { name: "Recogidas", dbSuffix: "_rec_extra", xRange: [500, 600] },
      { name: "Interciudad", dbSuffix: "_int", xRange: [600, 700] },
    ],
    weightColumn: { xRange: [50, 100] },
    zones: [
      {
        name: "Provincial",
        dbPrefix: "provincial",
        textPatterns: [/provincial/i, /PROVINCIAL/],
        keywords: ["provincial", "Provincial"]
      },
      {
        name: "Regional",
        dbPrefix: "regional",
        textPatterns: [/regional/i, /REGIONAL/],
        keywords: ["regional", "Regional"]
      },
      {
        name: "Nacional",
        dbPrefix: "nacional",
        textPatterns: [/nacional/i, /NACIONAL/],
        keywords: ["nacional", "Nacional"]
      },
    ]
  },
  {
    serviceName: "Express 19:00",
    dbName: "Urg19H Courier",
    page: 6,
    detectionPatterns: [/express\s*19:?00/i, /urg\s*19/i],
    columns: [
      { name: "Recogida", dbSuffix: "_rec", xRange: [100, 200] },
      { name: "Arrastre", dbSuffix: "_arr", xRange: [200, 300] },
      { name: "Entrega", dbSuffix: "_ent", xRange: [300, 400] },
      { name: "Salidas", dbSuffix: "_sal", xRange: [400, 500] },
      { name: "Recogidas", dbSuffix: "_rec_extra", xRange: [500, 600] },
      { name: "Interciudad", dbSuffix: "_int", xRange: [600, 700] },
    ],
    weightColumn: { xRange: [50, 100] },
    zones: [
      {
        name: "Provincial",
        dbPrefix: "provincial",
        textPatterns: [/provincial/i, /PROVINCIAL/],
        keywords: ["provincial", "Provincial"]
      },
      {
        name: "Regional",
        dbPrefix: "regional",
        textPatterns: [/regional/i, /REGIONAL/],
        keywords: ["regional", "Regional"]
      },
      {
        name: "Nacional",
        dbPrefix: "nacional",
        textPatterns: [/nacional/i, /NACIONAL/],
        keywords: ["nacional", "Nacional"]
      },
    ]
  },
  {
    serviceName: "Business Parcel",
    dbName: "Business Parcel",
    page: 7,
    detectionPatterns: [/business\s*parcel/i, /businessparcel/i],
    columns: [
      { name: "Recogida", dbSuffix: "_rec", xRange: [100, 200] },
      { name: "Arrastre", dbSuffix: "_arr", xRange: [200, 300] },
      { name: "Entrega", dbSuffix: "_ent", xRange: [300, 400] },
      { name: "Salidas", dbSuffix: "_sal", xRange: [400, 500] },
      { name: "Recogidas", dbSuffix: "_rec_extra", xRange: [500, 600] },
      { name: "Interciudad", dbSuffix: "_int", xRange: [600, 700] },
    ],
    weightColumn: { xRange: [50, 100] },
    zones: [
      {
        name: "Provincial",
        dbPrefix: "provincial",
        textPatterns: [/provincial/i, /PROVINCIAL/],
        keywords: ["provincial", "Provincial"]
      },
      {
        name: "Regional",
        dbPrefix: "regional",
        textPatterns: [/regional/i, /REGIONAL/],
        keywords: ["regional", "Regional"]
      },
      {
        name: "Nacional",
        dbPrefix: "nacional",
        textPatterns: [/nacional/i, /NACIONAL/],
        keywords: ["nacional", "Nacional"]
      },
    ]
  },
  {
    serviceName: "Eurobusiness Parcel",
    dbName: "Eurobusiness Parcel",
    page: 7,
    detectionPatterns: [/euro\s*business/i, /eurobusiness/i],
    columns: [
      { name: "Recogida", dbSuffix: "_rec", xRange: [100, 200] },
      { name: "Arrastre", dbSuffix: "_arr", xRange: [200, 300] },
      { name: "Entrega", dbSuffix: "_ent", xRange: [300, 400] },
      { name: "Salidas", dbSuffix: "_sal", xRange: [400, 500] },
      { name: "Recogidas", dbSuffix: "_rec_extra", xRange: [500, 600] },
      { name: "Interciudad", dbSuffix: "_int", xRange: [600, 700] },
    ],
    weightColumn: { xRange: [50, 100] },
    zones: [
      {
        name: "Provincial",
        dbPrefix: "provincial",
        textPatterns: [/provincial/i, /PROVINCIAL/],
        keywords: ["provincial", "Provincial"]
      },
      {
        name: "Regional",
        dbPrefix: "regional",
        textPatterns: [/regional/i, /REGIONAL/],
        keywords: ["regional", "Regional"]
      },
      {
        name: "Nacional",
        dbPrefix: "nacional",
        textPatterns: [/nacional/i, /NACIONAL/],
        keywords: ["nacional", "Nacional"]
      },
    ]
  },
  {
    serviceName: "Economy Parcel",
    dbName: "Economy Parcel",
    page: 8,
    detectionPatterns: [/economy\s*parcel/i, /economyparcel/i],
    columns: [
      { name: "Recogida", dbSuffix: "_rec", xRange: [100, 200] },
      { name: "Arrastre", dbSuffix: "_arr", xRange: [200, 300] },
      { name: "Entrega", dbSuffix: "_ent", xRange: [300, 400] },
      { name: "Salidas", dbSuffix: "_sal", xRange: [400, 500] },
      { name: "Recogidas", dbSuffix: "_rec_extra", xRange: [500, 600] },
      { name: "Interciudad", dbSuffix: "_int", xRange: [600, 700] },
    ],
    weightColumn: { xRange: [50, 100] },
    zones: [
      {
        name: "Provincial",
        dbPrefix: "provincial",
        textPatterns: [/provincial/i, /PROVINCIAL/],
        keywords: ["provincial", "Provincial"]
      },
      {
        name: "Regional",
        dbPrefix: "regional",
        textPatterns: [/regional/i, /REGIONAL/],
        keywords: ["regional", "Regional"]
      },
      {
        name: "Nacional",
        dbPrefix: "nacional",
        textPatterns: [/nacional/i, /NACIONAL/],
        keywords: ["nacional", "Nacional"]
      },
    ]
  },
  {
    serviceName: "Shop Return Service",
    dbName: "Parcel Shop",
    page: 8,
    detectionPatterns: [/shop\s*return/i, /parcel\s*shop/i],
    columns: [
      { name: "Recogida", dbSuffix: "_rec", xRange: [100, 200] },
      { name: "Arrastre", dbSuffix: "_arr", xRange: [200, 300] },
      { name: "Entrega", dbSuffix: "_ent", xRange: [300, 400] },
      { name: "Salidas", dbSuffix: "_sal", xRange: [400, 500] },
      { name: "Recogidas", dbSuffix: "_rec_extra", xRange: [500, 600] },
      { name: "Interciudad", dbSuffix: "_int", xRange: [600, 700] },
    ],
    weightColumn: { xRange: [50, 100] },
    zones: [
      {
        name: "Provincial",
        dbPrefix: "provincial",
        textPatterns: [/provincial/i, /PROVINCIAL/],
        keywords: ["provincial", "Provincial"]
      },
      {
        name: "Regional",
        dbPrefix: "regional",
        textPatterns: [/regional/i, /REGIONAL/],
        keywords: ["regional", "Regional"]
      },
      {
        name: "Nacional",
        dbPrefix: "nacional",
        textPatterns: [/nacional/i, /NACIONAL/],
        keywords: ["nacional", "Nacional"]
      },
    ]
  },
];

const WEIGHT_RANGES = [
  {
    from: "0",
    to: "1",
    patterns: [
      /^1\s*Kg\.?/i,
      /^1\s*kg\.?/i,
      /^\s*1\s+Kg/i,
      /^1$/,
      /\b1\s*kg\b/i,
      /^0\s*-\s*1/i
    ]
  },
  {
    from: "1",
    to: "3",
    patterns: [
      /^3\s*Kg\.?/i,
      /^3\s*kg\.?/i,
      /^\s*3\s+Kg/i,
      /^3$/,
      /\b3\s*kg\b/i,
      /^1\s*-\s*3/i
    ]
  },
  {
    from: "3",
    to: "5",
    patterns: [
      /^5\s*Kg\.?/i,
      /^5\s*kg\.?/i,
      /^\s*5\s+Kg/i,
      /^5$/,
      /\b5\s*kg\b/i,
      /^3\s*-\s*5/i
    ]
  },
  {
    from: "5",
    to: "10",
    patterns: [
      /^10\s*Kg\.?/i,
      /^10\s*kg\.?/i,
      /^\s*10\s+Kg/i,
      /^10$/,
      /\b10\s*kg\b/i,
      /^5\s*-\s*10/i
    ]
  },
  {
    from: "10",
    to: "15",
    patterns: [
      /^15\s*Kg\.?/i,
      /^15\s*kg\.?/i,
      /^\s*15\s+Kg/i,
      /^15$/,
      /\b15\s*kg\b/i,
      /^10\s*-\s*15/i
    ]
  },
  {
    from: "15",
    to: "999",
    patterns: [
      /^\+\s*Kg\.?/i,
      /^\+\s*kg\.?/i,
      /adicional/i,
      /extra/i,
      /más/i,
      /^\+kg/i,
      /^15\s*\+/i,
      /mayor.*15/i
    ]
  },
];

const VALID_DB_FIELDS = new Set([
  'service_name', 'weight_from', 'weight_to',
  'provincial_sal', 'provincial_rec', 'provincial_int', 'provincial_arr',
  'regional_sal', 'regional_rec', 'regional_int', 'regional_arr',
  'nacional_sal', 'nacional_rec', 'nacional_int', 'nacional_arr',
  'portugal_sal', 'portugal_rec', 'portugal_int', 'portugal_arr',
  'andorra_sal', 'andorra_rec', 'andorra_int', 'andorra_arr',
  'gibraltar_sal', 'gibraltar_rec', 'gibraltar_int', 'gibraltar_arr',
  'canarias_mayores_sal', 'canarias_mayores_rec', 'canarias_mayores_int', 'canarias_mayores_arr',
  'canarias_menores_sal', 'canarias_menores_rec', 'canarias_menores_int', 'canarias_menores_arr',
  'baleares_mayores_sal', 'baleares_mayores_rec', 'baleares_mayores_int', 'baleares_mayores_arr',
  'baleares_menores_sal', 'baleares_menores_rec', 'baleares_menores_int', 'baleares_menores_arr',
  'ceuta_sal', 'ceuta_rec', 'ceuta_int', 'ceuta_arr',
  'melilla_sal', 'melilla_rec', 'melilla_int', 'melilla_arr',
  'azores_mayores_sal', 'azores_mayores_rec', 'azores_mayores_int',
  'azores_menores_sal', 'azores_menores_rec', 'azores_menores_int',
  'madeira_mayores_sal', 'madeira_mayores_rec', 'madeira_mayores_int',
  'madeira_menores_sal', 'madeira_menores_rec', 'madeira_menores_int',
]);

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

interface PageData {
  pageNum: number;
  items: TextItem[];
  width: number;
  height: number;
}

async function extractStructuredTextFromPDF(uint8Array: Uint8Array): Promise<PageData[]> {
  try {
    console.log('[PDF Parser] Cargando PDF.js...');
    const { getDocument, version } = await import("npm:pdfjs-dist@4.0.379/legacy/build/pdf.mjs");
    console.log(`[PDF Parser] PDF.js v${version} cargado`);

    const loadingTask = getDocument({
      data: uint8Array,
      verbosity: 0,
      isEvalSupported: false,
      useSystemFonts: true,
    });

    const pdfDocument = await loadingTask.promise;
        const numPages = pdfDocument.numPages;
    console.log(`[PDF Parser] PDF cargado: ${numPages} páginas`);

    const pages: PageData[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      const items = textContent.items.map((item: any) => ({
        str: item.str,
        transform: item.transform,
        width: item.width,
        height: item.height,
      }));

      pages.push({
        pageNum,
        items,
        width: viewport.width,
        height: viewport.height,
      });

      console.log(`[PDF Parser] Página ${pageNum}/${numPages}: ${items.length} elementos de texto extraídos`);
    }

    return pages;

  } catch (error) {
    console.error('[PDF Parser] Error con PDF.js:', error);
    throw new Error(`Error al extraer texto estructurado del PDF: ${error.message}`);
  }
}

function detectPDFVersion(pages: PageData[]): string {
  console.log('[Detector Versión] Analizando versión del PDF...');

  const firstPageText = pages[0]?.items.map(item => item.str).join(' ').toLowerCase() || '';

  const yearPatterns = [
    { year: '2025', pattern: /2025/ },
    { year: '2024', pattern: /2024/ },
    { year: '2026', pattern: /2026/ },
  ];

  for (const { year, pattern } of yearPatterns) {
    if (pattern.test(firstPageText)) {
      console.log(`[Detector Versión] ✓ PDF detectado como versión ${year}`);
      return year;
    }
  }

  console.log('[Detector Versión] ⚠ No se detectó año, asumiendo 2025');
  return '2025';
}

function findTextInCoordinates(
  items: TextItem[],
  xRange: [number, number],
  yRange: [number, number]
): string[] {
  const found: string[] = [];

  for (const item of items) {
    const x = item.transform[4];
    const y = item.transform[5];

    if (x >= xRange[0] && x <= xRange[1] && y >= yRange[0] && y <= yRange[1]) {
      if (item.str.trim().length > 0) {
        found.push(item.str.trim());
      }
    }
  }

  return found;
}

function parseNumber(text: string): number | null {
  const cleaned = text.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return (!isNaN(num) && num > 0 && num < 10000) ? num : null;
}

function extractWeight(text: string): { from: string; to: string } | null {
  for (const range of WEIGHT_RANGES) {
    for (const pattern of range.patterns) {
      if (pattern.test(text)) {
        return { from: range.from, to: range.to };
      }
    }
  }
  return null;
}

function detectService(pageData: PageData): ServiceTableDefinition | null {
  const pageText = pageData.items.map(item => item.str).join(' ').toLowerCase();

  for (const template of GLS_2025_TEMPLATE) {
    if (template.page === pageData.pageNum) {
      for (const pattern of template.detectionPatterns) {
        if (pattern.test(pageText)) {
          console.log(`[Detector Servicio] ✓ Servicio "${template.serviceName}" detectado en página ${pageData.pageNum}`);
          return template;
        }
      }
    }
  }

  const anyTemplateForPage = GLS_2025_TEMPLATE.filter(t => t.page === pageData.pageNum);
  if (anyTemplateForPage.length > 0) {
    console.log(`[Detector Servicio] Página ${pageData.pageNum} tiene plantillas pero no se detectó servicio específico`);
  }

  return null;
}

function detectHeaders(pageData: PageData): Array<{text: string, x: number, columnName: string}> {
  const detectedHeaders: Array<{text: string, x: number, columnName: string}> = [];

  for (const item of pageData.items) {
    const text = item.str.toLowerCase();
    const x = item.transform[4];

    if (/(recogida|recog)/i.test(text)) {
      detectedHeaders.push({text: 'Recogida', x, columnName: 'Recogida'});
    } else if (/arrastre/i.test(text)) {
      detectedHeaders.push({text: 'Arrastre', x, columnName: 'Arrastre'});
    } else if (/(entrega|entr)/i.test(text)) {
      detectedHeaders.push({text: 'Entrega', x, columnName: 'Entrega'});
    } else if (/(salidas|salid)/i.test(text)) {
      detectedHeaders.push({text: 'Salidas', x, columnName: 'Salidas'});
    } else if (/(interciudad|inter)/i.test(text)) {
      detectedHeaders.push({text: 'Interciudad', x, columnName: 'Interciudad'});
    }
  }

  return detectedHeaders;
}

function calibrateCoordinates(pageData: PageData, template: ServiceTableDefinition): ServiceTableDefinition {
  console.log('[Calibrador] Calibrando coordenadas basándose en el texto real...');

  const calibratedTemplate = JSON.parse(JSON.stringify(template));

  const detectedHeaders = detectHeaders(pageData);
  if (detectedHeaders.length >= 3) {
    console.log(`[Calibrador] ✓ ${detectedHeaders.length} encabezados detectados, ajustando coordenadas...`);

    for (const header of detectedHeaders) {
      const columnDef = calibratedTemplate.columns.find(col => col.name === header.columnName);
      if (columnDef) {
        const oldRange = columnDef.xRange;
        columnDef.xRange = [header.x - 20, header.x + 80];
        console.log(`[Calibrador]   ${header.columnName}: [${oldRange[0]}, ${oldRange[1]}] → [${columnDef.xRange[0]}, ${columnDef.xRange[1]}]`);
      }
    }
  } else {
    console.log(`[Calibrador] Solo ${detectedHeaders.length} encabezados detectados, usando coordenadas de plantilla`);
  }

  return calibratedTemplate;
}

function findServiceBlock(pageData: PageData, template: ServiceTableDefinition): TableBlock | null {
  console.log(`[Detector Bloque] Buscando bloque para servicio: ${template.serviceName}`);

  let serviceHeaderY: number | null = null;
  let nextServiceY: number | null = null;

  for (const item of pageData.items) {
    const text = item.str.toLowerCase();
    const y = item.transform[5];

    if (!serviceHeaderY) {
      for (const pattern of template.detectionPatterns) {
        if (pattern.test(text)) {
          serviceHeaderY = y;
          console.log(`[Detector Bloque] ✓ Encabezado encontrado en Y=${y}: "${item.str}"`);
          break;
        }
      }
    }

    if (serviceHeaderY && y < serviceHeaderY - 20) {
      const allTemplates = GLS_2025_TEMPLATE.filter(t => t.page === pageData.pageNum && t.serviceName !== template.serviceName);
      for (const otherTemplate of allTemplates) {
        for (const pattern of otherTemplate.detectionPatterns) {
          if (pattern.test(text)) {
            nextServiceY = y;
            console.log(`[Detector Bloque] ✓ Siguiente servicio encontrado en Y=${y}: "${item.str}"`);
            break;
          }
        }
        if (nextServiceY) break;
      }
      if (nextServiceY) break;
    }
  }

  if (!serviceHeaderY) {
    console.log(`[Detector Bloque] ✗ No se encontró encabezado del servicio`);
    return null;
  }

  const endY = nextServiceY || (serviceHeaderY - 350);
  const startY = serviceHeaderY;

  const blockItems = pageData.items.filter(item => {
    const y = item.transform[5];
    return y <= startY && y >= endY;
  });

  console.log(`[Detector Bloque] ✓ Bloque definido: Y ${startY} → ${endY} (${blockItems.length} elementos)`);

  return {
    serviceName: template.serviceName,
    startY,
    endY,
    items: blockItems
  };
}

function detectZoneInText(text: string, zoneConfig: ServiceTableDefinition['zones'][0]): boolean {
  const normalizedText = text.toLowerCase().trim();

  for (const pattern of zoneConfig.textPatterns) {
    if (pattern.test(normalizedText)) {
      return true;
    }
  }

  for (const keyword of zoneConfig.keywords) {
    if (normalizedText.includes(keyword.toLowerCase())) {
      return true;
    }
  }

  return false;
}

function classifyRowsByZone(block: TableBlock, template: ServiceTableDefinition): DetectedZone[] {
  console.log(`[Clasificador Zonas] Clasificando filas del bloque ${template.serviceName}`);

  const sortedItems = [...block.items].sort((a, b) => b.transform[5] - a.transform[5]);

  const detectedZones: DetectedZone[] = [];
  let currentZone: DetectedZone | null = null;

  const rowGroups = new Map<number, TextItem[]>();
  const tolerance = 3;

  for (const item of sortedItems) {
    const y = Math.round(item.transform[5]);
    let foundGroup = false;

    for (const [groupY, items] of rowGroups.entries()) {
      if (Math.abs(groupY - y) <= tolerance) {
        items.push(item);
        foundGroup = true;
        break;
      }
    }

    if (!foundGroup) {
      rowGroups.set(y, [item]);
    }
  }

  const sortedRows = Array.from(rowGroups.entries()).sort((a, b) => b[0] - a[0]);

  console.log(`[Clasificador Zonas] Agrupadas ${sortedRows.length} filas del bloque`);

  for (let i = 0; i < sortedRows.length; i++) {
    const [y, items] = sortedRows[i];
    const rowText = items.map(item => item.str).join(' ').trim();

    if (rowText.length === 0) continue;

    let zoneDetected = false;
    for (const zoneConfig of template.zones) {
      if (detectZoneInText(rowText, zoneConfig)) {
        if (currentZone) {
          currentZone.endRowIndex = i - 1;
          detectedZones.push(currentZone);
          console.log(`[Clasificador Zonas] ✓ Zona ${currentZone.zoneName} finalizada: filas ${currentZone.startRowIndex} a ${currentZone.endRowIndex}`);
        }

        let nextDataRowIndex = i + 1;
        let skippedRows = 0;
        const maxSkipRows = 8;

        console.log(`[Clasificador Zonas]   → Buscando primera fila de datos después del encabezado de zona...`);

        while (nextDataRowIndex < sortedRows.length && skippedRows < maxSkipRows) {
          const [nextY, nextItems] = sortedRows[nextDataRowIndex];
          const nextRowText = nextItems.map(item => item.str).join(' ').trim();

          console.log(`[Clasificador Zonas]     [Fila ${nextDataRowIndex}] Evaluando: "${nextRowText}"`);

          if (nextRowText.length === 0) {
            console.log(`[Clasificador Zonas]       ✗ Fila vacía - saltando (no cuenta para límite)`);
            nextDataRowIndex++;
            continue;
          }

          let matchedPattern = null;
          let matchedWeightRange = null;
          const hasWeightPattern = WEIGHT_RANGES.some(wr => {
            const matched = wr.patterns.some(pattern => {
              if (pattern.test(nextRowText)) {
                matchedPattern = pattern.toString();
                matchedWeightRange = `${wr.from}-${wr.to}kg`;
                return true;
              }
              return false;
            });
            return matched;
          });

          const hasFirstWeightPattern = WEIGHT_RANGES[0].patterns.some(pattern => pattern.test(nextRowText));

          const numericItems = nextItems.filter(item => {
            const parsed = parseNumber(item.str);
            return parsed !== null && parsed > 0;
          });
          const hasNumericData = numericItems.length >= 2;

          const looksLikeHeader = /kg|peso|weight|tarifa|rate|provincial|regional|nacional|zone|recogida|recog|arrastre|arr|entrega|entr|salidas|salid|interciudad|inter/i.test(nextRowText);
          const isColumnHeader = /recogida|recog|arrastre|arr|entrega|entr|salidas|salid|interciudad|inter/i.test(nextRowText);

          if (hasWeightPattern) {
            console.log(`[Clasificador Zonas]       ✓ Patrón de peso detectado: ${matchedWeightRange} (${matchedPattern})`);
          }
          if (hasFirstWeightPattern) {
            console.log(`[Clasificador Zonas]       ✓✓ PRIMER RANGO DE PESO (0-1kg) detectado`);
          }
          if (hasNumericData) {
            console.log(`[Clasificador Zonas]       ✓ Datos numéricos válidos: ${numericItems.length} valores encontrados`);
          }
          if (isColumnHeader) {
            console.log(`[Clasificador Zonas]       ! Detectado encabezado de columna de costes (Recogida/Arrastre/Entrega/etc)`);
          }
          if (looksLikeHeader && !isColumnHeader) {
            console.log(`[Clasificador Zonas]       ! Parece otro tipo de encabezado`);
          }

          if (isColumnHeader) {
            console.log(`[Clasificador Zonas]       → Saltando encabezado de columna (${skippedRows + 1}/${maxSkipRows})`);
            nextDataRowIndex++;
            skippedRows++;
            continue;
          }

          if (hasFirstWeightPattern && hasNumericData) {
            console.log(`[Clasificador Zonas]     ✓✓ Primera fila de datos CONFIRMADA en índice ${nextDataRowIndex} (0-1kg con datos numéricos)`);
            break;
          }

          if ((hasWeightPattern || hasNumericData) && !looksLikeHeader) {
            console.log(`[Clasificador Zonas]     ✓ Primera fila de datos confirmada en índice ${nextDataRowIndex}`);
            break;
          }

          console.log(`[Clasificador Zonas]       ✗ No es fila de datos válida`);
          console.log(`[Clasificador Zonas]     → Saltando fila (${skippedRows + 1}/${maxSkipRows})`);
          nextDataRowIndex++;
          skippedRows++;
        }

        if (skippedRows >= maxSkipRows) {
          console.log(`[Clasificador Zonas]     ⚠ ADVERTENCIA: Se alcanzó límite de ${maxSkipRows} filas saltadas`);
          console.log(`[Clasificador Zonas]     ⚠ Usando fila ${nextDataRowIndex} como inicio de datos`);
        }

        currentZone = {
          zoneName: zoneConfig.name,
          dbPrefix: zoneConfig.dbPrefix,
          startRowIndex: nextDataRowIndex,
          endRowIndex: sortedRows.length - 1,
          rowTexts: []
        };

        console.log(`[Clasificador Zonas] ✓ Nueva zona detectada: ${zoneConfig.name} en fila ${i} (Y=${y}): "${rowText}"`);
        console.log(`[Clasificador Zonas] ✓ Datos comienzan en índice ${nextDataRowIndex}`);
        zoneDetected = true;
        break;
      }
    }

    if (!zoneDetected && currentZone) {
      currentZone.rowTexts.push(rowText);
    }
  }

  if (currentZone) {
    detectedZones.push(currentZone);
    console.log(`[Clasificador Zonas] ✓ Zona ${currentZone.zoneName} finalizada: filas ${currentZone.startRowIndex} a ${currentZone.endRowIndex}`);
  }

  console.log(`[Clasificador Zonas] ✓ Total de zonas detectadas: ${detectedZones.length}`);
  detectedZones.forEach((zone, idx) => {
    const rowCount = zone.endRowIndex - zone.startRowIndex + 1;
    console.log(`[Clasificador Zonas]   ${idx + 1}. ${zone.zoneName}: índices ${zone.startRowIndex}-${zone.endRowIndex} (${rowCount} filas)`);
    if (rowCount < WEIGHT_RANGES.length) {
      console.log(`[Clasificador Zonas]      ⚠⚠ ADVERTENCIA CRÍTICA: Se esperaban ${WEIGHT_RANGES.length} filas de peso, pero solo hay ${rowCount}`);
      console.log(`[Clasificador Zonas]      ⚠⚠ Esto indica que se están saltando filas de datos. Verifica el inicio en índice ${zone.startRowIndex}`);
    } else if (rowCount === WEIGHT_RANGES.length) {
      console.log(`[Clasificador Zonas]      ✓✓ PERFECTO: Número correcto de filas (${WEIGHT_RANGES.length})`);
    } else {
      console.log(`[Clasificador Zonas]      ℹ Se encontraron ${rowCount} filas (${rowCount - WEIGHT_RANGES.length} más de lo esperado)`);
    }
  });

  return detectedZones;
}

function extractTableDataWithTextZones(pageData: PageData, template: ServiceTableDefinition): any[] {
  console.log(`[Extractor Texto] ===== EXTRAYENDO ${template.serviceName} CON ZONAS POR TEXTO =====`);

  const block = findServiceBlock(pageData, template);
  if (!block) {
    console.log(`[Extractor Texto] ✗ No se pudo encontrar bloque de servicio`);
    return [];
  }

  const detectedZones = classifyRowsByZone(block, template);
  if (detectedZones.length === 0) {
    console.log(`[Extractor Texto] ✗ No se detectaron zonas en el bloque`);
    return [];
  }

  const calibrated = calibrateCoordinates(pageData, template);

  const sortedItems = [...block.items].sort((a, b) => b.transform[5] - a.transform[5]);
  const rowGroups = new Map<number, TextItem[]>();
  const tolerance = 3;

  for (const item of sortedItems) {
    const y = Math.round(item.transform[5]);
    let foundGroup = false;

    for (const [groupY, items] of rowGroups.entries()) {
      if (Math.abs(groupY - y) <= tolerance) {
        items.push(item);
        foundGroup = true;
        break;
      }
    }

    if (!foundGroup) {
      rowGroups.set(y, [item]);
    }
  }

  const sortedRows = Array.from(rowGroups.entries()).sort((a, b) => b[0] - a[0]);

  const weightBasedResults = new Map<string, Record<string, any>>();

  for (let i = 0; i < WEIGHT_RANGES.length; i++) {
    const weightRange = WEIGHT_RANGES[i];
    const weightKey = `${weightRange.from}-${weightRange.to}`;

    weightBasedResults.set(weightKey, {
      service_name: template.dbName,
      weight_from: weightRange.from,
      weight_to: weightRange.to,
    });
  }

  console.log(`[Extractor Texto] Inicializados ${weightBasedResults.size} registros base por rango de peso`);

  for (const zone of detectedZones) {
    console.log(`[Extractor Texto] Procesando zona: ${zone.zoneName}`);

    const zoneDataRows = sortedRows.slice(zone.startRowIndex, zone.endRowIndex + 1);

    console.log(`[Extractor Texto]   Zona ${zone.zoneName}: ${zoneDataRows.length} filas disponibles (índices ${zone.startRowIndex} a ${zone.endRowIndex})`);

    const dataRowsCount = Math.min(WEIGHT_RANGES.length, zoneDataRows.length);

    for (let i = 0; i < dataRowsCount; i++) {
      const weightRange = WEIGHT_RANGES[i];
      const weightKey = `${weightRange.from}-${weightRange.to}`;
      const [rowY, rowItems] = zoneDataRows[i] || [0, []];
      const rowText = rowItems.map(item => item.str).join(' ').trim();

      console.log(`[Extractor Texto]   Fila física índice ${zone.startRowIndex + i} asignada a rango ${weightRange.from}-${weightRange.to}kg`);
      console.log(`[Extractor Texto]     Contenido: "${rowText}"`);

      const rowData = weightBasedResults.get(weightKey);
      if (!rowData) continue;

      let extractedValues = 0;

      for (const col of calibrated.columns) {
        const fieldName = `${zone.dbPrefix}${col.dbSuffix}`;

        if (!VALID_DB_FIELDS.has(fieldName)) {
          continue;
        }

        const cellItems = rowItems.filter(item => {
          const x = item.transform[4];
          return x >= col.xRange[0] && x <= col.xRange[1];
        });

        let cellValue: number | null = null;
        for (const item of cellItems) {
          const parsed = parseNumber(item.str);
          if (parsed !== null) {
            cellValue = parsed;
            break;
          }
        }

        rowData[fieldName] = cellValue;

        if (cellValue !== null) {
          extractedValues++;
          console.log(`[Extractor Texto]       ${col.name} → ${fieldName} = ${cellValue}`);
        }
      }

      if (extractedValues === 0) {
        console.log(`[Extractor Texto]     ⚠ ADVERTENCIA: No se extrajeron valores de esta fila`);
      } else {
        console.log(`[Extractor Texto]     ✓ Extraídos ${extractedValues} valores de la fila ${weightRange.from}-${weightRange.to}kg`);
      }
    }
  }

  const results = Array.from(weightBasedResults.values());

  console.log(`[Extractor Texto] ✓ ${results.length} filas unificadas extraídas de ${template.serviceName}`);

  const nonEmptyRows = results.filter(row => {
    const hasData = Object.entries(row).some(([key, value]) =>
      key !== 'service_name' && key !== 'weight_from' && key !== 'weight_to' && value !== null && value !== undefined
    );
    return hasData;
  });

  console.log(`[Extractor Texto] ✓ ${nonEmptyRows.length} filas con datos válidos`);

  return results;
}

function validateExtractedData(data: any[]): {valid: boolean, warnings: string[], stats: any} {
  console.log('[Validador] ===== VALIDANDO DATOS EXTRAÍDOS =====');

  const warnings: string[] = [];
  let validCount = 0;
  const serviceStats = new Map<string, { total: number, withData: number, multiZone: number }>();
  const zoneStats = new Map<string, number>();

  for (const row of data) {
    const serviceName = row.service_name;
    if (!serviceStats.has(serviceName)) {
      serviceStats.set(serviceName, { total: 0, withData: 0, multiZone: 0 });
    }
    const stats = serviceStats.get(serviceName)!;
    stats.total++;
    let hasAnyValue = false;
    let suspiciousCount = 0;
    let fieldCount = 0;
    const zonesWithData = new Set<string>();

    for (const [key, value] of Object.entries(row)) {
      if (key === 'service_name' || key === 'weight_from' || key === 'weight_to') continue;

      fieldCount++;

      if (value !== null && typeof value === 'number') {
        hasAnyValue = true;

        const zonePrefix = key.split('_')[0];
        zonesWithData.add(zonePrefix);
        zoneStats.set(zonePrefix, (zoneStats.get(zonePrefix) || 0) + 1);

        if (value < 0.01) {
          warnings.push(`${serviceName} ${row.weight_from}kg: ${key}=${value} (valor muy bajo)`);
          suspiciousCount++;
        } else if (value > 500) {
          warnings.push(`${serviceName} ${row.weight_from}kg: ${key}=${value} (valor muy alto)`);
          suspiciousCount++;
        }
      }
    }

    if (hasAnyValue && suspiciousCount < 3) {
      validCount++;
      stats.withData++;
    }

    if (zonesWithData.size >= 2) {
      stats.multiZone++;
    } else if (zonesWithData.size === 1) {
      warnings.push(`${serviceName} ${row.weight_from}-${row.weight_to}kg: Solo tiene datos de 1 zona (${Array.from(zonesWithData)[0]})`);
    }
  }

  const validPercentage = (validCount / data.length) * 100;
  console.log(`[Validador] Filas válidas: ${validCount}/${data.length} (${validPercentage.toFixed(1)}%)`);
  console.log(`[Validador] Warnings: ${warnings.length}`);

  console.log(`[Validador] Estadísticas por servicio:`);
  for (const [service, stats] of serviceStats.entries()) {
    console.log(`[Validador]   ${service}: ${stats.withData}/${stats.total} filas con datos`);
    console.log(`[Validador]     Filas con múltiples zonas: ${stats.multiZone}/${stats.withData}`);
  }

  console.log(`[Validador] Datos por zona:`);
  for (const [zone, count] of zoneStats.entries()) {
    console.log(`[Validador]   ${zone}: ${count} valores extraídos`);
  }

  if (warnings.length > 0 && warnings.length <= 10) {
    warnings.forEach(w => console.log(`[Validador] ⚠ ${w}`));
  }

  return {
    valid: validPercentage >= 50,
    warnings: warnings.slice(0, 20),
    stats: {
      services: Array.from(serviceStats.entries()).map(([name, s]) => ({
        name,
        total: s.total,
        withData: s.withData,
        multiZone: s.multiZone
      })),
      zones: Array.from(zoneStats.entries()).map(([zone, count]) => ({ zone, count }))
    }
  };
}

Deno.serve(async (req: Request) => {
  console.log(`[PDF Parser] Nueva petición: ${req.method} desde ${req.headers.get('origin') || 'sin origin'}`);

  if (req.method === "OPTIONS") {
    console.log('[PDF Parser] Respondiendo a preflight OPTIONS request');
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const formData = await req.formData();
    const pdfFile = formData.get("pdf") as File;

    if (!pdfFile) {
      return new Response(
        JSON.stringify({
          error: "No se proporcionó archivo PDF",
          details: "Selecciona un archivo PDF de tarifas GLS",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pdfFile.type || pdfFile.type !== 'application/pdf') {
      return new Response(
        JSON.stringify({
          error: "El archivo debe ser un PDF",
          details: `Tipo recibido: ${pdfFile.type || 'desconocido'}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (pdfFile.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          error: "Archivo demasiado grande",
          details: `Máximo: 10MB. Recibido: ${(pdfFile.size / 1024 / 1024).toFixed(2)}MB`
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[PDF Parser] Procesando: ${pdfFile.name} (${pdfFile.size} bytes)`);

    const arrayBuffer = await pdfFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const pages = await extractStructuredTextFromPDF(uint8Array);
    console.log(`[PDF Parser] ${pages.length} páginas extraídas con coordenadas`);

    const version = detectPDFVersion(pages);
    console.log(`[PDF Parser] Versión detectada: ${version}`);

    const allExtractedData: any[] = [];
    const servicesDetected: string[] = [];

    for (const pageData of pages) {
      const template = detectService(pageData);

      if (template) {
        console.log(`[PDF Parser] ✓ Procesando ${template.serviceName} en página ${pageData.pageNum}`);
        servicesDetected.push(template.serviceName);

        const extractedRows = extractTableDataWithTextZones(pageData, template);
        allExtractedData.push(...extractedRows);
      }
    }

    if (allExtractedData.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No se detectaron servicios de tarifas en el PDF",
          details: `Se procesaron ${pages.length} páginas pero no se encontraron servicios reconocidos`,
          suggestions: [
            "Verifica que el PDF sea de GLS España 2025",
            "Los servicios esperados son: Express 08:30, Express 14:00, Express 19:00, Business Parcel, etc."
          ],
          debugInfo: {
            totalPages: pages.length,
            pdfVersion: version
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[PDF Parser] Total datos extraídos: ${allExtractedData.length} filas`);
    console.log(`[PDF Parser] Servicios detectados: ${servicesDetected.join(', ')}`);

    const validation = validateExtractedData(allExtractedData);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          error: "Los datos extraídos no pasaron la validación",
          details: "Menos del 50% de las filas contienen datos válidos",
          warnings: validation.warnings,
          extracted: allExtractedData.length,
          stats: validation.stats
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Configuración de Supabase no disponible" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[PDF Parser] Limpiando tabla tariffspdf...');
    const { error: deleteError } = await supabase
      .from("tariffspdf")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteError) {
      console.warn(`[PDF Parser] Advertencia al limpiar: ${deleteError.message}`);
    }

    console.log(`[PDF Parser] Insertando ${allExtractedData.length} tarifas...`);
    const { data: insertedData, error: insertError } = await supabase
      .from("tariffspdf")
      .insert(allExtractedData)
      .select();

    if (insertError) {
      console.error(`[PDF Parser] Error al insertar: ${insertError.message}`);
      return new Response(
        JSON.stringify({
          error: "Error al insertar tarifas en la base de datos",
          details: insertError.message,
          parsedCount: allExtractedData.length
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[PDF Parser] ✓ Inserción completada: ${insertedData?.length || 0} registros`);

    const { count: verificationCount } = await supabase
      .from("tariffspdf")
      .select('*', { count: 'exact', head: true });

    console.log(`[PDF Parser] ✓ Verificación: ${verificationCount || 0} registros en tabla`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Se importaron ${insertedData?.length || 0} tarifas correctamente usando detección por texto`,
        imported: insertedData?.length || 0,
        verified: verificationCount || 0,
        pages: pages.length,
        pdfVersion: version,
        servicesDetected,
        method: "Extracción basada en patrones de texto",
        validation: {
          valid: validation.valid,
          warningCount: validation.warnings.length,
          warnings: validation.warnings.slice(0, 5),
          stats: validation.stats
        },
        preview: allExtractedData.slice(0, 5)
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[PDF Parser] Error fatal: ${error.message}`);
    console.error(`[PDF Parser] Stack:`, error.stack);
    return new Response(
      JSON.stringify({
        error: "Error interno del servidor",
        details: error.message,
        type: error.name
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});