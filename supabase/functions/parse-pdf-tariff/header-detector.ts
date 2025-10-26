export interface ColumnHeader {
  name: string;
  dbField: string;
  position?: number;
}

export interface WeightRange {
  from: string;
  to: string;
  displayText: string;
}

export interface TableHeader {
  serviceName: string | null;
  serviceDbName: string | null;
  destinationZone: string | null;
  destinationDbPrefix: string | null;
  columns: ColumnHeader[];
  weightRanges: WeightRange[];
  hasCosteTotal: boolean;
  tableType: 'standard' | 'parcelshop' | 'insular' | 'maritime' | 'unknown';
  pageNumber: number;
  confidence: 'high' | 'medium' | 'low';
  rawHeaderText: string;
}

interface ServicePattern {
  dbName: string;
  patterns: RegExp[];
  keywords: string[];
}

interface DestinationPattern {
  dbPrefix: string;
  displayName: string;
  patterns: RegExp[];
  keywords: string[];
}

export class PDFTableHeaderDetector {
  private static readonly SERVICE_PATTERNS: ServicePattern[] = [
    {
      dbName: 'Urg8:30H Courier',
      patterns: [
        /express\s*0?8:?30/i,
        /express\s*8:?30/i,
        /8:?30\s*courier/i,
        /express0?8/i,
      ],
      keywords: ['express', '08:30', '8:30', 'express8', 'express08', '830']
    },
    {
      dbName: 'Urg10H Courier',
      patterns: [
        /express\s*10:?30/i,
        /express\s*10/i,
        /10:?30\s*courier/i,
        /express10(?!:)/i,
      ],
      keywords: ['express', '10:30', '10', 'express10', '1030']
    },
    {
      dbName: 'Urg14H Courier',
      patterns: [
        /express\s*14:?00/i,
        /express\s*14/i,
        /14:?00\s*courier/i,
        /express14(?!:)/i,
      ],
      keywords: ['express', '14:00', '14', 'express14', '1400']
    },
    {
      dbName: 'Urg19H Courier',
      patterns: [
        /express\s*19:?00/i,
        /express\s*19/i,
        /19:?00\s*courier/i,
        /express19(?!:)/i,
      ],
      keywords: ['express', '19:00', '19', 'express19', '1900']
    },
    {
      dbName: 'Business Parcel',
      patterns: [
        /business\s*parcel/i,
        /businessparcel/i,
      ],
      keywords: ['business', 'parcel', 'businessparcel']
    },
    {
      dbName: 'EuroBusiness Parcel',
      patterns: [
        /euro\s*business/i,
        /eurobusiness/i,
      ],
      keywords: ['euro', 'business', 'eurobusiness']
    },
    {
      dbName: 'Economy Parcel',
      patterns: [
        /economy\s*parcel/i,
        /economyparcel/i,
      ],
      keywords: ['economy', 'parcel', 'economyparcel']
    },
    {
      dbName: 'Marítimo',
      patterns: [
        /mar[ií]timo/i,
        /maritimo/i,
      ],
      keywords: ['maritimo', 'marítimo', 'mar']
    },
    {
      dbName: 'Parcel Shop',
      patterns: [
        /parcel\s*shop/i,
        /parcelshop/i,
      ],
      keywords: ['parcel', 'shop', 'parcelshop']
    },
  ];

  private static readonly DESTINATION_PATTERNS: DestinationPattern[] = [
    {
      dbPrefix: 'provincial',
      displayName: 'Provincial',
      patterns: [/provincial/i],
      keywords: ['provincial']
    },
    {
      dbPrefix: 'regional',
      displayName: 'Regional',
      patterns: [/regional/i],
      keywords: ['regional']
    },
    {
      dbPrefix: 'nacional',
      displayName: 'Nacional',
      patterns: [/nacional/i],
      keywords: ['nacional']
    },
    {
      dbPrefix: 'portugal',
      displayName: 'Portugal',
      patterns: [/portugal/i],
      keywords: ['portugal']
    },
    {
      dbPrefix: 'baleares_mayores',
      displayName: 'Baleares (Mallorca/Menorca)',
      patterns: [/baleares.*mayores/i, /mallorca.*menorca/i],
      keywords: ['baleares', 'mayores', 'mallorca', 'menorca']
    },
    {
      dbPrefix: 'baleares_menores',
      displayName: 'Baleares (Ibiza/Formentera)',
      patterns: [/baleares.*menores/i, /ibiza.*formentera/i],
      keywords: ['baleares', 'menores', 'ibiza', 'formentera']
    },
    {
      dbPrefix: 'canarias_mayores',
      displayName: 'Canarias (Tenerife/Gran Canaria)',
      patterns: [/canarias.*mayores/i, /tenerife.*gran\s*canaria/i],
      keywords: ['canarias', 'mayores', 'tenerife', 'gran canaria']
    },
    {
      dbPrefix: 'canarias_menores',
      displayName: 'Canarias (Lanzarote/Fuerteventura)',
      patterns: [/canarias.*menores/i, /lanzarote.*fuerteventura/i],
      keywords: ['canarias', 'menores', 'lanzarote', 'fuerteventura']
    },
    {
      dbPrefix: 'ceuta',
      displayName: 'Ceuta',
      patterns: [/ceuta/i],
      keywords: ['ceuta']
    },
    {
      dbPrefix: 'melilla',
      displayName: 'Melilla',
      patterns: [/melilla/i],
      keywords: ['melilla']
    },
    {
      dbPrefix: 'andorra',
      displayName: 'Andorra',
      patterns: [/andorra/i],
      keywords: ['andorra']
    },
    {
      dbPrefix: 'gibraltar',
      displayName: 'Gibraltar',
      patterns: [/gibraltar/i],
      keywords: ['gibraltar']
    },
    {
      dbPrefix: 'azores_mayores',
      displayName: 'Azores (Mayores)',
      patterns: [/azores.*mayores/i],
      keywords: ['azores', 'mayores']
    },
    {
      dbPrefix: 'azores_menores',
      displayName: 'Azores (Menores)',
      patterns: [/azores.*menores/i],
      keywords: ['azores', 'menores']
    },
    {
      dbPrefix: 'madeira_mayores',
      displayName: 'Madeira (Mayores)',
      patterns: [/madeira.*mayores/i],
      keywords: ['madeira', 'mayores']
    },
    {
      dbPrefix: 'madeira_menores',
      displayName: 'Madeira (Menores)',
      patterns: [/madeira.*menores/i],
      keywords: ['madeira', 'menores']
    },
  ];

  private static readonly COLUMN_PATTERNS = {
    salidas: {
      patterns: [/salidas/i, /^sal$/i, /\bsal\b/i],
      dbSuffix: '_sal',
      keywords: ['salidas', 'sal']
    },
    recogidas: {
      patterns: [/recogidas/i, /^rec$/i, /\brec\b/i],
      dbSuffix: '_rec',
      keywords: ['recogidas', 'rec']
    },
    interciudad: {
      patterns: [/interciudad/i, /^int$/i, /\bint\b/i],
      dbSuffix: '_int',
      keywords: ['interciudad', 'int']
    },
    arrastre: {
      patterns: [/arrastre/i, /^arr$/i, /\barr\b/i],
      dbSuffix: '_arr',
      keywords: ['arrastre', 'arr']
    },
    kilometros: {
      patterns: [/km/i, /kil[oó]metros?/i],
      dbSuffix: '_km',
      keywords: ['km', 'kilometros']
    },
  };

  private static readonly WEIGHT_PATTERNS = [
    {
      from: '0',
      to: '1',
      patterns: [
        /^1\s*[Kk]g\.?/i,
        /hasta\s*1/i,
        /0\s*[-–]\s*1/i,
        /\b1\s*[Kk]g\.?\b/i,
        /^1$/,
      ],
      keywords: ['1', '1kg', '1 kg', 'hasta 1']
    },
    {
      from: '1',
      to: '3',
      patterns: [
        /^3\s*[Kk]g\.?/i,
        /1\s*[-–]\s*3/i,
        /de\s*1\s*a\s*3/i,
        /\b3\s*[Kk]g\.?\b/i,
        /^3$/,
      ],
      keywords: ['3', '3kg', '3 kg', '1-3']
    },
    {
      from: '3',
      to: '5',
      patterns: [
        /^5\s*[Kk]g\.?/i,
        /3\s*[-–]\s*5/i,
        /de\s*3\s*a\s*5/i,
        /\b5\s*[Kk]g\.?\b/i,
        /^5$/,
      ],
      keywords: ['5', '5kg', '5 kg', '3-5']
    },
    {
      from: '5',
      to: '10',
      patterns: [
        /^10\s*[Kk]g\.?/i,
        /5\s*[-–]\s*10/i,
        /de\s*5\s*a\s*10/i,
        /\b10\s*[Kk]g\.?\b/i,
        /^10$/,
      ],
      keywords: ['10', '10kg', '10 kg', '5-10']
    },
    {
      from: '10',
      to: '15',
      patterns: [
        /^15\s*[Kk]g\.?/i,
        /10\s*[-–]\s*15/i,
        /de\s*10\s*a\s*15/i,
        /\b15\s*[Kk]g\.?\b/i,
        /^15$/,
      ],
      keywords: ['15', '15kg', '15 kg', '10-15']
    },
    {
      from: '15',
      to: '999',
      patterns: [
        /\+\s*[Kk]g/i,
        /[Kk]g\.?$/i,
        /15\s*\+/i,
        />\s*15/i,
        /m[aá]s\s*de\s*15/i,
        /por\s*kg/i,
        /adicional/i,
      ],
      keywords: ['+kg', '15+', 'más de 15', 'por kg', '+Kg']
    },
  ];

  static detectServiceName(text: string): { dbName: string; confidence: number } | null {
    const normalized = text.toLowerCase().trim();

    for (const servicePattern of this.SERVICE_PATTERNS) {
      for (const pattern of servicePattern.patterns) {
        if (pattern.test(normalized)) {
          return { dbName: servicePattern.dbName, confidence: 0.9 };
        }
      }

      let keywordMatches = 0;
      for (const keyword of servicePattern.keywords) {
        if (normalized.includes(keyword.toLowerCase())) {
          keywordMatches++;
        }
      }

      if (keywordMatches >= 2) {
        return { dbName: servicePattern.dbName, confidence: 0.7 };
      }
    }

    return null;
  }

  static detectDestinationZone(text: string): { dbPrefix: string; displayName: string; confidence: number } | null {
    const normalized = text.toLowerCase().trim();

    for (const destPattern of this.DESTINATION_PATTERNS) {
      for (const pattern of destPattern.patterns) {
        if (pattern.test(normalized)) {
          return {
            dbPrefix: destPattern.dbPrefix,
            displayName: destPattern.displayName,
            confidence: 0.9
          };
        }
      }

      let keywordMatches = 0;
      for (const keyword of destPattern.keywords) {
        if (normalized.includes(keyword.toLowerCase())) {
          keywordMatches++;
        }
      }

      if (keywordMatches >= 2) {
        return {
          dbPrefix: destPattern.dbPrefix,
          displayName: destPattern.displayName,
          confidence: 0.6
        };
      }
    }

    return null;
  }

  static detectColumns(headerLine: string): ColumnHeader[] {
    const columns: ColumnHeader[] = [];
    const normalized = headerLine.toLowerCase();

    let position = 0;
    for (const [columnName, config] of Object.entries(this.COLUMN_PATTERNS)) {
      for (const pattern of config.patterns) {
        if (pattern.test(normalized)) {
          columns.push({
            name: columnName,
            dbField: config.dbSuffix,
            position: position++
          });
          break;
        }
      }
    }

    return columns;
  }

  static detectWeightRange(text: string): WeightRange | null {
    const normalized = text.toLowerCase().trim();

    for (const weightPattern of this.WEIGHT_PATTERNS) {
      for (const pattern of weightPattern.patterns) {
        if (pattern.test(normalized)) {
          return {
            from: weightPattern.from,
            to: weightPattern.to,
            displayText: `${weightPattern.from}-${weightPattern.to}kg`
          };
        }
      }
    }

    return null;
  }

  static detectTableType(headerText: string): 'standard' | 'parcelshop' | 'insular' | 'maritime' | 'unknown' {
    const normalized = headerText.toLowerCase();

    if (/parcel\s*shop/i.test(normalized)) {
      return 'parcelshop';
    }

    if (/mar[ií]timo/i.test(normalized)) {
      return 'maritime';
    }

    if (/(canarias|baleares|ceuta|melilla|azores|madeira)/i.test(normalized)) {
      return 'insular';
    }

    if (/(provincial|regional|nacional)/i.test(normalized)) {
      return 'standard';
    }

    return 'unknown';
  }

  static analyzeTableHeaders(pageText: string, pageNumber: number): TableHeader[] {
    const headers: TableHeader[] = [];
    const lines = pageText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let currentService: { dbName: string; confidence: number } | null = null;
    let currentDestination: { dbPrefix: string; displayName: string; confidence: number } | null = null;
    let currentColumns: ColumnHeader[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const serviceDetection = this.detectServiceName(line);
      if (serviceDetection) {
        currentService = serviceDetection;
        console.log(`[HeaderDetector] Página ${pageNumber}: Servicio detectado - ${serviceDetection.dbName} (confianza: ${serviceDetection.confidence})`);
      }

      const destinationDetection = this.detectDestinationZone(line);
      if (destinationDetection) {
        currentDestination = destinationDetection;
        console.log(`[HeaderDetector] Página ${pageNumber}: Zona detectada - ${destinationDetection.displayName} (confianza: ${destinationDetection.confidence})`);
      }

      const detectedColumns = this.detectColumns(line);
      if (detectedColumns.length > 0) {
        currentColumns = detectedColumns;
        console.log(`[HeaderDetector] Página ${pageNumber}: Columnas detectadas - ${detectedColumns.map(c => c.name).join(', ')}`);
      }

      if (currentService && currentColumns.length > 0) {
        const hasCosteTotal = /coste\s*total/i.test(line);
        const tableType = this.detectTableType(pageText);

        const overallConfidence = currentService.confidence >= 0.8 && currentColumns.length >= 3
          ? 'high'
          : currentService.confidence >= 0.6 && currentColumns.length >= 2
          ? 'medium'
          : 'low';

        headers.push({
          serviceName: currentService.dbName,
          serviceDbName: currentService.dbName,
          destinationZone: currentDestination?.displayName || null,
          destinationDbPrefix: currentDestination?.dbPrefix || null,
          columns: currentColumns,
          weightRanges: [],
          hasCosteTotal,
          tableType,
          pageNumber,
          confidence: overallConfidence as 'high' | 'medium' | 'low',
          rawHeaderText: line
        });

        console.log(`[HeaderDetector] Página ${pageNumber}: Encabezado completo registrado - ${currentService.dbName}`);
      }
    }

    return headers;
  }

  static validateTableStructure(header: TableHeader): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!header.serviceName) {
      issues.push('Falta el nombre del servicio');
    }

    if (header.columns.length === 0) {
      issues.push('No se detectaron columnas');
    }

    if (header.columns.length < 3 && header.tableType === 'standard') {
      issues.push(`Solo se detectaron ${header.columns.length} columnas (mínimo esperado: 3)`);
    }

    if (header.confidence === 'low') {
      issues.push('Confianza baja en la detección de encabezados');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}