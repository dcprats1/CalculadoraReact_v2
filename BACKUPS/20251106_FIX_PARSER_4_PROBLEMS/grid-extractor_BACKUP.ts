import { VirtualTableBuilder } from './grid-parser.ts';

interface VirtualTable {
  rows: GridCell[][];
  rowCount: number;
  colCount: number;
  pageNum: number;
}

interface GridCell {
  text: string;
  x: number;
  y: number;
  rowIndex: number;
  colIndex: number;
}

interface ServiceConfig {
  serviceName: string;
  dbName: string;
  detectionPatterns: RegExp[];
}

interface ZoneConfig {
  zoneName: string;
  dbPrefix: string;
  detectionPatterns: RegExp[];
}

const SERVICES: ServiceConfig[] = [
  {
    serviceName: "Express 08:30",
    dbName: "Urg8:30H Courier",
    detectionPatterns: [/express.*0?8:?30/i, /urg.*0?8:?30/i]
  },
  {
    serviceName: "Express 14:00",
    dbName: "Urg14H Courier",
    detectionPatterns: [/express.*14:?00/i, /urg.*14/i]
  },
  {
    serviceName: "Express 19:00",
    dbName: "Urg19H Courier",
    detectionPatterns: [/express.*19:?00/i, /urg.*19/i]
  },
  {
    serviceName: "Business Parcel",
    dbName: "Business Parcel",
    detectionPatterns: [/business.*parcel/i]
  },
  {
    serviceName: "Eurobusiness Parcel",
    dbName: "Eurobusiness Parcel",
    detectionPatterns: [/euro.*business/i]
  },
  {
    serviceName: "Economy Parcel",
    dbName: "Economy Parcel",
    detectionPatterns: [/economy.*parcel/i]
  },
  {
    serviceName: "Parcel Shop",
    dbName: "Parcel Shop",
    detectionPatterns: [/shop.*return/i, /parcel.*shop/i]
  }
];

const ZONES: ZoneConfig[] = [
  {
    zoneName: "Provincial",
    dbPrefix: "provincial",
    detectionPatterns: [/^provincial$/i, /provincial/i]
  },
  {
    zoneName: "Regional",
    dbPrefix: "regional",
    detectionPatterns: [/^regional$/i, /regional/i]
  },
  {
    zoneName: "Nacional",
    dbPrefix: "nacional",
    detectionPatterns: [/^nacional$/i, /nacional/i]
  }
];

const WEIGHT_RANGES = [
  { from: "0", to: "1", patterns: [/1\s*kg/i, /^1$/] },
  { from: "1", to: "3", patterns: [/3\s*kg/i, /^3$/] },
  { from: "3", to: "5", patterns: [/5\s*kg/i, /^5$/] },
  { from: "5", to: "10", patterns: [/10\s*kg/i, /^10$/] },
  { from: "10", to: "15", patterns: [/15\s*kg/i, /^15$/] },
  { from: "15", to: "999", patterns: [/\+\s*kg/i, /^\+$/i, /adicional/i] }
];

const COLUMN_HEADERS = [
  { name: "Recogidas", dbSuffix: "_rec", patterns: [/recogidas/i] },
  { name: "Arrastre", dbSuffix: "_arr", patterns: [/arrastre/i] },
  { name: "Salidas", dbSuffix: "_sal", patterns: [/salidas/i] },
  { name: "Interciudad", dbSuffix: "_int", patterns: [/interciudad/i] }
];

export class GridExtractor {
  static extractFromTable(table: VirtualTable): any[] {
    console.log(`\n[Grid Extractor] ===== EXTRAYENDO DATOS DE TABLA VIRTUAL =====`);
    console.log(`[Grid Extractor] Tabla: ${table.rowCount} filas × ${table.colCount} columnas`);

    const service = this.detectService(table);
    if (!service) {
      console.log(`[Grid Extractor] ⚠ No se detectó servicio en esta tabla`);
      return [];
    }

    console.log(`[Grid Extractor] ✓ Servicio detectado: ${service.serviceName}`);

    const columnMap = this.detectColumns(table);
    console.log(`[Grid Extractor] ✓ Columnas detectadas: ${Object.keys(columnMap).length}`);
    for (const [colName, colIdx] of Object.entries(columnMap)) {
      console.log(`[Grid Extractor]   - ${colName}: columna ${colIdx}`);
    }

    const weightColumn = this.detectWeightColumn(table);
    if (weightColumn === null) {
      console.log(`[Grid Extractor] ⚠ No se detectó columna de pesos`);
      return [];
    }
    console.log(`[Grid Extractor] ✓ Columna de pesos: ${weightColumn}`);

    const zoneBlocks = this.detectZoneBlocks(table, weightColumn);
    console.log(`[Grid Extractor] ✓ Bloques de zona detectados: ${zoneBlocks.length}`);

    const extractedData: any[] = [];

    for (const zoneBlock of zoneBlocks) {
      console.log(`\n[Grid Extractor] Procesando zona: ${zoneBlock.zoneName}`);
      console.log(`[Grid Extractor]   Filas: ${zoneBlock.startRow} a ${zoneBlock.endRow} (${zoneBlock.endRow - zoneBlock.startRow + 1} filas)`);

      for (let weightIdx = 0; weightIdx < WEIGHT_RANGES.length; weightIdx++) {
        const weightRange = WEIGHT_RANGES[weightIdx];
        const dataRowIdx = zoneBlock.startRow + weightIdx;

        if (dataRowIdx > zoneBlock.endRow) {
          console.log(`[Grid Extractor]   ⚠ No hay suficientes filas para peso ${weightRange.from}-${weightRange.to}`);
          break;
        }

        const rowData: any = {
          service_name: service.dbName,
          weight_from: weightRange.from,
          weight_to: weightRange.to
        };

        const dataRow = table.rows[dataRowIdx];
        console.log(`[Grid Extractor]   Fila ${dataRowIdx} (peso ${weightRange.from}-${weightRange.to}kg):`);

        for (const [colName, colIdx] of Object.entries(columnMap)) {
          const columnConfig = COLUMN_HEADERS.find(h => h.name === colName);
          if (!columnConfig) continue;

          const cell = dataRow[colIdx];
          const value = VirtualTableBuilder.extractNumberFromCell(cell);

          const fieldName = `${zoneBlock.dbPrefix}${columnConfig.dbSuffix}`;
          rowData[fieldName] = value;

          if (value !== null) {
            console.log(`[Grid Extractor]     ${colName} (col ${colIdx}): ${value} → ${fieldName}`);
          }
        }

        extractedData.push(rowData);
      }
    }

    console.log(`\n[Grid Extractor] ✓ Extraídos ${extractedData.length} registros de ${service.serviceName}`);
    return extractedData;
  }

  private static detectService(table: VirtualTable): ServiceConfig | null {
    for (const service of SERVICES) {
      for (const pattern of service.detectionPatterns) {
        const cell = VirtualTableBuilder.findCellByPattern(table, pattern, 0);
        if (cell) {
          return service;
        }
      }
    }
    return null;
  }

  private static detectColumns(table: VirtualTable): Record<string, number> {
    const columnMap: Record<string, number> = {};

    for (const header of COLUMN_HEADERS) {
      for (const pattern of header.patterns) {
        const colIdx = VirtualTableBuilder.findColumnIndexByHeader(table, pattern, 10);
        if (colIdx !== null) {
          columnMap[header.name] = colIdx;
          break;
        }
      }
    }

    return columnMap;
  }

  private static detectWeightColumn(table: VirtualTable): number | null {
    for (const weightRange of WEIGHT_RANGES.slice(0, 3)) {
      for (const pattern of weightRange.patterns) {
        const cell = VirtualTableBuilder.findCellByPattern(table, pattern, 0);
        if (cell) {
          console.log(`[Grid Extractor] Columna de peso encontrada en columna ${cell.colIndex} (texto: "${cell.text}")`);
          return cell.colIndex;
        }
      }
    }
    return null;
  }

  private static detectZoneBlocks(table: VirtualTable, weightColumn: number): Array<{zoneName: string, dbPrefix: string, startRow: number, endRow: number}> {
    const zoneBlocks: Array<{zoneName: string, dbPrefix: string, startRow: number, endRow: number}> = [];

    for (let rowIdx = 0; rowIdx < table.rowCount; rowIdx++) {
      for (const zoneConfig of ZONES) {
        for (const pattern of zoneConfig.detectionPatterns) {
          const leftCell = table.rows[rowIdx][0];

          if (pattern.test(leftCell.text)) {
            console.log(`[Grid Extractor] Zona "${zoneConfig.zoneName}" encontrada en fila ${rowIdx}`);

            const firstWeightCell = table.rows[rowIdx][weightColumn];
            let startsOnSameRow = false;

            for (const weightPattern of WEIGHT_RANGES[0].patterns) {
              if (weightPattern.test(firstWeightCell.text)) {
                startsOnSameRow = true;
                console.log(`[Grid Extractor]   ✓ Primera fila de datos (1kg) está en la MISMA fila ${rowIdx}`);
                break;
              }
            }

            const startRow = startsOnSameRow ? rowIdx : rowIdx + 1;
            const endRow = startRow + WEIGHT_RANGES.length - 1;

            zoneBlocks.push({
              zoneName: zoneConfig.zoneName,
              dbPrefix: zoneConfig.dbPrefix,
              startRow: startRow,
              endRow: Math.min(endRow, table.rowCount - 1)
            });

            break;
          }
        }
      }
    }

    return zoneBlocks;
  }
}