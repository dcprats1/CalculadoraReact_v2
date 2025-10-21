/**
 * ComparatorMiniSOPGenerator
 *
 * Genera un Excel SOP reducido desde el panel "Precios a Ofrecer" del comparador comercial.
 * A diferencia del SOP completo que calcula precios desde tarifas, este componente:
 * - Toma los precios directamente de la tabla "Precios a Ofrecer"
 * - Solo exporta el servicio seleccionado en el comparador
 * - Descarga un Excel con una única hoja (la del servicio)
 *
 * Proceso:
 * 1. Descarga plantilla del FTP
 * 2. Escribe en hoja "General" solo el servicio seleccionado
 * 3. Copia precios a la hoja específica del servicio
 * 4. Oculta todas las hojas excepto la del servicio
 * 5. Exporta el Workbook completo con formato e imágenes preservados
 */

import React, { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Loader2, X, AlertCircle } from 'lucide-react';
import { Workbook, Worksheet } from 'exceljs';
import type { ComparatorZone, ComparatorColumn, ComparatorTable } from '../CommercialComparatorPanel';
import {
  FTP_FILE_URL,
  createServiceKey,
  resolveExcelServiceKey,
  sanitizeFileName,
  normalizeRangeName,
  type ModeSuffix
} from '../../utils/sopHelpers';
import { trackMiniSOPDownload } from '../../utils/tracking';
import { useAuth } from '../../contexts/AuthContext';

interface ComparatorMiniSOPGeneratorProps {
  serviceName: string;
  offerTable: ComparatorTable;
}

/**
 * Mapeo de zonas del comparador a claves de base de datos
 */
const COMPARATOR_ZONE_TO_DB: Record<ComparatorZone, string> = {
  'Prov.': 'provincial',
  'Reg.': 'regional',
  'Pen.': 'nacional',
  'Port.': 'portugal',
  'Can.My.': 'canarias_mayores',
  'Can.Mn.': 'canarias_menores',
  'Bal.My.': 'baleares_mayores',
  'Bal.Mn.': 'baleares_menores',
  'Ceuta': 'ceuta',
  'Melilla': 'melilla'
};

/**
 * Mapeo de columnas del comparador a rangos de peso
 */
const COMPARATOR_COLUMN_TO_WEIGHT: Record<ComparatorColumn, { from: number; to: number }> = {
  '0 a 1kg': { from: 0, to: 1 },
  '1 a 3kg': { from: 1, to: 3 },
  '3 a 5kg': { from: 3, to: 5 },
  '5 a 10kg': { from: 5, to: 10 },
  '10 a 15kg': { from: 10, to: 15 },
  'kg. adc': { from: 15, to: 999 }
};

const SOP_DEBUG_ENABLED =
  typeof import.meta !== 'undefined' &&
  typeof import.meta.env !== 'undefined' &&
  Boolean(import.meta.env.DEV);

const sopLog = (...args: unknown[]) => {
  if (SOP_DEBUG_ENABLED) {
    console.log('[ComparatorMiniSOP]', ...args);
  }
};

/**
 * Busca el precio en la tabla del comparador para una zona y rango de peso
 */
const findPriceInOfferTable = (
  offerTable: ComparatorTable,
  dbZone: string,
  weightFrom: number,
  weightTo: number
): number | null => {
  for (const [comparatorZone, dbZoneKey] of Object.entries(COMPARATOR_ZONE_TO_DB)) {
    if (dbZoneKey !== dbZone) continue;

    const zoneData = offerTable[comparatorZone as ComparatorZone];
    if (!zoneData) continue;

    for (const [column, range] of Object.entries(COMPARATOR_COLUMN_TO_WEIGHT)) {
      if (range.from === weightFrom && range.to === weightTo) {
        const price = zoneData[column as ComparatorColumn];
        if (Number.isFinite(price) && price > 0) {
          return price;
        }
      }
    }
  }

  return null;
};

/**
 * Escribe los precios del comparador en la hoja "General" del Excel
 *
 * Estructura de columnas de la hoja "General":
 * A: weight_from
 * B: (vacío o auxiliar)
 * C: service_name
 * D: zone/range name
 * E: (vacío o auxiliar)
 * F: weight_to
 * G: PVP (donde se escribe el precio)
 * H: target_sheet_name
 * I: target_cell_address
 */
const writeToGeneralSheet = (
  generalSheet: Worksheet,
  serviceName: string,
  offerTable: ComparatorTable
): number => {
  let updatedCount = 0;
  const serviceKey = createServiceKey(serviceName);

  sopLog('Writing to General sheet for service:', serviceName, '(key:', serviceKey, ')');

  generalSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const weightFromCell = row.getCell('A').value;
    const serviceCell = row.getCell('C').value;
    const zoneCell = row.getCell('D').value;
    const weightToCell = row.getCell('F').value;

    if (!serviceCell || !zoneCell) return;

    const rowServiceKey = resolveExcelServiceKey(String(serviceCell));
    if (!rowServiceKey || rowServiceKey !== serviceKey) return;

    const zoneKeyRaw = String(zoneCell).trim();
    const zoneKey = normalizeRangeName(zoneKeyRaw);

    if (!zoneKey) {
      sopLog(`  Row ${rowNumber}: Could not resolve zone "${zoneKeyRaw}"`);
      return;
    }

    const baseZoneKey = zoneKey.replace(/_(sal|rec|int)$/, '');

    const weightFrom = Number(weightFromCell);
    const weightTo = Number(weightToCell);

    if (!Number.isFinite(weightFrom) || !Number.isFinite(weightTo)) return;

    const price = findPriceInOfferTable(offerTable, baseZoneKey, weightFrom, weightTo);

    if (price !== null) {
      row.getCell('G').value = Number(price.toFixed(2));
      updatedCount++;
      sopLog(`  Row ${rowNumber}: ${zoneKey} ${weightFrom}-${weightTo} = ${price.toFixed(2)}`);
    }
  });

  sopLog(`Updated ${updatedCount} cells in General sheet`);
  return updatedCount;
};

/**
 * Copia los precios de "General" a la hoja específica del servicio
 *
 * Lee las columnas G (PVP), H (target_sheet_name), I (target_cell_address)
 * y copia el precio a la celda correspondiente en la hoja del servicio.
 */
const copyPricesToServiceSheet = (
  generalSheet: Worksheet,
  targetSheet: Worksheet,
  serviceName: string
): number => {
  let copiedCount = 0;
  const serviceKey = createServiceKey(serviceName);

  sopLog('Copying prices to service sheet:', targetSheet.name);

  generalSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const serviceCell = row.getCell('C').value;
    if (!serviceCell) return;

    const rowServiceKey = resolveExcelServiceKey(String(serviceCell));
    if (!rowServiceKey || rowServiceKey !== serviceKey) return;

    const pvpValue = row.getCell('G').value;
    const targetSheetName = row.getCell('H').value;
    const targetCellAddress = row.getCell('I').value;

    if (!pvpValue || !targetSheetName || !targetCellAddress) return;
    if (typeof pvpValue !== 'number' || pvpValue <= 0) return;

    const sheetNameStr = String(targetSheetName).trim();
    const cellAddressStr = String(targetCellAddress).trim();

    if (sheetNameStr.toLowerCase() !== targetSheet.name.toLowerCase()) return;

    try {
      const targetCell = targetSheet.getCell(cellAddressStr);
      targetCell.value = Number(pvpValue.toFixed(2));
      copiedCount++;
      sopLog(`  Copied ${pvpValue.toFixed(2)} to ${cellAddressStr}`);
    } catch (error) {
      sopLog(`  Error copying to ${cellAddressStr}:`, error);
    }
  });

  sopLog(`Copied ${copiedCount} prices to service sheet`);
  return copiedCount;
};

/**
 * Encuentra la hoja específica del servicio basándose en la columna H de "General"
 * La columna H indica a qué hoja va cada precio, así que determinamos la hoja principal
 * del servicio encontrando la hoja más referenciada para ese servicio.
 */
const findServiceSheetFromGeneral = (
  generalSheet: Worksheet,
  workbook: Workbook,
  serviceName: string
): Worksheet | null => {
  const serviceKey = createServiceKey(serviceName);
  const sheetReferences = new Map<string, number>();

  sopLog('Finding service sheet from General column H for service:', serviceName);

  generalSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const serviceCell = row.getCell('C').value;
    if (!serviceCell) return;

    const rowServiceKey = resolveExcelServiceKey(String(serviceCell));
    if (!rowServiceKey || rowServiceKey !== serviceKey) return;

    const targetSheetName = String(row.getCell('H').value ?? '').trim();
    if (!targetSheetName) return;

    sheetReferences.set(targetSheetName, (sheetReferences.get(targetSheetName) || 0) + 1);
  });

  if (sheetReferences.size === 0) {
    sopLog('  ✗ No sheet references found in General for this service');
    return null;
  }

  const sortedSheets = Array.from(sheetReferences.entries()).sort((a, b) => b[1] - a[1]);
  sopLog('  Sheet references found:', sortedSheets);

  for (const [sheetName, count] of sortedSheets) {
    const sheet = workbook.getWorksheet(sheetName);
    if (sheet) {
      sopLog(`  ✓ Found sheet: "${sheetName}" (${count} references)`);
      return sheet;
    }
  }

  sopLog('  ✗ No matching worksheet found for referenced sheet names');
  return null;
};

export const ComparatorMiniSOPGenerator: React.FC<ComparatorMiniSOPGeneratorProps> = ({
  serviceName,
  offerTable
}) => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const safeServiceName = serviceName || 'Servicio';

  const fileName = useMemo(() => {
    const sanitized = sanitizeFileName(safeServiceName);
    const date = new Date().toISOString().split('T')[0];
    return sanitized ? `mini-sop-${sanitized}-${date}.xlsx` : `mini-sop-${date}.xlsx`;
  }, [safeServiceName]);

  const handleDownload = async () => {
    setErrorMessage(null);
    setIsDownloading(true);

    try {
      sopLog('=== Starting MiniSOP generation ===');
      sopLog('Service:', safeServiceName);
      sopLog('Offer table:', offerTable);

      sopLog('Step 1: Downloading template from FTP...');
      const response = await fetch(FTP_FILE_URL);
      if (!response.ok) {
        throw new Error(`Failed to download template: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      sopLog('Step 2: Loading workbook...');
      const workbook = new Workbook();
      await workbook.xlsx.load(arrayBuffer);

      sopLog('Step 3: Finding General sheet...');
      const generalSheet = workbook.getWorksheet('General');
      if (!generalSheet) {
        throw new Error('No se encontró la hoja "General" en el archivo base del FTP');
      }

      sopLog('Step 4: Writing prices to General sheet...');
      const updatedCount = writeToGeneralSheet(generalSheet, safeServiceName, offerTable);

      if (updatedCount === 0) {
        throw new Error(
          'No se pudieron escribir precios en la hoja General. Verifica que el servicio existe en el Excel.'
        );
      }

      sopLog('Step 5: Finding service-specific sheet from General references...');
      const serviceSheet = findServiceSheetFromGeneral(generalSheet, workbook, safeServiceName);
      if (!serviceSheet) {
        throw new Error(
          `No se encontró la hoja del servicio "${safeServiceName}" en el Excel. Verifica que la hoja "General" contiene referencias válidas en la columna H para este servicio.`
        );
      }

      sopLog('Step 6: Copying prices to service sheet...');
      const copiedCount = copyPricesToServiceSheet(generalSheet, serviceSheet, safeServiceName);

      if (copiedCount === 0) {
        throw new Error(
          'No se pudieron copiar precios a la hoja del servicio. Verifica las referencias en "General".'
        );
      }

      sopLog('Step 7: Hiding all sheets except the service sheet...');
      const serviceSheetName = serviceSheet.name;

      let hiddenCount = 0;
      workbook.worksheets.forEach(ws => {
        if (ws.name === serviceSheetName) {
          ws.state = 'visible';
          sopLog(`  ✓ Keeping visible: "${ws.name}"`);
        } else {
          ws.state = 'hidden';
          hiddenCount++;
          sopLog(`  ○ Hiding: "${ws.name}"`);
        }
      });

      sopLog(`  Hidden ${hiddenCount} sheets, keeping "${serviceSheetName}" visible`);

      sopLog('Step 8: Setting service sheet as active sheet...');
      workbook.views = [{ activeTab: workbook.worksheets.findIndex(ws => ws.name === serviceSheetName) }];

      sopLog('Step 9: Generating Excel buffer from modified workbook...');
      const buffer = await workbook.xlsx.writeBuffer();

      sopLog('Step 10: Downloading file...');
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);

      trackMiniSOPDownload(user?.id);

      sopLog('=== MiniSOP generation complete ===');
      setIsModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido al generar MiniSOP';
      console.error('MiniSOP export failed:', error);
      setErrorMessage(message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-semibold shadow hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500"
      >
        <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
        Generar MiniSOP
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Generar MiniSOP del Comparador</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Se generará un Excel con la hoja del servicio <span className="font-semibold">«{safeServiceName}»</span> correspondiente a los precios mostrados.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setErrorMessage(null);
                }}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Cerrar"
                disabled={isDownloading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-md bg-blue-50 border border-blue-100 px-4 py-3 space-y-2">
              <p className="text-sm text-blue-900">
                <strong>Proceso:</strong>
              </p>
              <ol className="text-sm text-blue-900 list-decimal list-inside space-y-1">
                <li>Se procederá a la creación de una hoja SOP</li>
                <li>Revisa los precios en el panel "Precios a Ofrecer"</li>
                <li>El sistema copiará los precios a la hoja específica</li>
                <li>Se generará un Excel con solo esa hoja</li>
                <li>Puedes repetir el proceso con otros servicios y unificar después desde Excel para obtener un SOP completamente personalizado servicio a servicio</li>
              </ol>
            </div>

            {errorMessage && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-900">
                  <p className="font-semibold">Error al generar MiniSOP:</p>
                  <p className="mt-1">{errorMessage}</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setErrorMessage(null);
                }}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                disabled={isDownloading}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar MiniSOP
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ComparatorMiniSOPGenerator;
