/**
 * weight-row-detector.ts
 *
 * Detecta dinámicamente las filas de peso basándose en las posiciones Y reales
 * en lugar de asumir espaciado uniforme.
 */

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

export interface WeightRow {
  weight_from: string;
  weight_to: string;
  rowIndex: number;
  yPosition: number;
  cellText: string;
}

const WEIGHT_PATTERNS = [
  { from: "0", to: "1", patterns: [/^1\s*[Kk]g\.?/i, /^1$/] },
  { from: "1", to: "3", patterns: [/^3\s*[Kk]g\.?/i, /^3$/] },
  { from: "3", to: "5", patterns: [/^5\s*[Kk]g\.?/i, /^5$/] },
  { from: "5", to: "10", patterns: [/^10\s*[Kk]g\.?/i, /^10$/] },
  { from: "10", to: "15", patterns: [/^15\s*[Kk]g\.?/i, /^15$/] },
  { from: "15", to: "999", patterns: [/\+\s*[Kk]g/i, /^\+$/i, /adicional/i] }
];

export class WeightRowDetector {
  /**
   * Detecta todas las filas de peso en una tabla virtual
   * buscando patrones de peso en la columna de pesos
   */
  static detectWeightRows(
    table: VirtualTable,
    weightColumn: number,
    startRow: number = 0,
    endRow?: number
  ): WeightRow[] {
    const detectedRows: WeightRow[] = [];
    const maxRow = endRow ?? table.rowCount;

    console.log(`\n[Weight Detector] Detectando filas de peso entre fila ${startRow} y ${maxRow}`);
    console.log(`[Weight Detector] Columna de peso: ${weightColumn}`);

    for (let rowIdx = startRow; rowIdx < maxRow; rowIdx++) {
      const row = table.rows[rowIdx];
      if (!row || weightColumn >= row.length) continue;

      const weightCell = row[weightColumn];
      const cellText = weightCell.text.trim();

      // Intentar detectar el peso
      for (const weightPattern of WEIGHT_PATTERNS) {
        let matched = false;

        for (const pattern of weightPattern.patterns) {
          if (pattern.test(cellText)) {
            matched = true;
            break;
          }
        }

        if (matched) {
          const weightRow: WeightRow = {
            weight_from: weightPattern.from,
            weight_to: weightPattern.to,
            rowIndex: rowIdx,
            yPosition: weightCell.y,
            cellText: cellText
          };

          detectedRows.push(weightRow);
          console.log(`[Weight Detector]   ✓ Fila ${rowIdx} (Y=${weightCell.y.toFixed(1)}): ${weightPattern.from}-${weightPattern.to}kg (texto: "${cellText}")`);
          break; // Solo un peso por fila
        }
      }
    }

    console.log(`[Weight Detector] Total detectadas: ${detectedRows.length} filas de peso`);
    return detectedRows;
  }

  /**
   * Detecta bloques de filas de peso agrupadas por zona
   * Un bloque termina cuando se detecta otra fila "1 Kg" o un cambio de zona
   */
  static detectWeightBlocks(
    table: VirtualTable,
    weightColumn: number
  ): Array<{ startRow: number; endRow: number; weightRows: WeightRow[] }> {
    const allWeightRows = this.detectWeightRows(table, weightColumn);
    const blocks: Array<{ startRow: number; endRow: number; weightRows: WeightRow[] }> = [];

    let currentBlock: WeightRow[] = [];
    let blockStartRow = 0;

    for (let i = 0; i < allWeightRows.length; i++) {
      const weightRow = allWeightRows[i];

      // Si es el primer peso (1kg) y ya hay un bloque, cerrar el bloque anterior
      if (weightRow.weight_from === "0" && weightRow.weight_to === "1" && currentBlock.length > 0) {
        blocks.push({
          startRow: blockStartRow,
          endRow: currentBlock[currentBlock.length - 1].rowIndex,
          weightRows: [...currentBlock]
        });
        currentBlock = [];
        blockStartRow = weightRow.rowIndex;
      }

      currentBlock.push(weightRow);
    }

    // Añadir el último bloque
    if (currentBlock.length > 0) {
      blocks.push({
        startRow: blockStartRow,
        endRow: currentBlock[currentBlock.length - 1].rowIndex,
        weightRows: [...currentBlock]
      });
    }

    console.log(`\n[Weight Detector] Detectados ${blocks.length} bloques de peso`);
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      console.log(`[Weight Detector]   Bloque ${i + 1}: filas ${block.startRow} a ${block.endRow} (${block.weightRows.length} pesos)`);
    }

    return blocks;
  }

  /**
   * Encuentra la fila de peso más cercana a una posición Y dada
   */
  static findClosestWeightRow(
    weightRows: WeightRow[],
    targetY: number,
    tolerance: number = 10
  ): WeightRow | null {
    let closest: WeightRow | null = null;
    let minDistance = Infinity;

    for (const weightRow of weightRows) {
      const distance = Math.abs(weightRow.yPosition - targetY);
      if (distance < minDistance && distance <= tolerance) {
        minDistance = distance;
        closest = weightRow;
      }
    }

    if (closest) {
      console.log(`[Weight Detector] Y=${targetY} → fila ${closest.rowIndex} (distancia: ${minDistance.toFixed(1)})`);
    }

    return closest;
  }

  /**
   * Valida que un bloque de peso tenga la secuencia completa esperada
   */
  static validateWeightSequence(weightRows: WeightRow[]): { valid: boolean; missing: string[] } {
    const expected = WEIGHT_PATTERNS.map(p => `${p.from}-${p.to}`);
    const found = weightRows.map(wr => `${wr.weight_from}-${wr.weight_to}`);
    const missing = expected.filter(e => !found.includes(e));

    const valid = missing.length === 0 && found.length === expected.length;

    if (!valid) {
      console.log(`[Weight Detector] ⚠ Secuencia incompleta: falta ${missing.join(', ')}`);
    }

    return { valid, missing };
  }
}
