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
  { from: "0", to: "1", patterns: [/^1\s*kg/i, /^1$/] },
  { from: "1", to: "3", patterns: [/^3\s*kg/i, /^3$/] },
  { from: "3", to: "5", patterns: [/^5\s*kg/i, /^5$/] },
  { from: "5", to: "10", patterns: [/^10\s*kg/i, /^10$/] },
  { from: "10", to: "15", patterns: [/^15\s*kg/i, /^15$/] },
  { from: "15", to: "999", patterns: [/\+?\s*kg/i, /adicional/i, /^\+kg/i] },
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

function calibrateCoordinates(pageData: PageData, template: ServiceTableDefinition): ServiceTableDefinition {
  console.log('[Calibrador] Calibrando coordenadas basándose en el texto real...');

  const calibratedTemplate = JSON.parse(JSON.stringify(template));

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

        currentZone = {
          zoneName: zoneConfig.name,
          dbPrefix: zoneConfig.dbPrefix,
          startRowIndex: i + 1,
          endRowIndex: sortedRows.length - 1,
          rowTexts: []
        };

        console.log(`[Clasificador Zonas] ✓ Nueva zona detectada: ${zoneConfig.name} en fila ${i} (Y=${y}): "${rowText}"`);
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
    console.log(`[Clasificador Zonas]   ${idx + 1}. ${zone.zoneName}: ${zone.rowTexts.length} filas de datos`);
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
  const results: any[] = [];

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

  for (const zone of detectedZones) {
    console.log(`[Extractor Texto] Procesando zona: ${zone.zoneName}`);

    const zoneDataRows = sortedRows.slice(zone.startRowIndex, zone.endRowIndex + 1);
    const dataRowsCount = Math.min(6, zoneDataRows.length);

    for (let i = 0; i < dataRowsCount; i++) {
      const weightRange = WEIGHT_RANGES[i];
      const [rowY, rowItems] = zoneDataRows[i] || [0, []];

      const rowData: Record<string, any> = {
        service_name: template.dbName,
        weight_from: weightRange.from,
        weight_to: weightRange.to,
      };

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
          console.log(`[Extractor Texto]     ${zone.zoneName} ${weightRange.from}-${weightRange.to}kg ${col.name} → ${fieldName} = ${cellValue}`);
        }
      }

      results.push(rowData);
    }
  }

  console.log(`[Extractor Texto] ✓ ${results.length} filas extraídas de ${template.serviceName}`);
  return results;
}

function extractTableDataWithCoordinates(pageData: PageData, template: ServiceTableDefinition): any[] {
  console.log(`[Extractor Coordenadas] ===== EXTRAYENDO ${template.serviceName} =====`);

  const calibrated = calibrateCoordinates(pageData, template);

  const results: any[] = [];

  for (const zone of calibrated.zones) {
    console.log(`[Extractor Coordenadas] Procesando zona: ${zone.name} (Y: ${zone.yRange[0]}-${zone.yRange[1]})`);

    const yMin = zone.yRange[0];
    const yMax = zone.yRange[1];
    const rowHeight = (yMax - yMin) / 6;

    for (let i = 0; i < 6; i++) {
      const weightRange = WEIGHT_RANGES[i];
      const rowYMin = yMax - ((i + 1) * rowHeight);
      const rowYMax = yMax - (i * rowHeight);

      console.log(`[Extractor Coordenadas]   Fila ${i + 1}/6: ${weightRange.from}-${weightRange.to}kg (Y: ${rowYMin.toFixed(0)}-${rowYMax.toFixed(0)})`);

      const rowData: Record<string, number | null> = {
        service_name: template.dbName,
        weight_from: weightRange.from,
        weight_to: weightRange.to,
      };

      for (const col of calibrated.columns) {
        const fieldName = `${zone.dbPrefix}${col.dbSuffix}`;

        if (!VALID_DB_FIELDS.has(fieldName)) {
          continue;
        }

        const cellTexts = findTextInCoordinates(
          pageData.items,
          col.xRange,
          [rowYMin, rowYMax]
        );

        let cellValue: number | null = null;
        for (const text of cellTexts) {
          const parsed = parseNumber(text);
          if (parsed !== null) {
            cellValue = parsed;
            break;
          }
        }

        rowData[fieldName] = cellValue;

        if (cellValue !== null) {
          console.log(`[Extractor Coordenadas]     ${col.name} → ${fieldName} = ${cellValue}`);
        }
      }

      results.push(rowData);
    }
  }

  console.log(`[Extractor Coordenadas] ✓ ${results.length} filas extraídas de ${template.serviceName}`);
  return results;
}

function validateExtractedData(data: any[]): {valid: boolean, warnings: string[], stats: any} {
  console.log('[Validador] ===== VALIDANDO DATOS EXTRAÍDOS =====');

  const warnings: string[] = [];
  let validCount = 0;
  const serviceStats = new Map<string, { total: number, withData: number }>();
  const zoneStats = new Map<string, number>();

  for (const row of data) {
    const serviceName = row.service_name;
    if (!serviceStats.has(serviceName)) {
      serviceStats.set(serviceName, { total: 0, withData: 0 });
    }
    const stats = serviceStats.get(serviceName)!;
    stats.total++;

    let hasAnyValue = false;
    let suspiciousCount = 0;
    let fieldCount = 0;

    for (const [key, value] of Object.entries(row)) {
      if (key === 'service_name' || key === 'weight_from' || key === 'weight_to') continue;

      fieldCount++;

      if (value !== null && typeof value === 'number') {
        hasAnyValue = true;

        const zonePrefix = key.split('_')[0];
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
  }

  const validPercentage = (validCount / data.length) * 100;
  console.log(`[Validador] Filas válidas: ${validCount}/${data.length} (${validPercentage.toFixed(1)}%)`);
  console.log(`[Validador] Warnings: ${warnings.length}`);

  console.log(`[Validador] Estadísticas por servicio:`);
  for (const [service, stats] of serviceStats.entries()) {
    console.log(`[Validador]   ${service}: ${stats.withData}/${stats.total} filas con datos`);
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
        withData: s.withData
      })),
      zones: Array.from(zoneStats.entries()).map(([zone, count]) => ({ zone, count }))
    }
  };
}

Deno.serve(async (req: Request) => {
  console.log(`[PDF Parser] Nueva petición: ${req.method}`);

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
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
