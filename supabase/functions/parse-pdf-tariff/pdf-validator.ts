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
   * Mapa de marcadores de texto para cada página
   * Usado para identificación robusta sin depender de años o versiones
   */
  private static readonly PAGE_MARKERS: Record<number, string[]> = {
    1: ['Agencias GLS Spain'],
    2: ['Tarifas Peninsular, Insular, Andorra, Ceuta, Melilla & Portugal'],
    3: ['Peninsula, Andorra, Ceuta, Melilla & Portugal'],
    4: ['Express8:30'],
    5: ['Express14:00'],
    6: ['Express19:00'],
    7: ['BusinessParcel'],
    8: ['EconomyParcel'],
    9: ['BurofaxService'],
    10: ['Recogen en Centro de Destino'],
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
   * Patrones regex para detectar servicios con variaciones de formato
   * Acepta: Express08:30, Express8:30, Express 8:30, etc.
   */
  private static readonly SERVICE_PATTERNS = [
    /Express\s*0?8:30/i,
    /Express\s*0?10:30/i,
    /Express\s*0?14:00/i,
    /Express\s*0?19:00/i,
    /BusinessParcel/i,
    /EconomyParcel/i
  ];

  /**
   * Mapa de normalización para convertir variaciones de nombres de servicios
   * a nombres canónicos internos
   */
  private static readonly SERVICE_NAME_MAP: Record<string, string> = {
    'Express8:30': 'Express08:30',
    'Express08:30': 'Express08:30',
    'Express 8:30': 'Express08:30',
    'Express 08:30': 'Express08:30',
    'Express10:30': 'Express10:30',
    'Express 10:30': 'Express10:30',
    'Express14:00': 'Express14:00',
    'Express 14:00': 'Express14:00',
    'Express19:00': 'Express19:00',
    'Express 19:00': 'Express19:00',
    'BusinessParcel': 'BusinessParcel',
    'EconomyParcel': 'EconomyParcel'
  };

  /**
   * Normaliza un nombre de servicio a su forma canónica
   */
  static normalizeServiceName(serviceName: string): string {
    const trimmed = serviceName.trim();

    // Buscar coincidencia exacta en el mapa
    if (this.SERVICE_NAME_MAP[trimmed]) {
      return this.SERVICE_NAME_MAP[trimmed];
    }

    // Buscar usando patrones regex
    for (let i = 0; i < this.SERVICE_PATTERNS.length; i++) {
      if (this.SERVICE_PATTERNS[i].test(trimmed)) {
        return this.EXPECTED_MARKERS.services[i];
      }
    }

    return serviceName;
  }

  /**
   * Detecta si un texto contiene un servicio usando patrones flexibles
   */
  private static detectService(text: string, pattern: RegExp, serviceName: string): boolean {
    return pattern.test(text);
  }

  /**
   * Identifica páginas usando marcadores de texto específicos
   */
  static identifyPages(pages: PageData[]): Map<number, number> {
    const pageMap = new Map<number, number>();

    console.log('[PDF Validator] Identificando páginas por marcadores de texto...');

    for (const page of pages) {
      const pageText = page.items.map(item => item.str).join(' ');

      // Buscar qué marcador coincide con esta página
      for (const [logicalPage, markers] of Object.entries(this.PAGE_MARKERS)) {
        const pageNum = parseInt(logicalPage);

        // Verificar si alguno de los marcadores está presente
        const hasMarker = markers.some(marker => {
          // Búsqueda flexible: ignorar mayúsculas y espacios extra
          const normalizedText = pageText.replace(/\s+/g, ' ');
          const normalizedMarker = marker.replace(/\s+/g, ' ');
          return normalizedText.includes(normalizedMarker);
        });

        if (hasMarker) {
          pageMap.set(pageNum, page.pageNum);
          console.log(`[PDF Validator] ✓ Página lógica ${pageNum} identificada como página física ${page.pageNum} (marcador: "${markers[0]}")`);
          break;
        }
      }
    }

    console.log(`[PDF Validator] ✓ Identificadas ${pageMap.size} páginas de ${Object.keys(this.PAGE_MARKERS).length} esperadas`);
    return pageMap;
  }

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

    // 2. Identificar páginas usando marcadores de texto
    const pageMap = this.identifyPages(pages);

    // Verificar páginas críticas
    const criticalPages = [1, 2, 3, 4, 5, 6, 7, 8];
    const missingCritical = criticalPages.filter(p => !pageMap.has(p));

    if (missingCritical.length > 0) {
      errors.push(`No se encontraron las páginas críticas: ${missingCritical.join(', ')}`);
    }

    if (pageMap.size < 5) {
      errors.push(`Solo se identificaron ${pageMap.size} páginas mediante marcadores, se esperan al menos 5`);
    } else {
      console.log(`[PDF Validator] ✓ Páginas identificadas: ${pageMap.size}`);
    }

    // 3. Detectar servicios en el PDF usando patrones flexibles
    const allText = pages.map(p =>
      p.items.map(item => item.str).join(' ')
    ).join(' ');

    // Mostrar muestra del texto para debug
    const textSample = allText.substring(0, 500);
    console.log(`[PDF Validator] Muestra de texto extraído: ${textSample.substring(0, 200)}...`);

    for (let i = 0; i < this.SERVICE_PATTERNS.length; i++) {
      const pattern = this.SERVICE_PATTERNS[i];
      const serviceName = this.EXPECTED_MARKERS.services[i];

      if (pattern.test(allText)) {
        servicesDetected.push(serviceName);

        // Extraer el texto exacto encontrado
        const match = allText.match(pattern);
        const foundText = match ? match[0] : serviceName;
        console.log(`[PDF Validator] ✓ Servicio detectado: ${serviceName} (encontrado como: "${foundText}")`);
      } else {
        warnings.push(`Servicio "${serviceName}" no encontrado en el PDF`);
        console.log(`[PDF Validator] ⚠ Servicio no detectado: ${serviceName}`);
      }
    }

    if (servicesDetected.length === 0) {
      warnings.push('No se detectaron servicios conocidos mediante patrones regex');
      console.log('[PDF Validator] ⚠ No se detectaron servicios mediante patrones');
    } else {
      console.log(`[PDF Validator] ✓ Total servicios detectados: ${servicesDetected.length}/${this.SERVICE_PATTERNS.length}`);
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
        structureVersion: this.detectVersionByMarkers(pageMap),
        pagesIdentified: pageMap.size
      }
    };
  }

  /**
   * Detecta la versión del PDF de tarifas basándose en marcadores identificados
   */
  private static detectVersionByMarkers(pageMap: Map<number, number>): string {
    // Si tenemos las páginas esperadas, es formato GLS estándar
    if (pageMap.has(1) && pageMap.has(2) && pageMap.has(4)) {
      return 'GLS_STANDARD_FORMAT';
    }

    // Si solo hay algunas páginas
    if (pageMap.size > 0) {
      return 'GLS_PARTIAL_FORMAT';
    }

    return 'UNKNOWN';
  }

  /**
   * Detecta la versión del PDF de tarifas (método antiguo para compatibilidad)
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
