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

export class VirtualTableBuilder {
  private static readonly Y_TOLERANCE = 3;
  private static readonly X_COLUMN_WIDTH = 80;

  static buildVirtualTable(pageData: PageData): VirtualTable {
    console.log(`[Grid Builder] Construyendo tabla virtual para página ${pageData.pageNum}`);

    const sortedItems = [...pageData.items]
      .filter(item => item.str.trim().length > 0)
      .sort((a, b) => {
        const yDiff = b.transform[5] - a.transform[5];
        if (Math.abs(yDiff) > this.Y_TOLERANCE) {
          return yDiff;
        }
        return a.transform[4] - b.transform[4];
      });

    const rowGroups = new Map<number, TextItem[]>();

    for (const item of sortedItems) {
      const y = Math.round(item.transform[5]);
      let foundGroup = false;

      for (const [groupY, items] of rowGroups.entries()) {
        if (Math.abs(groupY - y) <= this.Y_TOLERANCE) {
          items.push(item);
          foundGroup = true;
          break;
        }
      }

      if (!foundGroup) {
        rowGroups.set(y, [item]);
      }
    }

    const sortedRowEntries = Array.from(rowGroups.entries())
      .sort((a, b) => b[0] - a[0]);

    const xPositions = this.detectColumnPositions(sortedItems);
    console.log(`[Grid Builder] Detectadas ${xPositions.length} columnas: ${xPositions.map(x => x.toFixed(0)).join(', ')}`);

    const grid: GridCell[][] = [];

    for (let rowIdx = 0; rowIdx < sortedRowEntries.length; rowIdx++) {
      const [y, items] = sortedRowEntries[rowIdx];
      const row: GridCell[] = [];

      for (let colIdx = 0; colIdx < xPositions.length; colIdx++) {
        const xTarget = xPositions[colIdx];
        const xMin = colIdx > 0 ? (xPositions[colIdx - 1] + xTarget) / 2 : 0;
        const xMax = colIdx < xPositions.length - 1 ? (xTarget + xPositions[colIdx + 1]) / 2 : pageData.width;

        const cellItems = items.filter(item => {
          const itemX = item.transform[4];
          return itemX >= xMin && itemX < xMax;
        });

        const cellText = cellItems.map(item => item.str.trim()).join(' ');

        row.push({
          text: cellText,
          x: xTarget,
          y: y,
          rowIndex: rowIdx,
          colIndex: colIdx
        });
      }

      grid.push(row);
    }

    console.log(`[Grid Builder] ✓ Tabla virtual creada: ${grid.length} filas × ${xPositions.length} columnas`);

    this.printGridPreview(grid);

    return {
      rows: grid,
      rowCount: grid.length,
      colCount: xPositions.length,
      pageNum: pageData.pageNum
    };
  }

  private static detectColumnPositions(items: TextItem[]): number[] {
    const xPositions = items.map(item => Math.round(item.transform[4]));
    const xCounts = new Map<number, number>();

    for (const x of xPositions) {
      let foundCluster = false;
      for (const [clusterX, count] of xCounts.entries()) {
        if (Math.abs(clusterX - x) <= 15) {
          xCounts.set(clusterX, count + 1);
          foundCluster = true;
          break;
        }
      }
      if (!foundCluster) {
        xCounts.set(x, 1);
      }
    }

    const significantColumns = Array.from(xCounts.entries())
      .filter(([x, count]) => count >= 3)
      .map(([x, count]) => x)
      .sort((a, b) => a - b);

    return significantColumns;
  }

  private static printGridPreview(grid: GridCell[][], maxRows: number = 15) {
    console.log(`[Grid Preview] Primeras ${Math.min(maxRows, grid.length)} filas de la tabla virtual:`);
    console.log('─'.repeat(120));

    for (let i = 0; i < Math.min(maxRows, grid.length); i++) {
      const row = grid[i];
      const rowText = row.map(cell => {
        const text = cell.text.substring(0, 12);
        return text.padEnd(12, ' ');
      }).join(' | ');
      console.log(`Fila ${String(i).padStart(2, '0')}: ${rowText}`);
    }

    console.log('─'.repeat(120));
  }

  static findCellByPattern(table: VirtualTable, pattern: RegExp, startRow: number = 0): GridCell | null {
    for (let rowIdx = startRow; rowIdx < table.rowCount; rowIdx++) {
      for (const cell of table.rows[rowIdx]) {
        if (pattern.test(cell.text)) {
          return cell;
        }
      }
    }
    return null;
  }

  static getCellAt(table: VirtualTable, rowIndex: number, colIndex: number): GridCell | null {
    if (rowIndex < 0 || rowIndex >= table.rowCount) return null;
    if (colIndex < 0 || colIndex >= table.colCount) return null;
    return table.rows[rowIndex][colIndex];
  }

  static getRowRange(table: VirtualTable, startRow: number, endRow: number): GridCell[][] {
    const rows: GridCell[][] = [];
    for (let i = startRow; i <= endRow && i < table.rowCount; i++) {
      rows.push(table.rows[i]);
    }
    return rows;
  }

  static findColumnIndexByHeader(table: VirtualTable, headerPattern: RegExp, searchRows: number = 5): number | null {
    for (let rowIdx = 0; rowIdx < Math.min(searchRows, table.rowCount); rowIdx++) {
      for (const cell of table.rows[rowIdx]) {
        if (headerPattern.test(cell.text)) {
          console.log(`[Grid] Columna encontrada: "${cell.text}" en fila ${rowIdx}, columna ${cell.colIndex}`);
          return cell.colIndex;
        }
      }
    }
    return null;
  }

  static extractNumberFromCell(cell: GridCell): number | null {
    if (!cell || !cell.text) return null;
    const cleaned = cell.text.replace(/,/g, '.').replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return (!isNaN(num) && num > 0 && num < 10000) ? num : null;
  }
}
