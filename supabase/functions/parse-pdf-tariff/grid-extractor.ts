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

    if (this.shouldSkipTable(table)) {
      console.log(`[Grid Extractor] ⊗ Tabla ignorada (Glass/Cristal detectado)`);
      return [];
    }

    const service = this.detectService(table);
    if (!service) {
      console.log(`[Grid Extractor] ⚠ No se detectó servicio en esta tabla`);
      this.printTablePreview(table);
      return [];
    }

    console.log(`[Grid Extractor] ✓ Servicio detectado: ${service.serviceName} (${service.dbName})`);

    const columnMap = this.detectColumns(table);
    console.log(`[Grid Extractor] ✓ Columnas detectadas: ${Object.keys(columnMap).length}`);
    for (const [colName, colIdx] of Object.entries(columnMap)) {
      console.log(`[Grid Extractor]   - ${colName}: columna ${colIdx}`);
    }

    if (Object.keys(columnMap).length < 3) {
      console.log(`[Grid Extractor] ⚠ Muy pocas columnas detectadas (${Object.keys(columnMap).length}), ignorando tabla`);
      return [];
    }

    const weightColumn = this.detectWeightColumn(table);
    if (weightColumn === null) {
      console.log(`[Grid Extractor] ⚠ No se detectó columna de pesos`);
      return [];
    }
    console.log(`[Grid Extractor] ✓ Columna de pesos: ${weightColumn}`);

    const zoneBlocks = this.detectZoneBlocksImproved(table, weightColumn);
    console.log(`[Grid Extractor] ✓ Bloques de zona detectados: ${zoneBlocks.length}`);
    for (const block of zoneBlocks) {
      console.log(`[Grid Extractor]   - ${block.zoneName}: filas ${block.startRow} a ${block.endRow}`);
    }

    if (zoneBlocks.length === 0) {
      console.log(`[Grid Extractor] ⚠ No se detectaron zonas, ignorando tabla`);
      return [];
    }

    const consolidatedData = this.consolidateDataByWeight(table, zoneBlocks, columnMap, service, weightColumn);

    console.log(`\n[Grid Extractor] ✓ Extraídos ${consolidatedData.length} registros de ${service.serviceName}`);
    return consolidatedData;
  }

  private static shouldSkipTable(table: VirtualTable): boolean {
    for (let rowIdx = 0; rowIdx < Math.min(10, table.rowCount); rowIdx++) {
      for (const cell of table.rows[rowIdx]) {
        if (/glass|cristal/i.test(cell.text)) {
          console.log(`[Grid Extractor] Detectado Glass/Cristal en fila ${rowIdx}: "${cell.text}"`);
          return true;
        }
      }
    }
    return false;
  }

  private static printTablePreview(table: VirtualTable): void {
    console.log(`[Grid Extractor] Preview de tabla (primeras 10 filas):`);
    for (let i = 0; i < Math.min(10, table.rowCount); i++) {
      const rowText = table.rows[i].map(c => c.text.substring(0, 15)).join(' | ');
      console.log(`  Fila ${i}: ${rowText}`);
    }
  }

  private static consolidateDataByWeight(
    table: VirtualTable,
    zoneBlocks: Array<{zoneName: string, dbPrefix: string, startRow: number, endRow: number}>,
    columnMap: Record<string, number>,
    service: ServiceConfig,
    weightColumn: number
  ): any[] {
    console.log(`\n[Grid Extractor] Consolidando datos por peso...`);

    const dataByWeight = new Map<string, any>();

    for (const zoneBlock of zoneBlocks) {
      console.log(`\n[Grid Extractor] Procesando zona: ${zoneBlock.zoneName}`);
      console.log(`[Grid Extractor]   Filas: ${zoneBlock.startRow} a ${zoneBlock.endRow}`);

      let extractedWeights = 0;

      for (let weightIdx = 0; weightIdx < WEIGHT_RANGES.length; weightIdx++) {
        const weightRange = WEIGHT_RANGES[weightIdx];
        const dataRowIdx = zoneBlock.startRow + weightIdx;

        if (dataRowIdx > zoneBlock.endRow) {
          console.log(`[Grid Extractor]   ⚠ No hay suficientes filas para peso ${weightRange.from}-${weightRange.to}`);
          break;
        }

        const dataRow = table.rows[dataRowIdx];
        const weightCell = dataRow[weightColumn];

        let weightConfirmed = false;
        for (const pattern of weightRange.patterns) {
          if (pattern.test(weightCell.text)) {
            weightConfirmed = true;
            break;
          }
        }

        if (!weightConfirmed) {
          console.log(`[Grid Extractor]   ⚠ ADVERTENCIA: Fila ${dataRowIdx} no coincide con peso esperado ${weightRange.from}-${weightRange.to}kg (texto: "${weightCell.text}")`);
        }

        const weightKey = `${weightRange.from}-${weightRange.to}`;

        if (!dataByWeight.has(weightKey)) {
          dataByWeight.set(weightKey, {
            service_name: service.dbName,
            weight_from: weightRange.from,
            weight_to: weightRange.to
          });
        }

        const rowData = dataByWeight.get(weightKey);

        console.log(`[Grid Extractor]   Fila ${dataRowIdx} (peso ${weightRange.from}-${weightRange.to}kg):`);

        let validValuesCount = 0;

        for (const [colName, colIdx] of Object.entries(columnMap)) {
          const columnConfig = COLUMN_HEADERS.find(h => h.name === colName);
          if (!columnConfig) continue;

          const cell = dataRow[colIdx];
          const value = VirtualTableBuilder.extractNumberFromCell(cell);

          const fieldName = `${zoneBlock.dbPrefix}${columnConfig.dbSuffix}`;
          rowData[fieldName] = value;

          if (value !== null) {
            validValuesCount++;
            console.log(`[Grid Extractor]     ${colName} (col ${colIdx}): ${value} → ${fieldName}`);
          } else {
            console.log(`[Grid Extractor]     ${colName} (col ${colIdx}): NULL (texto: "${cell.text}")`);
          }
        }

        if (validValuesCount > 0) {
          extractedWeights++;
        }
      }

      console.log(`[Grid Extractor]   ✓ Zona ${zoneBlock.zoneName}: ${extractedWeights}/${WEIGHT_RANGES.length} rangos extraídos`);

      if (extractedWeights < WEIGHT_RANGES.length) {
        console.log(`[Grid Extractor]   ⚠ ADVERTENCIA: Se esperaban ${WEIGHT_RANGES.length} rangos pero solo se extrajeron ${extractedWeights}`);
      }
    }

    const result = Array.from(dataByWeight.values());
    console.log(`\n[Grid Extractor] Consolidación completada: ${result.length} registros`);

    if (result.length !== WEIGHT_RANGES.length) {
      console.log(`[Grid Extractor] ⚠ ADVERTENCIA: Se esperaban ${WEIGHT_RANGES.length} registros pero se generaron ${result.length}`);
    }

    return result;
  }

  private static detectZoneBlocksImproved(table: VirtualTable, weightColumn: number): Array<{zoneName: string, dbPrefix: string, startRow: number, endRow: number}> {
    const zoneBlocks: Array<{zoneName: string, dbPrefix: string, startRow: number, endRow: number}> = [];
    const processedRows = new Set<number>();

    console.log(`\n[Grid Extractor] Detectando bloques de zona (método mejorado)...`);

    for (let rowIdx = 0; rowIdx < table.rowCount; rowIdx++) {
      if (processedRows.has(rowIdx)) continue;

      const currentRow = table.rows[rowIdx];

      for (const zoneConfig of ZONES) {
        let zoneDetected = false;
        let detectionColumn = -1;

        for (let colIdx = 0; colIdx < Math.min(3, currentRow.length); colIdx++) {
          const cell = currentRow[colIdx];

          for (const pattern of zoneConfig.detectionPatterns) {
            if (pattern.test(cell.text)) {
              console.log(`[Grid Extractor] Zona "${zoneConfig.zoneName}" detectada en fila ${rowIdx}, columna ${colIdx} (texto: "${cell.text}")`);
              zoneDetected = true;
              detectionColumn = colIdx;
              break;
            }
          }

          if (zoneDetected) break;
        }

        if (zoneDetected) {
          const startRow = this.findFirstWeightRow(table, rowIdx, weightColumn);

          if (startRow === null) {
            console.log(`[Grid Extractor]   ⚠ No se encontró primera fila de peso para ${zoneConfig.zoneName}`);
            break;
          }

          const endRow = startRow + WEIGHT_RANGES.length - 1;

          const actualEndRow = Math.min(endRow, table.rowCount - 1);

          for (let r = startRow; r <= actualEndRow; r++) {
            processedRows.add(r);
          }

          const firstDataRow = table.rows[startRow];
          console.log(`[Grid Extractor]   → Primera fila de datos (${startRow}):`);
          for (let colIdx = 0; colIdx < Math.min(8, firstDataRow.length); colIdx++) {
            console.log(`[Grid Extractor]     Col ${colIdx}: "${firstDataRow[colIdx].text}"`);
          }

          zoneBlocks.push({
            zoneName: zoneConfig.zoneName,
            dbPrefix: zoneConfig.dbPrefix,
            startRow: startRow,
            endRow: actualEndRow
          });

          console.log(`[Grid Extractor]   → Bloque confirmado: filas ${startRow} a ${actualEndRow}`);
          break;
        }
      }
    }

    console.log(`\n[Grid Extractor] Total bloques detectados: ${zoneBlocks.length}`);
    return zoneBlocks;
  }

  private static findFirstWeightRow(table: VirtualTable, zoneRow: number, weightColumn: number): number | null {
    const searchRange = 2;

    for (let offset = 0; offset <= searchRange; offset++) {
      const checkRow = zoneRow + offset;
      if (checkRow >= table.rowCount) break;

      const weightCell = table.rows[checkRow][weightColumn];

      for (const weightPattern of WEIGHT_RANGES[0].patterns) {
        if (weightPattern.test(weightCell.text)) {
          console.log(`[Grid Extractor]   ✓ Primera fila de datos (1kg) encontrada en fila ${checkRow} (offset: ${offset})`);
          return checkRow;
        }
      }
    }

    return null;
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
}
