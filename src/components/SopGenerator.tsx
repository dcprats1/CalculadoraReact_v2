import React, { useEffect, useMemo, useState } from 'react';
import { X, Loader2, FileSpreadsheet, FileText, AlertCircle } from 'lucide-react';
import { Tariff } from '../lib/supabase';
import { calculateCostBreakdown } from '../utils/calculations';

// Definiciones de tipos
type CommissionType = 'percentage' | 'fixed';
interface SopFormData {
  clientName: string;
  agencyNameNumber: string;
  agencyAddress: string;
  cpAndTown: string;
  province: string;
  contactEmail: string;
  validityFrom: string;
  validityTo: string;
  commissionType: CommissionType;
  commissionPercent: string;
  commissionMinimum: string;
  commissionFixed: string;
}
interface VirtualTariffEntry {
  totalCost: number;
  pvp: number;
}
type VirtualTariffTable = Map<string, VirtualTariffEntry>;
interface SopGeneratorProps {
  open: boolean;
  onClose: () => void;
  tariffs: Tariff[];
  marginPercentage: number;
  energySurchargePct: number;
  climateProtectPct: number;
  optionalInsurancePct: number;
}

const SOP_TEMPLATE_URL = 'https://www.logicalogistica.com/area-privada/base%20SOP%20FTP.xlsx';

const RANGE_FIELD_KEYS = [
  // ... (KEYS array is unchanged)
  'provincial_sal',
  'provincial_rec',
  'provincial_int',
  'regional_sal',
  'regional_rec',
  'regional_int',
  'nacional_sal',
  'nacional_rec',
  'nacional_int',
  'portugal_sal',
  'portugal_rec',
  'portugal_int',
  'andorra_sal',
  'andorra_rec',
  'andorra_int',
  'gibraltar_sal',
  'gibraltar_rec',
  'gibraltar_int',
  'madeira_mayores_sal',
  'madeira_mayores_rec',
  'madeira_mayores_int',
  'madeira_menores_sal',
  'madeira_menores_rec',
  'madeira_menores_int',
  'azores_mayores_sal',
  'azores_mayores_rec',
  'azores_mayores_int',
  'azores_menores_sal',
  'azores_menores_rec',
  'azores_menores_int',
  'canarias_mayores_sal',
  'canarias_mayores_rec',
  'canarias_mayores_int',
  'canarias_menores_sal',
  'canarias_menores_rec',
  'canarias_menores_int',
  'baleares_mayores_sal',
  'baleares_mayores_rec',
  'baleares_mayores_int',
  'baleares_menores_sal',
  'baleares_menores_rec',
  'baleares_menores_int',
  'ceuta_sal',
  'ceuta_rec',
  'ceuta_int',
  'melilla_sal',
  'melilla_rec',
  'melilla_int'
] as const;

let excelModulePromise: Promise<any> | null = null;
let pdfLibPromise: Promise<any> | null = null;

// --- CORRECCIÓN EXCEL: CAMBIAR VERSIÓN A 4.3.0 ---
const loadExcelModule = () => {
  if (!excelModulePromise) {
    excelModulePromise = import(
      /* @vite-ignore */ 'https://cdn.skypack.dev/exceljs@4.3.0?min' // Se mantuvo el cambio a 4.3.0
    );
  }
  return excelModulePromise;
};
// ------------------------------------------

const loadPdfLib = () => {
  if (!pdfLibPromise) {
    pdfLibPromise = import(
      /* @vite-ignore */ 'https://cdn.skypack.dev/pdf-lib@1.17.1?min'
    );
  }
  return pdfLibPromise;
};

// --- FUNCIONES AUXILIARES ---

function buildTariffKey(
  serviceName: string,
  rangeKey: string,
  weightFrom?: number | null,
  weightTo?: number | null
): string {
  const normalizedFrom = Number.isFinite(weightFrom) ? Number(weightFrom) : 0;
  const normalizedTo = Number.isFinite(weightTo) ? Number(weightTo) : 999;
  return `${serviceName}__${rangeKey}__${normalizedFrom}__${normalizedTo}`;
}

function parseNumeric(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const normalized = Number(value.replace(',', '.'));
    return Number.isFinite(normalized) ? normalized : null;
  }
  if (typeof value === 'object') {
    const candidate = value as Record<string, unknown>;
    if (candidate.result !== undefined) {
      return parseNumeric(candidate.result);
    }
    if (candidate.text !== undefined) {
      return parseNumeric(candidate.text);
    }
    if (Array.isArray(candidate.richText)) {
      const concatenated = candidate.richText
        .map(item => (typeof item?.text === 'string' ? item.text : ''))
        .join('');
      return parseNumeric(concatenated);
    }
  }
  return null;
}

function extractText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'object') {
    const candidate = value as Record<string, unknown>;
    if (candidate.text !== undefined) {
      return extractText(candidate.text);
    }
    if (candidate.result !== undefined) {
      return extractText(candidate.result);
    }
    if (Array.isArray(candidate.richText)) {
      return candidate.richText
        .map(item => (typeof item?.text === 'string' ? item.text : ''))
        .join('')
        .trim();
    }
  }
  return '';
}

/**
 * Corrige el error "tariffs is not iterable" asegurando que tariffs sea un array.
 */
function buildVirtualTariffTable(tariffs: Tariff[], marginPercentage: number): VirtualTariffTable {
  const marginFactor = 1 - marginPercentage / 100;
  if (marginFactor <= 0) {
    throw new Error('El margen sobre venta debe ser inferior al 100%.');
  }
  const table: VirtualTariffTable = new Map();

  // ===> CORRECCIÓN PARA "tariffs is not iterable" <===
  // Usamos una guardia para asegurarnos de que tariffs es un array.
  const iterableTariffs = Array.isArray(tariffs) ? tariffs : [];

  for (const tariff of iterableTariffs) {
    for (const field of RANGE_FIELD_KEYS) {
      const rawCost = (tariff as unknown as Record<string, unknown>)[field];
      const numericCost = parseNumeric(rawCost);
      if (numericCost === null || numericCost <= 0) {
        continue;
      }
      const breakdown = calculateCostBreakdown(numericCost, 0, 0, 0, 0, 0, 0, 0, 0);
      const totalCost = breakdown.totalCost;
      const price = totalCost / marginFactor;
      const key = buildTariffKey(
        tariff.service_name,
        field,
        tariff.weight_from,
        tariff.weight_to ?? 999
      );
      table.set(key, {
        totalCost,
        pvp: price
      });
    }
  }

  return table;
}

async function applyVirtualTableToWorkbook(
  workbook: any,
  virtualTable: VirtualTariffTable
): Promise<void> {
  const sheet = workbook.getWorksheet('General');
  if (!sheet) {
    throw new Error("La hoja 'General' no está disponible en la plantilla descargada.");
  }

  sheet.eachRow({ includeEmpty: false }, (row: any, rowNumber: number) => {
    if (rowNumber === 1) {
      return;
    }

    const weightFrom = parseNumeric(row.getCell('A').value) ?? 0;
    const weightTo = parseNumeric(row.getCell('F').value) ?? 999;
    const serviceName = extractText(row.getCell('C').value);
    const range = extractText(row.getCell('D').value);

    if (!serviceName || !range) {
      return;
    }

    const key = buildTariffKey(serviceName, range, weightFrom, weightTo);
    const entry = virtualTable.get(key);

    if (entry) {
      row.getCell('G').value = Number(entry.pvp.toFixed(2));
    }
  });
}

function applyAdditionalInformation(
  workbook: any,
  data: SopFormData,
  optionalInsurancePct: number,
  energySurchargePct: number,
  climateProtectPct: number
): void {
  const expressSheet = workbook.getWorksheet('Express 8_30');
  if (expressSheet) {
    expressSheet.getCell('H7').value = data.clientName || '';
    const agencyCellValue = data.validityFrom
      ? `${data.agencyNameNumber || ''}${data.agencyNameNumber ? ' | ' : ''}Validez desde: ${data.validityFrom}`
      : data.agencyNameNumber || '';
    expressSheet.getCell('C7').value = agencyCellValue;
    expressSheet.getCell('H8').value = data.validityTo || '';

    if (data.commissionType === 'percentage') {
      expressSheet.getCell('D41').value = data.commissionPercent
        ? Number(data.commissionPercent)
        : 0;
      expressSheet.getCell('D42').value = data.commissionMinimum
        ? Number(data.commissionMinimum)
        : 0;
    } else {
      expressSheet.getCell('D41').value = '—';
      expressSheet.getCell('D42').value = data.commissionFixed
        ? Number(data.commissionFixed)
        : 0;
    }

    expressSheet.getCell('D43').value = optionalInsurancePct;
  }

  const closingSheet = workbook.getWorksheet('cierre personalizado');
  if (closingSheet) {
    closingSheet.getCell('E43').value = data.agencyAddress || '';
    closingSheet.getCell('E44').value = data.cpAndTown || '';
    closingSheet.getCell('E45').value = data.province || '';
    closingSheet.getCell('E46').value = data.contactEmail || '';
  }

  const additionalCostsSheet = workbook.getWorksheet('Costes_Adicionales');
  if (additionalCostsSheet) {
    additionalCostsSheet.getCell('G5').value = energySurchargePct;
    additionalCostsSheet.getCell('G7').value = climateProtectPct;
  }

  workbook.calcProperties.fullCalcOnLoad = true;
}

function removeGeneralSheet(workbook: any): void {
  const sheet = workbook.getWorksheet('General');
  if (sheet) {
    workbook.removeWorksheet(sheet.id);
  }
}

// --- CORRECCIÓN [OBJECT OBJECT]: FUNCIÓN PARA APLANAR FÓRMULAS ---
function flattenFormulas(workbook: any): void {
  workbook.worksheets.forEach((worksheet: any) => {
    worksheet.eachRow((row: any) => {
      row.eachCell((cell: any) => {
        // Verifica si es una fórmula (compartida o no)
        if (cell.value && typeof cell.value === 'object' && ('formula' in cell.value || 'sharedFormula' in cell.value)) {
          const resultValue = cell.value?.result;
          // Reemplaza la fórmula por su resultado (o null si no hay resultado)
          cell.value = resultValue !== undefined && resultValue !== null ? resultValue : null;
        }
      });
    });
  });
}
// -----------------------------------------------------------------

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function wrapText(content: string, maxChars: number): string[] {
  if (!content) {
    return [''];
  }
  const words = content.split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [''];
  }
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + word).length + 1 > maxChars) {
      if (currentLine.trim().length > 0) {
        lines.push(currentLine.trim());
      }
      currentLine = `${word} `;
    } else {
      currentLine += `${word} `;
    }
  });

  if (currentLine.trim().length > 0) {
    lines.push(currentLine.trim());
  }

  return lines.length ? lines : [''];
}

/*
 * NOTA IMPORTANTE: Se ELIMINA el uso de esta función en el componente
 * para usar window.print() en su lugar, ya que esta función NO PUEDE
 * procesar gráficos ni el diseño complejo del Excel.
 * La dejo aquí solo para referencia, pero no se usará.
async function createPdfFromWorkbook(workbook: any, sheetNames: string[]): Promise<Blob> {
  // ... (código inalterado)
}
*/

const currentYear = new Date().getFullYear();

// --- COMPONENTE PRINCIPAL: SopGenerator ---

const SopGenerator: React.FC<SopGeneratorProps> = ({
  open,
  onClose,
  tariffs,
  marginPercentage,
  energySurchargePct,
  climateProtectPct,
  optionalInsurancePct
}) => {
  const [templateBuffer, setTemplateBuffer] = useState<ArrayBuffer | null>(null);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<SopFormData>({
    clientName: '',
    agencyNameNumber: '',
    agencyAddress: '',
    cpAndTown: '',
    province: '',
    contactEmail: '',
    validityFrom: '',
    validityTo: `31/12/${currentYear}`,
    commissionType: 'percentage',
    commissionPercent: '',
    commissionMinimum: '',
    commissionFixed: ''
  });

  const marginAlert = useMemo(() => {
    return marginPercentage >= 100;
  }, [marginPercentage]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const loadTemplate = async () => {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      try {
        const response = await fetch(SOP_TEMPLATE_URL, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('No se pudo descargar la plantilla desde el FTP.');
        }
        const buffer = await response.arrayBuffer();
        const excelModule = await loadExcelModule();
        const workbook = new excelModule.Workbook();
        await workbook.xlsx.load(buffer);
        const sheetNames = workbook.worksheets
          .map((sheet: any) => sheet.name)
          .filter((name: string) => name !== 'General');

        if (!cancelled) {
          setTemplateBuffer(buffer);
          setAvailableSheets(sheetNames);
          setSelectedSheets(sheetNames);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            (err as Error)?.message ||
              'No fue posible cargar la plantilla del SOP. Verifica la conexión y vuelve a intentarlo.'
          );
          setTemplateBuffer(null);
          setAvailableSheets([]);
          setSelectedSheets([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadTemplate();

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setSuccessMessage(null);
    }
  }, [open]);

  const handleInputChange = (field: keyof SopFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCommissionTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as CommissionType;
    setFormData(prev => ({ ...prev, commissionType: value }));
  };

  const toggleSheetSelection = (sheetName: string) => {
    setSelectedSheets(prev => {
      if (prev.includes(sheetName)) {
        return prev.filter(name => name !== sheetName);
      }
      return [...prev, sheetName];
    });
  };

  const resetMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const prepareWorkbook = async (): Promise<ArrayBuffer> => {
    if (!templateBuffer) {
      throw new Error('La plantilla del SOP no está disponible.');
    }

    // Validación de array (opcional, la corrección está en buildVirtualTariffTable, pero es buena práctica)
    if (!Array.isArray(tariffs) || !tariffs.length) {
      throw new Error('No hay tarifas disponibles para construir la tabla virtual.');
    }

    const virtualTable = buildVirtualTariffTable(tariffs, marginPercentage);
    const excelModule = await loadExcelModule();
    const workbook = new excelModule.Workbook();
    await workbook.xlsx.load(templateBuffer.slice(0));

    await applyVirtualTableToWorkbook(workbook, virtualTable);
    applyAdditionalInformation(
      workbook,
      formData,
      optionalInsurancePct,
      energySurchargePct,
      climateProtectPct
    );

    return workbook.xlsx.writeBuffer();
  };

  const handleDownloadExcel = async () => {
    resetMessages();

    if (marginAlert) {
      setError('El margen sobre venta debe ser inferior al 100% para generar el SOP.');
      return;
    }

    setLoading(true);
    try {
      const baseBuffer = await prepareWorkbook();
      const excelModule = await loadExcelModule();
      const workbook = new excelModule.Workbook();
      await workbook.xlsx.load(baseBuffer);

      removeGeneralSheet(workbook);
      // ===> CORRECCIÓN CLAVE: Aplanar fórmulas para el Excel final <===
      flattenFormulas(workbook);

      const finalBuffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([finalBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const timestamp = new Date().toISOString().split('T')[0];
      triggerDownload(blob, `SOP_${timestamp}.xlsx`);
      setSuccessMessage('Archivo Excel generado correctamente.');
    } catch (err) {
      setError((err as Error)?.message || 'No se pudo generar el archivo Excel.');
    } finally {
      setLoading(false);
    }
  };

  // --- CAMBIO CLAVE: REEMPLAZAR GENERACIÓN DE PDF PROGRAMÁTICA POR window.print() ---
  const handlePrintView = () => {
    resetMessages();
    // Usa la función nativa del navegador para imprimir la vista actual como PDF.
    // Esto es lo mejor para conservar el diseño y los gráficos que se muestren en el componente.
    window.print();
    setSuccessMessage('Se ha iniciado el proceso de impresión. Elige "Guardar como PDF" en el destino.');
  };
  // ----------------------------------------------------------------------------------

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Generar documentación SOP</h2>
            <p className="text-sm text-gray-500">
              Se construirá una tabla virtual aplicando el margen sobre venta actual y se rellenará la hoja
              “General” del modelo Excel sin modificar la base de datos de Supabase.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {marginAlert && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <p>
                El margen sobre venta debe ser inferior al 100%. Ajusta el valor en el dashboard antes de generar el SOP.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm">
              {successMessage}
            </div>
          )}

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre del cliente / tarifa (Express 8_30!H7)</label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={handleInputChange('clientName')}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre y nº de agencia (Express 8_30!C7)</label>
                <input
                  type="text"
                  value={formData.agencyNameNumber}
                  onChange={handleInputChange('agencyNameNumber')}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Dirección de la agencia (cierre personalizado!E43)</label>
                <input
                  type="text"
                  value={formData.agencyAddress}
                  onChange={handleInputChange('agencyAddress')}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">CP & Población (cierre personalizado!E44)</label>
                <input
                  type="text"
                  value={formData.cpAndTown}
                  onChange={handleInputChange('cpAndTown')}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Provincia (cierre personalizado!E45)</label>
                <input
                  type="text"
                  value={formData.province}
                  onChange={handleInputChange('province')}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email de contacto (cierre personalizado!E46)</label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={handleInputChange('contactEmail')}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Validez desde (Express 8_30)</label>
                  <input
                    type="text"
                    value={formData.validityFrom}
                    placeholder="DD/MM/AAAA"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Validez hasta (Express 8_30!H8)</label>
                  <input
                    type="text"
                    value={formData.validityTo}
                    placeholder={`31/12/${currentYear}`}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <fieldset className="border border-gray-200 rounded-lg p-3">
                <legend className="px-1 text-sm font-semibold text-gray-700">Comisión de reembolsos</legend>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center text-sm text-gray-700">
                    <input
                      type="radio"
                      name="commissionType"
                      value="percentage"
                      checked={formData.commissionType === 'percentage'}
                      onChange={handleCommissionTypeChange}
                      className="mr-2"
                    />
                    Porcentaje + importe mínimo (Express 8_30!D41 / D42)
                  </label>
                  <label className="inline-flex items-center text-sm text-gray-700">
                    <input
                      type="radio"
                      name="commissionType"
                      value="fixed"
                      checked={formData.commissionType === 'fixed'}
                      onChange={handleCommissionTypeChange}
                      className="mr-2"
                    />
                    Importe fijo en € (Express 8_30!D42)
                  </label>
                  {formData.commissionType === 'percentage' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600">% Comisión</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.commissionPercent}
                          onChange={handleInputChange('commissionPercent')}
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Importe mínimo (€)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.commissionMinimum}
                          onChange={handleInputChange('commissionMinimum')}
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Importe fijo (€)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.commissionFixed}
                        onChange={handleInputChange('commissionFixed')}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              </fieldset>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900 space-y-1">
                <p><span className="font-semibold">Suplemento de energía:</span> {energySurchargePct}% (Costes_Adicionales!G5)</p>
                <p><span className="font-semibold">Climate Protect:</span> {climateProtectPct}% (Costes_Adicionales!G7)</p>
                <p><span className="font-semibold">Seguro Opcional:</span> {optionalInsurancePct}% (Express 8_30!D43)</p>
              </div>
            </div>
          </section>

          <section>
            {/* Se deja el selector de hojas aquí, aunque solo sirve de referencia para el Excel */}
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Hojas disponibles (solo para referencia en el PDF)</h3>
            {availableSheets.length === 0 ? (
              <p className="text-sm text-gray-500">Carga pendiente o sin hojas disponibles (la hoja “General” nunca se incluye).</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {availableSheets.map(sheet => {
                  const checked = selectedSheets.includes(sheet);
                  return (
                    <label
                      key={sheet}
                      className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                        checked ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 hover:border-blue-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSheetSelection(sheet)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{sheet}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-gray-500">
            <p>El PVP se calcula sobre la suma de todos los conceptos de la tabla de costes (sin incrementos ni ajustes adicionales).</p>
            <p className="mt-1 font-semibold text-gray-600">
              Para obtener el diseño de Excel con gráficos, descarga el Excel y usa la función "Imprimir a PDF" en Microsoft Excel.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={loading || marginAlert}
              className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:bg-green-200 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              Descargar Excel
            </button>
            <button
              type="button"
              onClick={handlePrintView} // Se cambió de handleDownloadPdf a handlePrintView
              disabled={loading || marginAlert}
              className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:bg-purple-200 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Imprimir Vista (PDF)
            </button>
          </div>
        </div>
      </div>
      </div>
  );
};

export default SopGenerator;
