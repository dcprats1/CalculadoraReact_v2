/**
 * template-based-extractor.ts
 *
 * Extractor que usa la plantilla GLS 2025 como referencia exacta
 * NO intenta adivinar la estructura - la usa directamente del MAPA
 */

import { VirtualTableBuilder } from './grid-parser.ts';
import {
  GLS_2025_TEMPLATE,
  getTemplateForService,
  matchesWeightPattern,
  matchesZonePattern,
  type TemplateService,
  type TemplateZone,
  type TemplateWeightRange
} from './gls-2025-template.ts';

interface GridCell {
  text: string;
  x: number;
  y: number;
  rowIndex: number;
  colIndex: number;
}

interface VirtualTable {
  rows: GridCell[][];
  rowCount: number;
  colCount: number;
  pageNum: number;
}

interface WeightRowMatch {
  rowIndex: number;
  yPosition: number;
  weightRange: TemplateWeightRange;
  cellText: string;
}

interface ZoneBlock {
  zone: TemplateZone;
  startRow: number;
  endRow: number;
  weightRows: WeightRowMatch[];
}

export class TemplateBasedExtractor {
  /**
   * Extrae datos usando la plantilla como guía exacta
   */
  static extractFromTable(table: VirtualTable): any[] {
    console.log(`\n[Template Extractor] ===== PROCESANDO TABLA (Página ${table.pageNum}) =====`);

    // 1. Detectar servicio usando plantilla
    const template = this.detectServiceTemplate(table);
    if (!template) {
      console.log(`[Template Extractor] ⚠ No se detectó ningún servicio de la plantilla`);
      return [];
    }

    console.log(`[Template Extractor] ✓ Servicio: ${template.name} (${template.dbName})`);
    console.log(`[Template Extractor]   Esperando ${template.zones.length} zonas`);
    console.log(`[Template Extractor]   Esperando ${template.weightRanges.length} rangos de peso`);

    // 2. Detectar columna de pesos (primera columna siempre)
    const weightColumn = this.detectWeightColumn(table);
    if (weightColumn === null) {
      console.log(`[Template Extractor] ⚠ No se detectó columna de pesos`);
      return [];
    }
    console.log(`[Template Extractor] ✓ Columna de pesos: ${weightColumn}`);

    // 3. Detectar bloques de zonas usando plantilla
    const zoneBlocks = this.detectZoneBlocksWithTemplate(table, template, weightColumn);
    console.log(`[Template Extractor] ✓ Bloques detectados: ${zoneBlocks.length}`);

    if (zoneBlocks.length === 0) {
      console.log(`[Template Extractor] ⚠ No se detectaron zonas`);
      return [];
    }

    // 4. Detectar columnas de datos
    const columnMap = this.detectDataColumns(table, template);
    console.log(`[Template Extractor] ✓ Columnas detectadas: ${Object.keys(columnMap).length}`);
    for (const [suffix, colIdx] of Object.entries(columnMap)) {
      console.log(`[Template Extractor]   - ${suffix}: columna ${colIdx}`);
    }

    // 5. Extraer datos usando plantilla + detecciones
    const data = this.extractDataWithTemplate(table, template, zoneBlocks, columnMap);

    console.log(`[Template Extractor] ✓ Extraídos ${data.length} registros de ${template.name}\n`);
    return data;
  }

  private static detectServiceTemplate(table: VirtualTable): TemplateService | null {
    // Buscar en las primeras 10 filas
    for (let rowIdx = 0; rowIdx < Math.min(10, table.rowCount); rowIdx++) {
      const rowText = table.rows[rowIdx].map(c => c.text).join(' ');

      for (const template of GLS_2025_TEMPLATE) {
        for (const pattern of template.detectionPatterns) {
          if (pattern.test(rowText)) {
            return template;
          }
        }
      }
    }

    return null;
  }

  private static detectWeightColumn(table: VirtualTable): number | null {
    // La columna de peso siempre contiene "1 Kg", "3 Kg", etc.
    const patterns = [/^1\s*[Kk]g\.?$/i, /^3\s*[Kk]g\.?$/i, /^5\s*[Kk]g\.?$/i];

    for (let rowIdx = 0; rowIdx < Math.min(20, table.rowCount); rowIdx++) {
      for (let colIdx = 0; colIdx < Math.min(3, table.rows[rowIdx].length); colIdx++) {
        const cell = table.rows[rowIdx][colIdx];

        for (const pattern of patterns) {
          if (pattern.test(cell.text)) {
            return colIdx;
          }
        }
      }
    }

    return null;
  }

  private static detectZoneBlocksWithTemplate(
    table: VirtualTable,
    template: TemplateService,
    weightColumn: number
  ): ZoneBlock[] {
    const blocks: ZoneBlock[] = [];

    console.log(`\n[Template Extractor] Detectando zonas según plantilla...`);

    for (const zoneTemplate of template.zones) {
      console.log(`[Template Extractor] Buscando zona: ${zoneTemplate.name}`);

      // Buscar la fila que contiene el nombre de la zona
      let zoneRow = -1;
      for (let rowIdx = 0; rowIdx < table.rowCount; rowIdx++) {
        const rowText = table.rows[rowIdx].map(c => c.text).join(' ');

        if (matchesZonePattern(rowText, zoneTemplate)) {
          zoneRow = rowIdx;
          console.log(`[Template Extractor]   → Encontrada en fila ${rowIdx}: "${rowText.substring(0, 50)}"`);
          break;
        }
      }

      if (zoneRow === -1) {
        console.log(`[Template Extractor]   ⚠ No encontrada`);
        continue;
      }

      // Buscar filas de peso después de la zona (máximo 10 filas después)
      const weightRows: WeightRowMatch[] = [];
      const searchEnd = Math.min(zoneRow + 12, table.rowCount);

      for (let rowIdx = zoneRow + 1; rowIdx < searchEnd; rowIdx++) {
        const weightCell = table.rows[rowIdx][weightColumn];

        for (const weightRange of template.weightRanges) {
          if (matchesWeightPattern(weightCell.text, weightRange)) {
            weightRows.push({
              rowIndex: rowIdx,
              yPosition: weightCell.y,
              weightRange: weightRange,
              cellText: weightCell.text
            });
            console.log(`[Template Extractor]     ✓ Fila ${rowIdx}: ${weightRange.from}-${weightRange.to}kg (Y=${weightCell.y.toFixed(1)})`);
            break;
          }
        }
      }

      if (weightRows.length > 0) {
        blocks.push({
          zone: zoneTemplate,
          startRow: weightRows[0].rowIndex,
          endRow: weightRows[weightRows.length - 1].rowIndex,
          weightRows: weightRows
        });

        console.log(`[Template Extractor]   ✓ Bloque completo: ${weightRows.length} rangos de peso`);
      } else {
        console.log(`[Template Extractor]   ⚠ No se encontraron rangos de peso`);
      }
    }

    return blocks;
  }

  private static detectDataColumns(
    table: VirtualTable,
    template: TemplateService
  ): Record<string, number> {
    const columnMap: Record<string, number> = {};

    // Buscar headers en las primeras 15 filas
    const headerPatterns = [
      { suffix: "_arr", patterns: [/arrastre/i, /^arr$/i] },
      { suffix: "_sal", patterns: [/salidas/i, /^sal$/i] },
      { suffix: "_rec", patterns: [/recogidas/i, /^rec$/i] },
      { suffix: "_int", patterns: [/interciudad/i, /^int$/i] },
      { suffix: "_ent", patterns: [/entrega/i, /^ent$/i] },
      { suffix: "_km", patterns: [/km/i, /kilómetros/i] }
    ];

    for (let rowIdx = 0; rowIdx < Math.min(15, table.rowCount); rowIdx++) {
      const row = table.rows[rowIdx];

      for (const { suffix, patterns } of headerPatterns) {
        if (columnMap[suffix]) continue; // Ya encontrada

        for (let colIdx = 0; colIdx < row.length; colIdx++) {
          const cell = row[colIdx];

          for (const pattern of patterns) {
            if (pattern.test(cell.text)) {
              columnMap[suffix] = colIdx;
              console.log(`[Template Extractor] Header encontrado: ${suffix} en columna ${colIdx} (fila ${rowIdx})`);
              break;
            }
          }

          if (columnMap[suffix]) break;
        }
      }
    }

    return columnMap;
  }

  private static extractDataWithTemplate(
    table: VirtualTable,
    template: TemplateService,
    zoneBlocks: ZoneBlock[],
    columnMap: Record<string, number>
  ): any[] {
    const dataByWeight = new Map<string, any>();

    console.log(`\n[Template Extractor] Extrayendo datos con plantilla...`);

    for (const block of zoneBlocks) {
      console.log(`\n[Template Extractor] Procesando zona: ${block.zone.name}`);
      console.log(`[Template Extractor]   ${block.weightRows.length} rangos de peso detectados`);

      for (const weightRow of block.weightRows) {
        const weightKey = `${weightRow.weightRange.from}-${weightRow.weightRange.to}`;

        if (!dataByWeight.has(weightKey)) {
          dataByWeight.set(weightKey, {
            service_name: template.dbName,
            weight_from: weightRow.weightRange.from,
            weight_to: weightRow.weightRange.to
          });
        }

        const record = dataByWeight.get(weightKey);
        const dataRow = table.rows[weightRow.rowIndex];

        console.log(`[Template Extractor]   Fila ${weightRow.rowIndex} (${weightKey}kg):`);

        // Extraer valores de cada columna según plantilla
        for (const [suffix, colIdx] of Object.entries(columnMap)) {
          if (colIdx >= dataRow.length) continue;

          const cell = dataRow[colIdx];
          const value = VirtualTableBuilder.extractNumberFromCell(cell);

          const fieldName = `${block.zone.dbPrefix}${suffix}`;
          record[fieldName] = value;

          if (value !== null) {
            console.log(`[Template Extractor]     ${suffix} (col ${colIdx}): ${value} → ${fieldName}`);
          }
        }
      }
    }

    return Array.from(dataByWeight.values());
  }
}
