/**
 * PDF Structure Validator
 * Valida que el PDF tenga la estructura esperada antes de extraer datos
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
    servicesDetected: string[];
    structureVersion?: string;
  };
}

export class PDFValidator {
  private static readonly EXPECTED_MIN_PAGES = 4;
  private static readonly EXPECTED_MAX_PAGES = 50;

  /**
   * Marcadores esperados en el PDF de tarifas GLS
   */
  private static readonly EXPECTED_MARKERS = {
    services: [
      'Express08:30',
      'Express10:30',
      'Express14:00',
      'Express19:00',
      'BusinessParcel',
      'EconomyParcel'
    ],
    zones: [
      'Provincial',
      'Regional',
      'Nacional'
    ],
    columns: [
      'Peso',
      'Recogida',
      'Arrastre',
      'Entrega',
      'Salidas',
      'Interciudad'
    ],
    weights: [
      '0 - 1',
      '1 - 3',
      '3 - 5',
      '5 - 10',
      '10 - 15',
      '15 - 999'
    ]
  };

  /**
   * Valida la estructura completa del PDF
   */
  static validate(pages: PageData[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const servicesDetected: string[] = [];

    console.log('[PDF Validator] Iniciando validación...');

    // 1. Validar número de páginas
    if (pages.length < this.EXPECTED_MIN_PAGES) {
      errors.push(`El PDF tiene ${pages.length} páginas, se esperan al menos ${this.EXPECTED_MIN_PAGES}`);
    }

    if (pages.length > this.EXPECTED_MAX_PAGES) {
      warnings.push(`El PDF tiene ${pages.length} páginas, es inusualmente grande (máximo esperado: ${this.EXPECTED_MAX_PAGES})`);
    }

    console.log(`[PDF Validator] ✓ Número de páginas: ${pages.length}`);

    // 2. Detectar servicios en el PDF
    const allText = pages.map(p =>
      p.items.map(item => item.str).join(' ')
    ).join(' ');

    for (const service of this.EXPECTED_MARKERS.services) {
      if (allText.includes(service)) {
        servicesDetected.push(service);
        console.log(`[PDF Validator] ✓ Servicio detectado: ${service}`);
      } else {
        warnings.push(`Servicio "${service}" no encontrado en el PDF`);
      }
    }

    if (servicesDetected.length === 0) {
      errors.push('No se detectaron servicios conocidos en el PDF');
    }

    // 3. Validar estructura de tabla en primeras páginas
    const samplePages = pages.slice(0, Math.min(10, pages.length));
    let tablesFound = 0;

    for (const page of samplePages) {
      const pageText = page.items.map(item => item.str).join(' ');

      // Buscar indicadores de tabla
      const hasWeightColumn = this.EXPECTED_MARKERS.weights.some(w => pageText.includes(w));
      const hasZoneColumn = this.EXPECTED_MARKERS.zones.some(z => pageText.includes(z));
      const hasPriceColumns = this.EXPECTED_MARKERS.columns.slice(1).some(c => pageText.includes(c));

      if (hasWeightColumn || hasZoneColumn || hasPriceColumns) {
        tablesFound++;
        console.log(`[PDF Validator] ✓ Estructura de tabla detectada en página ${page.pageNum}`);
      }
    }

    if (tablesFound === 0) {
      errors.push('No se detectaron tablas de tarifas en las primeras páginas del PDF');
    }

    // 4. Validar que hay datos numéricos (precios)
    const hasNumericData = pages.some(page =>
      page.items.some(item => {
        const str = item.str.replace(',', '.');
        return /^\d+[\.,]\d{2}$/.test(str) || /^\d+$/.test(str);
      })
    );

    if (!hasNumericData) {
      errors.push('No se detectaron datos numéricos (precios) en el PDF');
    } else {
      console.log('[PDF Validator] ✓ Datos numéricos detectados');
    }

    // 5. Validar coordenadas y transformaciones
    const invalidPages = pages.filter(p =>
      p.items.some(item =>
        !item.transform ||
        item.transform.length !== 6 ||
        item.transform.every(v => v === 0)
      )
    );

    if (invalidPages.length > 0) {
      warnings.push(`${invalidPages.length} páginas tienen items con transformaciones inválidas`);
    }

    // Resultado final
    const isValid = errors.length === 0;

    console.log(`[PDF Validator] Validación completada: ${isValid ? 'VÁLIDO' : 'INVÁLIDO'}`);
    console.log(`[PDF Validator] Errores: ${errors.length}, Advertencias: ${warnings.length}`);

    return {
      isValid,
      errors,
      warnings,
      metadata: {
        totalPages: pages.length,
        servicesDetected,
        structureVersion: this.detectVersion(allText)
      }
    };
  }

  /**
   * Detecta la versión del PDF de tarifas
   */
  private static detectVersion(text: string): string {
    // Buscar año en el texto
    const yearMatch = text.match(/202[3-9]/);
    if (yearMatch) {
      return `GLS_TARIFA_${yearMatch[0]}`;
    }

    // Buscar "TARIFA" en el texto
    if (text.includes('TARIFA')) {
      return 'GLS_TARIFA_UNKNOWN_YEAR';
    }

    return 'UNKNOWN';
  }

  /**
   * Valida que una página específica contiene datos de un servicio
   */
  static validateServicePage(page: PageData, expectedService: string): boolean {
    const pageText = page.items.map(item => item.str).join(' ');
    const hasService = pageText.includes(expectedService);

    if (!hasService) {
      console.log(`[PDF Validator] ⚠ Página ${page.pageNum} no contiene el servicio "${expectedService}"`);
      return false;
    }

    return true;
  }

  /**
   * Extrae metadatos básicos del PDF
   */
  static extractMetadata(pages: PageData[]): {
    title?: string;
    year?: string;
    company?: string;
  } {
    const firstPageText = pages[0]?.items.map(item => item.str).join(' ') || '';

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
   * Diagnóstico detallado de una página
   */
  static diagnosticPage(page: PageData): void {
    console.log(`\n[PDF Validator] ========== DIAGNÓSTICO PÁGINA ${page.pageNum} ==========`);
    console.log(`[PDF Validator] Dimensiones: ${page.width} x ${page.height}`);
    console.log(`[PDF Validator] Total items: ${page.items.length}`);

    // Analizar distribución de texto
    const textLengths = page.items.map(item => item.str.length);
    const avgLength = textLengths.reduce((a, b) => a + b, 0) / textLengths.length;
    console.log(`[PDF Validator] Longitud promedio de texto: ${avgLength.toFixed(2)}`);

    // Items únicos
    const uniqueStrings = new Set(page.items.map(item => item.str));
    console.log(`[PDF Validator] Textos únicos: ${uniqueStrings.size}`);

    // Detectar números
    const numericItems = page.items.filter(item => {
      const str = item.str.replace(',', '.');
      return /^\d+[\.,]\d{2}$/.test(str) || /^\d+$/.test(str);
    });
    console.log(`[PDF Validator] Items numéricos: ${numericItems.length}`);

    // Detectar servicios
    const servicesInPage = this.EXPECTED_MARKERS.services.filter(service =>
      page.items.some(item => item.str.includes(service))
    );
    if (servicesInPage.length > 0) {
      console.log(`[PDF Validator] Servicios detectados: ${servicesInPage.join(', ')}`);
    }

    // Detectar zonas
    const zonesInPage = this.EXPECTED_MARKERS.zones.filter(zone =>
      page.items.some(item => item.str.includes(zone))
    );
    if (zonesInPage.length > 0) {
      console.log(`[PDF Validator] Zonas detectadas: ${zonesInPage.join(', ')}`);
    }

    console.log(`[PDF Validator] ========================================\n`);
  }
}
