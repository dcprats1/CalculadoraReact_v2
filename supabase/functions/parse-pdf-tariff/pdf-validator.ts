/**
 * PDF Structure Validator - Simplified Version
 * Valida que el PDF tenga las 38 páginas esperadas mediante palabras clave exactas
 */

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

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    totalPages: number;
    pagesIdentified: number;
    servicesDetected: string[];
    structureVersion?: string;
  };
}

export class PDFValidator {
  /**
   * Mapa de palabras clave para cada página (1-38)
   * Cada página debe contener al menos una de las palabras clave especificadas
   */
  private static readonly PAGE_MARKERS: Record<number, string[]> = {
    1: ['Agencias GLS Spain', 'GLS Spain', 'Agencias GLS'],
    2: ['Tarifas Peninsular, Insular, Andorra, Ceuta, Melilla & Portugal', 'Tarifas Peninsular', 'TARIFA'],
    3: ['Peninsula, Andorra, Ceuta, Melilla & Portugal', 'Peninsula', 'Servicios Nacionales'],
    4: ['Express8:30', 'Express 8:30', 'Express8', '8:30'],
    5: ['Express14:00', 'Express 14:00', 'Express14', '14:00'],
    6: ['Express19:00', 'Express 19:00', 'Express19', '19:00'],
    7: ['BusinessParcel', 'Business Parcel', 'Business'],
    8: ['EconomyParcel', 'Economy Parcel', 'Economy'],
    9: ['BurofaxService', 'Burofax Service', 'Burofax'],
    10: ['Recogen en Centro de Destino', 'Centro de Destino', 'ParcelShop'],
    11: ['Insular'],
    12: ['(Aéreo)'],
    13: ['Express19:00'],
    14: ['BusinessParcel'],
    15: ['EconomyParcel'],
    16: ['(Carga marítima)', '(Carga Marítima)'],
    17: ['ShopReturnService'],
    18: ['(Glass)'],
    19: ['(Carga Marítima)', '(Carga marítima)'],
    20: ['IntercompanyService'],
    21: ['Unitoque 5 días'],
    22: ['Bitoque 5 días'],
    23: ['Bitoque 2 días'],
    24: ['Resto de Servicios'],
    25: ['Retorno Copia Sellada'],
    26: ['Medios Dedicados'],
    27: ['Extra Cargo Nacional (I)'],
    28: ['Extra Cargo Nacional (II)'],
    29: ['Extra Cargo Nacional (III)'],
    30: ['Servicios Internacionales de GLS'],
    31: ['EuroBusinessParcel'],
    32: ['EuroReturnService'],
    33: ['EuroBusinessParcel'],
    34: ['Priority'],
    35: ['Economy'],
    36: ['Priority Import'],
    37: ['Economy Import'],
    38: ['Suplementos']
  };

  static readonly EXPECTED_PAGES = 38;
  private static readonly MIN_REQUIRED_PAGES = 30;
  private static readonly CRITICAL_PAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  /**
   * Normaliza texto para comparación (elimina espacios extra, ignora mayúsculas, normaliza caracteres especiales)
   */
  private static normalizeText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/ñ/g, 'n');
  }

  /**
   * Identifica páginas usando palabras clave específicas
   */
  static identifyPages(pages: PageData[]): Map<number, number> {
    const pageMap = new Map<number, number>();

    console.log('[PDF Validator] Identificando páginas por palabras clave...');

    for (const page of pages) {
      const pageText = page.items.map(item => item.str).join(' ');
      const normalizedPageText = this.normalizeText(pageText);

      for (const [logicalPageStr, markers] of Object.entries(this.PAGE_MARKERS)) {
        const logicalPage = parseInt(logicalPageStr);

        if (pageMap.has(logicalPage)) {
          continue;
        }

        const hasMarker = markers.some(marker => {
          const normalizedMarker = this.normalizeText(marker);
          return normalizedPageText.includes(normalizedMarker);
        });

        if (hasMarker) {
          pageMap.set(logicalPage, page.pageNum);
          console.log(`[PDF Validator] ✓ Página lógica ${logicalPage} identificada como página física ${page.pageNum} (marcador: "${markers[0]}")`);
          break;
        }
      }
    }

    console.log(`[PDF Validator] ✓ Identificadas ${pageMap.size}/${this.EXPECTED_PAGES} páginas`);
    return pageMap;
  }

  /**
   * Valida la estructura completa del PDF
   */
  static validate(pages: PageData[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log('[PDF Validator] Iniciando validación simplificada...');
    console.log(`[PDF Validator] Total páginas en PDF: ${pages.length}`);

    const pageMap = this.identifyPages(pages);
    const pagesIdentified = pageMap.size;

    const missingPages: number[] = [];
    for (let i = 1; i <= this.EXPECTED_PAGES; i++) {
      if (!pageMap.has(i)) {
        missingPages.push(i);
      }
    }

    const missingCriticalPages = this.CRITICAL_PAGES.filter(p => !pageMap.has(p));

    if (missingCriticalPages.length > 0) {
      const missingDetails = missingCriticalPages.map(p =>
        `Página ${p} (buscando: "${this.PAGE_MARKERS[p][0]}")`
      ).join(', ');
      errors.push(`No se encontraron páginas críticas: ${missingDetails}`);
    }

    if (pagesIdentified < this.MIN_REQUIRED_PAGES) {
      errors.push(`Solo se identificaron ${pagesIdentified} de ${this.EXPECTED_PAGES} páginas esperadas (mínimo requerido: ${this.MIN_REQUIRED_PAGES})`);

      if (missingPages.length > 0 && missingPages.length <= 10) {
        const missingList = missingPages.slice(0, 10).map(p =>
          `${p} ("${this.PAGE_MARKERS[p][0]}")`
        ).join(', ');
        errors.push(`Páginas no encontradas: ${missingList}`);
      }
    } else if (pagesIdentified < this.EXPECTED_PAGES) {
      const missingList = missingPages.slice(0, 5).map(p =>
        `${p} ("${this.PAGE_MARKERS[p][0]}")`
      ).join(', ');
      warnings.push(`Faltan ${missingPages.length} páginas: ${missingList}${missingPages.length > 5 ? ', ...' : ''}`);
    }

    const isValid = errors.length === 0;

    console.log(`[PDF Validator] Validación completada: ${isValid ? 'VÁLIDO' : 'INVÁLIDO'}`);
    console.log(`[PDF Validator] Páginas identificadas: ${pagesIdentified}/${this.EXPECTED_PAGES}`);
    console.log(`[PDF Validator] Errores: ${errors.length}, Advertencias: ${warnings.length}`);

    if (!isValid) {
      console.error('[PDF Validator] ❌ Errores de validación:');
      errors.forEach(err => console.error(`[PDF Validator]   - ${err}`));
    }

    if (warnings.length > 0) {
      console.log('[PDF Validator] ⚠ Advertencias:');
      warnings.forEach(warn => console.log(`[PDF Validator]   - ${warn}`));
    }

    return {
      isValid,
      errors,
      warnings,
      metadata: {
        totalPages: pages.length,
        pagesIdentified,
        servicesDetected: [],
        structureVersion: this.detectVersionByPages(pageMap)
      }
    };
  }

  /**
   * Detecta la versión del PDF basándose en páginas identificadas
   */
  private static detectVersionByPages(pageMap: Map<number, number>): string {
    if (pageMap.size === this.EXPECTED_PAGES) {
      return 'GLS_STANDARD_38_PAGES';
    }

    if (pageMap.size >= this.MIN_REQUIRED_PAGES) {
      return 'GLS_PARTIAL_FORMAT';
    }

    return 'UNKNOWN';
  }

  /**
   * Extrae metadatos básicos del PDF
   */
  static extractMetadata(pages: PageData[]): {
    title?: string;
    year?: string;
    company?: string;
  } {
    if (pages.length === 0) {
      return {};
    }

    const firstPageText = pages[0].items.map(item => item.str).join(' ');

    const yearMatch = firstPageText.match(/202[3-9]/);
    const hasGLS = firstPageText.includes('GLS');
    const hasTarifa = firstPageText.includes('TARIFA') || firstPageText.includes('Tarifa');

    return {
      title: hasTarifa ? 'Tarifa GLS' : undefined,
      year: yearMatch ? yearMatch[0] : undefined,
      company: hasGLS ? 'GLS' : undefined
    };
  }

  /**
   * Diagnóstico detallado de una página (útil para debugging)
   */
  static diagnosticPage(page: PageData): void {
    console.log(`\n[PDF Validator] ========== DIAGNÓSTICO PÁGINA ${page.pageNum} ==========`);
    console.log(`[PDF Validator] Dimensiones: ${page.width} x ${page.height}`);
    console.log(`[PDF Validator] Total items: ${page.items.length}`);

    const pageText = page.items.map(item => item.str).join(' ');
    const textSample = pageText.substring(0, 200);
    console.log(`[PDF Validator] Muestra de texto: "${textSample}..."`);

    const matchedMarkers: string[] = [];
    for (const [logicalPageStr, markers] of Object.entries(this.PAGE_MARKERS)) {
      const found = markers.some(marker =>
        this.normalizeText(pageText).includes(this.normalizeText(marker))
      );
      if (found) {
        matchedMarkers.push(`Página ${logicalPageStr}: "${markers[0]}"`);
      }
    }

    if (matchedMarkers.length > 0) {
      console.log(`[PDF Validator] Marcadores encontrados: ${matchedMarkers.join(', ')}`);
    } else {
      console.log(`[PDF Validator] No se encontraron marcadores conocidos`);
    }

    console.log(`[PDF Validator] ========================================\n`);
  }
}
