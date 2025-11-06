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
  private static readonly SERVICE_PATTERNS = [
    /express\s*0?8\s*:\s*30/i, /urg.*0?8:?30/i,
    /express\s*10\s*:\s*30/i,
    /express\s*14\s*:\s*00/i, /urg.*14/i,
    /express\s*19\s*:\s*00/i, /urg.*19/i,
    /business\s*parcel/i,
    /euro\s*business/i, /eurobusiness/i,
    /economy\s*parcel/i,
    /parcel\s*shop/i, /shop.*delivery/i, /shop.*return/i
  ];

  static buildMultipleTables(pageData: PageData): VirtualTable[] {
    console.log(`[Grid Builder] Buscando múltiples tablas en página ${pageData.pageNum}`);

    const sortedItems = [...pageData.items]
      .filter(item => item.str.trim().length > 0)
      .sort((a, b) => {
        const yDiff = b.transform[5] - a.transform[5];
        if (Math.abs(yDiff) > this.Y_TOLERANCE) {
          return yDiff;
        }
        return a.transform[4] - b.transform[4];
      });

    const serviceRows: number[] = [];
    const rowGroups = this.groupItemsByRow(sortedItems);
    const sortedRowEntries = Array.from(rowGroups.entries()).sort((a, b) => b[0] - a[0]);

    console.log(`[Grid Builder] Escaneando ${sortedRowEntries.length} filas en busca de servicios...`);

    for (let i = 0; i < sortedRowEntries.length; i++) {
      const [y, items] = sortedRowEntries[i];
      const rowText = items.map(item => item.str).join(' ');
      const rowTextLower = rowText.toLowerCase();

      if (i < 20) {
        console.log(`[Grid Builder] Fila ${i}: "${rowText.substring(0, 80)}"`);
      }

      if (/glass|cristal/i.test(rowText)) {
        console.log(`[Grid Builder] ⊗ Fila ${i} ignorada (Glass/Cristal): "${rowText.substring(0, 50)}"`);
        continue;
      }

      let serviceDetected = false;
      for (const pattern of this.SERVICE_PATTERNS) {
        if (pattern.test(rowTextLower)) {
          serviceRows.push(i);
          console.log(`[Grid Builder] ✓ Servicio detectado en fila ${i}: "${rowText.substring(0, 80)}"`);
          serviceDetected = true;
          break;
        }
      }

      if (!serviceDetected && (rowTextLower.includes('express') || rowTextLower.includes('parcel') || rowTextLower.includes('shop'))) {
        console.log(`[Grid Builder] ⚠ Posible servicio NO detectado en fila ${i}: "${rowText}"`);
      }
    }

    if (serviceRows.length === 0) {
      console.log(`[Grid Builder] ⚠ No se detectaron servicios en ${sortedRowEntries.length} filas, creando tabla única`);
      console.log(`[Grid Builder] Mostrando primeras 30 filas para debugging:`);
      for (let i = 0; i < Math.min(30, sortedRowEntries.length); i++) {
        const [y, items] = sortedRowEntries[i];
        const rowText = items.map(item => item.str).join(' ');
        console.log(`[Grid Builder]   [${i}]: ${rowText.substring(0, 100)}`);
      }
      return [this.buildVirtualTable(pageData)];
    }

    console.log(`[Grid Builder] ✓ Detectados ${serviceRows.length} servicios en página ${pageData.pageNum}`);

    const tables: VirtualTable[] = [];
    for (let i = 0; i < serviceRows.length; i++) {
      const startRow = serviceRows[i];
      const endRow = i < serviceRows.length - 1 ? serviceRows[i + 1] : sortedRowEntries.length;

      const subTableRows = sortedRowEntries.slice(startRow, endRow);
      console.log(`[Grid Builder] Creando sub-tabla ${i + 1}/${serviceRows.length}: filas ${startRow} a ${endRow - 1} (${endRow - startRow} filas)`);

      const subTable = this.buildTableFromRows(subTableRows, pageData, startRow);
      tables.push(subTable);
    }

    console.log(`[Grid Builder] ✓ Creadas ${tables.length} tablas en página ${pageData.pageNum}`);
    return tables;
  }

  private static groupItemsByRow(items: TextItem[]): Map<number, TextItem[]> {
    const rowGroups = new Map<number, TextItem[]>();

    for (const item of items) {
      const y = Math.round(item.transform[5]);
      let foundGroup = false;

      for (const [groupY, groupItems] of rowGroups.entries()) {
        if (Math.abs(groupY - y) <= this.Y_TOLERANCE) {
          groupItems.push(item);
          foundGroup = true;
          break;
        }
      }

      if (!foundGroup) {
        rowGroups.set(y, [item]);
      }
    }

    return rowGroups;
  }

  private static buildTableFromRows(
    rowEntries: Array<[number, TextItem[]]>,
    pageData: PageData,
    rowOffset: number
  ): VirtualTable {
    const allItems = rowEntries.flatMap(([y, items]) => items);
    const xPositions = this.detectColumnPositions(allItems);

    const grid: GridCell[][] = [];

    for (let rowIdx = 0; rowIdx < rowEntries.length; rowIdx++) {
      const [y, items] = rowEntries[rowIdx];
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

    return {
      rows: grid,
      rowCount: grid.length,
      colCount: xPositions.length,
      pageNum: pageData.pageNum
    };
  }

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

    const text = cell.text.trim();

    const numPattern = /(\d+[.,]\d+|\d+)/g;
    const matches = text.match(numPattern);

    if (!matches || matches.length === 0) return null;

    const firstMatch = matches[0].replace(',', '.');
    const num = parseFloat(firstMatch);

    if (isNaN(num) || num <= 0 || num >= 10000) return null;

    console.log(`[Grid Parser] Celda "${text}" → Número extraído: ${num}`);
    return num;
  }
}