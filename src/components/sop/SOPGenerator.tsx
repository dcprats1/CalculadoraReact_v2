import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Workbook } from 'exceljs';
import { Tariff, DiscountPlan, supabase } from '../../lib/supabase';
import { buildVirtualTariffTable } from '../../utils/calculations';
import { getPlanGroupKey, getCustomPlanMessage } from '../../utils/customPlans';
import {
  InternationalTariff,
  normalizeInternationalDestination,
  buildInternationalValueMap,
  createInternationalMapKey
} from '../../utils/internationalSopHelpers';
import { usePreferences } from '../../contexts/PreferencesContext';
import { trackSOPDownload } from '../../utils/tracking';
import { useAuth } from '../../contexts/AuthContext';

const SOP_LOG_ENABLED =
  typeof import.meta !== 'undefined' &&
  typeof import.meta.env !== 'undefined' &&
  Boolean(import.meta.env.DEV);

const sopLog = (...args: unknown[]) => {
  if (SOP_LOG_ENABLED) {
    console.log('[SOP]', ...args);
  }
};

interface SOPGeneratorProps {
  tariffs: Tariff[];
  marginPercentage: number;
  discountPlans: DiscountPlan[];
  selectedPlanGroup: string;
  linearDiscount: number;
  spc: number;
  variableSurcharge: number;
  irregularSurcharge: number;
  increment2026: number;
  selectedService: string;
  provincialCostOverride: number | null;
  disabled?: boolean;
}

const SERVICE_NAME_ALIASES: Record<string, string> = {
  'express 8 30': 'Urg8:30H Courier',
  'express 830': 'Urg8:30H Courier',
  'express8 30': 'Urg8:30H Courier',
  'express 10 30': 'Urg10H Courier',
  'express 1030': 'Urg10H Courier',
  'express10 30': 'Urg10H Courier',
  'express 14 00': 'Urg14H Courier',
  'express 1400': 'Urg14H Courier',
  'express14 00': 'Urg14H Courier',
  'express 19 00': 'Urg19H Courier',
  'express 1900': 'Urg19H Courier',
  'express19 00': 'Urg19H Courier',
  'business parcel': 'Business Parcel',
  'economy parcel': 'Economy Parcel',
  'maritimo': 'Marítimo',
  'maritimo maritimo': 'Marítimo',
  'parcel shop': 'Parcel Shop',
  'eurobusiness parcel': 'EuroBusiness Parcel'
};

type FormState = {
  clientName: string;
  agencyNameNumber: string;
  agencyAddress: string;
  agencyPostalTown: string;
  agencyProvince: string;
  agencyEmail: string;
  validFrom: string;
  validTo: string;
  reimbursementPercent: string;
  reimbursementMinimum: string;
  reimbursementFixed: string;
  reimbursementMax: string;
  energySurcharge: string;
  climateProtect: string;
  optionalInsurance: string;
};

const FTP_FILE_URL = 'https://www.logicalogistica.com/area-privada/base%20SOP%20FTP.xlsx';

type ModeSuffix = 'sal' | 'rec' | 'int';

const BASE_RANGE_ALIASES: Record<string, string> = {
  provincial: 'provincial',
  prov: 'provincial',
  regional: 'regional',
  reg: 'regional',
  nacional: 'nacional',
  nacional_: 'nacional',
  pen: 'nacional',
  peninsula: 'nacional',
  portugal: 'portugal',
  port: 'portugal',
  andorra: 'andorra',
  gibraltar: 'gibraltar',
  canarias_mayores: 'canarias_mayores',
  can_my: 'canarias_mayores',
  canarias_menores: 'canarias_menores',
  can_mn: 'canarias_menores',
  baleares_mayores: 'baleares_mayores',
  bal_my: 'baleares_mayores',
  baleares_menores: 'baleares_menores',
  bal_mn: 'baleares_menores',
  ceuta: 'ceuta',
  melilla: 'melilla',
  madeira_mayores: 'madeira_mayores',
  madeira_mayores_maritimo: 'madeira_mayores',
  madeiramayores: 'madeira_mayores',
  madeiramayoresmaritimo: 'madeira_mayores',
  mad_my: 'madeira_mayores',
  madeira_menores: 'madeira_menores',
  madeira_menores_maritimo: 'madeira_menores',
  madeiramenores: 'madeira_menores',
  madeiramenoresmaritimo: 'madeira_menores',
  mad_mn: 'madeira_menores',
  azores_mayores: 'azores_mayores',
  azores_mayores_maritimo: 'azores_mayores',
  azoresmayores: 'azores_mayores',
  azoresmayoresmaritimo: 'azores_mayores',
  az_my: 'azores_mayores',
  azores_menores: 'azores_menores',
  azores_menores_maritimo: 'azores_menores',
  azoresmenores: 'azores_menores',
  azoresmenoresmaritimo: 'azores_menores',
  az_mn: 'azores_menores'
};

const DEFAULT_FORM: FormState = {
  clientName: '',
  agencyNameNumber: '',
  agencyAddress: '',
  agencyPostalTown: '',
  agencyProvince: '',
  agencyEmail: '',
  validFrom: '',
  validTo: '',
  reimbursementPercent: '',
  reimbursementMinimum: '',
  reimbursementFixed: '',
  reimbursementMax: '',
  energySurcharge: '7.50',
  climateProtect: '1.5',
  optionalInsurance: '8',
};

const createServiceKey = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const resolveExcelServiceKey = (raw: string): string | null => {
  const normalized = createServiceKey(raw);
  if (!normalized) {
    return null;
  }

  const aliasTarget = SERVICE_NAME_ALIASES[normalized];
  const resolved = aliasTarget ?? raw;
  const canonical = createServiceKey(resolved);
  return canonical || null;
};

const formatWeightKey = (value: number | null): string => {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toString();
};

const createTariffMapKey = (
  serviceName: string,
  zoneKey: string,
  weightFrom: number,
  weightTo: number | null
): string => {
  return `${createServiceKey(serviceName)}|${zoneKey}|${formatWeightKey(weightFrom)}|${formatWeightKey(weightTo)}`;
};

function normalizeRangeName(range: string): string | null {
  if (!range) {
    return null;
  }

  const normalized = range
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  let suffix: ModeSuffix = 'sal';
  let baseCandidate = normalized;

  const explicitSuffix = baseCandidate.match(/_(sal|rec|int)$/);
  if (explicitSuffix) {
    suffix = explicitSuffix[1] as ModeSuffix;
    baseCandidate = baseCandidate.slice(0, -explicitSuffix[0].length);
  } else {
    if (/_recogida?/.test(baseCandidate) || /_rec\b/.test(baseCandidate)) {
      suffix = 'rec';
      baseCandidate = baseCandidate.replace(/_recogida?/, '').replace(/_rec\b/, '');
    } else if (/_interciudad/.test(baseCandidate) || /_inter/.test(baseCandidate) || /_int$/.test(baseCandidate)) {
      suffix = 'int';
      baseCandidate = baseCandidate
        .replace(/_interciudad/, '')
        .replace(/_inter/, '')
        .replace(/_int$/, '');
    } else if (/_salida/.test(baseCandidate)) {
      suffix = 'sal';
      baseCandidate = baseCandidate.replace(/_salida/, '');
    }
  }

  baseCandidate = baseCandidate.replace(/_+/g, '_').replace(/^_|_$/g, '');

  const lookupKeys = [
    baseCandidate,
    baseCandidate.replace(/_/g, ' '),
    baseCandidate.replace(/_/g, '')
  ];

  const base = lookupKeys.reduce<string | null>((acc, key) => {
    if (acc) return acc;
    return BASE_RANGE_ALIASES[key] ?? null;
  }, null);

  if (!base) {
    return null;
  }

  return `${base}_${suffix}`;
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isNaN(value) ? null : value;
  if (typeof value === 'object' && value !== null && 'result' in (value as any)) {
    const result = (value as any).result;
    return parseNumber(result);
  }
  const str = String(value).replace(/[^0-9.,-]/g, '').replace(',', '.');
  const parsed = Number(str);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseWeightBound(value: unknown, bound: 'from' | 'to'): number | null {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized.includes('kg') && normalized.includes('adc')) {
      return bound === 'to' ? 999 : parseNumber(value) ?? 15;
    }
  }

  return parseNumber(value);
}

function downloadBuffer(buffer: ArrayBuffer | Uint8Array, filename: string, mimeType: string) {
  const blob = buffer instanceof ArrayBuffer ? new Blob([buffer], { type: mimeType }) : new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const SOPGenerator: React.FC<SOPGeneratorProps> = ({
  tariffs,
  marginPercentage,
  discountPlans,
  selectedPlanGroup,
  linearDiscount,
  spc,
  variableSurcharge,
  irregularSurcharge,
  increment2026,
  selectedService,
  provincialCostOverride,
  disabled
}) => {
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const safeTariffs = Array.isArray(tariffs) ? tariffs : [];
  const safeDiscountPlans = useMemo(
    () => (Array.isArray(discountPlans) ? discountPlans : []),
    [discountPlans]
  );
  const computedDisabled = disabled || safeTariffs.length === 0;
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [loadingBase, setLoadingBase] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [workbookBuffer, setWorkbookBuffer] = useState<ArrayBuffer | null>(null);
  const [localPlanGroup, setLocalPlanGroup] = useState<string>(selectedPlanGroup);
  const [planMessage, setPlanMessage] = useState<string | null>(null);
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [internationalTariffs, setInternationalTariffs] = useState<InternationalTariff[]>([]);

  const isReady = !!workbookBuffer;

  const planGroups = useMemo(() => {
    const entries = new Map<string, string>();
    safeDiscountPlans.forEach(plan => {
      const key = getPlanGroupKey(plan);
      if (!entries.has(key)) {
        entries.set(key, plan.plan_name);
      }
    });
    return Array.from(entries.entries());
  }, [safeDiscountPlans]);

  const planSelectValue = planGroups.some(([key]) => key === localPlanGroup)
    ? localPlanGroup
    : '';

  const reimbursementPercentLocked = form.reimbursementFixed.trim() !== '';
  const reimbursementFixedLocked = form.reimbursementPercent.trim() !== '';

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      return;
    }

    const fetchWorkbook = async () => {
      setLoadingBase(true);
      setError(null);
      try {
        const response = await fetch(FTP_FILE_URL);
        if (!response.ok) {
          throw new Error('No se pudo descargar el modelo SOP desde el FTP corporativo.');
        }
        const buffer = await response.arrayBuffer();
        setWorkbookBuffer(buffer);

        const workbook = new Workbook();
        await workbook.xlsx.load(buffer);
        if (!workbook.getWorksheet('General')) {
          throw new Error("La plantilla descargada no contiene la hoja 'General'.");
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'No se pudo preparar el modelo SOP.');
      } finally {
        setLoadingBase(false);
      }
    };

    const fetchInternationalTariffs = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('tariffs_international_europe')
          .select('id, service_name, country, weight_from, weight_to, cost')
          .order('country', { ascending: true })
          .order('weight_from', { ascending: true });

        if (fetchError) {
          sopLog('international-tariffs:error', fetchError.message);
          return;
        }

        if (data && data.length > 0) {
          setInternationalTariffs(data as InternationalTariff[]);
          sopLog('international-tariffs:loaded', { count: data.length });
        }
      } catch (err) {
        sopLog('international-tariffs:error', err instanceof Error ? err.message : 'Error desconocido');
      }
    };

    void fetchWorkbook();
    void fetchInternationalTariffs();
  }, [isOpen]);

  const handleOpen = () => {
    if (computedDisabled) return;

    if (preferences) {
      const preloadedData: FormState = {
        ...DEFAULT_FORM,
        agencyNameNumber: preferences.agency_name_number || '',
        agencyAddress: preferences.agency_address || '',
        agencyPostalTown: preferences.agency_postal_town || '',
        agencyProvince: preferences.agency_province || '',
        agencyEmail: preferences.agency_email || '',
      };

      const hasPreloadedData = !!(
        preferences.agency_name_number ||
        preferences.agency_address ||
        preferences.agency_postal_town ||
        preferences.agency_province ||
        preferences.agency_email
      );

      setForm(preloadedData);
      setIsPreloaded(hasPreloadedData);
    }

    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setForm(DEFAULT_FORM);
    setWorkbookBuffer(null);
    setError(null);
    setGenerating(false);
    setLoadingBase(false);
    setLocalPlanGroup(selectedPlanGroup);
    setPlanMessage(null);
    setIsPreloaded(false);
    setInternationalTariffs([]);
  };

  useEffect(() => {
    if (isOpen) {
      const available = planGroups.some(([key]) => key === selectedPlanGroup);
      setLocalPlanGroup(available ? selectedPlanGroup : '');
    }
  }, [isOpen, selectedPlanGroup, planGroups]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (!planSelectValue) {
      setPlanMessage(null);
      return;
    }

      const matching = safeDiscountPlans.find(plan => getPlanGroupKey(plan) === planSelectValue);
    if (matching) {
      const message = getCustomPlanMessage(matching.id);
      setPlanMessage(message ?? null);
    } else {
      setPlanMessage(null);
    }
  }, [isOpen, planSelectValue, safeDiscountPlans]);

  const handleFieldChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleReimbursementPercentChange = (value: string) => {
    setForm(prev => ({
      ...prev,
      reimbursementPercent: value,
      reimbursementFixed: value.trim() ? '' : prev.reimbursementFixed
    }));
  };

  const handleReimbursementFixedChange = (value: string) => {
    setForm(prev => ({
      ...prev,
      reimbursementFixed: value,
      reimbursementPercent: value.trim() ? '' : prev.reimbursementPercent
    }));
  };

  const prepareWorkbook = async () => {
    if (!workbookBuffer) throw new Error('Descarga del modelo SOP incompleta.');
    const workbook = new Workbook();
    await workbook.xlsx.load(workbookBuffer.slice(0));
    applyVirtualTableToWorkbook(workbook);
    applyBaseExpData(workbook);
    applyMetadata(workbook);
    workbook.calcProperties.fullCalcOnLoad = true;
    return workbook;
  };

  const applyVirtualTableToWorkbook = (workbook: any) => {
    sopLog('build-table:start', {
      tariffs: safeTariffs.length,
      marginPercentage,
      planGroup: planSelectValue,
      linearDiscount,
      spc,
      variableSurcharge,
      irregularSurcharge,
      increment2026,
      selectedService,
      provincialCostOverride
    });

    const table = buildVirtualTariffTable(safeTariffs, {
      marginPercentage,
      planGroup: planSelectValue,
      discountPlans: safeDiscountPlans,
      linearDiscount: planSelectValue ? 0 : linearDiscount,
      spc,
      variableSurcharge,
      irregularSurcharge,
      increment2026,
      selectedService,
      provincialCostOverride: planSelectValue ? null : provincialCostOverride
    });
    const valueMap = new Map<string, number>();

    table.forEach((row) => {
      const mapKey = createTariffMapKey(
        row.service_name,
        row.zone,
        row.weight_from,
        row.weight_to ?? null
      );
      valueMap.set(mapKey, row.pvp);
    });

    const climateProtectPercent = parseNumber(form.climateProtect) ?? 1.5;
    const internationalValueMap = buildInternationalValueMap(internationalTariffs, {
      marginPercentage,
      climateProtectPercent,
      spc
    });
    sopLog('international-map:built', { entries: internationalValueMap.size, climateProtectPercent, spc });

    const sheet = workbook.getWorksheet('General');
    if (!sheet) {
      throw new Error("La hoja 'General' no está disponible en la plantilla descargada.");
    }

    const writeValueToTargets = (
      row: any,
      finalValue: number,
      serviceName: string,
      zoneOrCountry: string,
      weightFrom: number | null,
      weightTo: number | null
    ) => {
      row.getCell('G').value = finalValue;

      const targetSheetName = String(row.getCell('H').value ?? '').trim();
      const targetCellRef = String(row.getCell('I').value ?? '').trim();

      if (targetSheetName && targetCellRef) {
        const targetSheet = workbook.getWorksheet(targetSheetName);
        if (targetSheet) {
          const targetCell = targetSheet.getCell(targetCellRef);
          targetCell.value = finalValue;
          sopLog('write-target', {
            service: serviceName,
            zone: zoneOrCountry,
            weight_from: weightFrom,
            weight_to: weightTo,
            sheet: targetSheetName,
            cell: targetCellRef,
            value: finalValue
          });
        }
      }

      sopLog('write-row', {
        service: serviceName,
        zone: zoneOrCountry,
        weight_from: weightFrom,
        weight_to: weightTo,
        value: finalValue
      });
    };

    sheet.eachRow((row: any, rowNumber: number) => {
      if (rowNumber === 1) return;

      const rawWeightFrom = row.getCell('A').value;
      const rawWeightTo = row.getCell('F').value;
      const weightFrom = parseWeightBound(rawWeightFrom, 'from');
      const weightTo = parseWeightBound(rawWeightTo, 'to');
      const serviceName = String(row.getCell('C').value ?? '').trim();
      const rangeName = String(row.getCell('D').value ?? '').trim();

      if (!serviceName || weightFrom === null) {
        row.getCell('G').value = null;
        return;
      }

      const zoneKey = normalizeRangeName(rangeName);

      if (!zoneKey) {
        const internationalCountry = normalizeInternationalDestination(rangeName);
        if (internationalCountry && internationalValueMap.size > 0) {
          const intlMapKey = createInternationalMapKey(
            serviceName,
            internationalCountry,
            weightFrom,
            weightTo
          );
          const intlValue = internationalValueMap.get(intlMapKey);

          if (typeof intlValue === 'number') {
            const finalValue = Number(intlValue.toFixed(2));
            writeValueToTargets(row, finalValue, serviceName, internationalCountry, weightFrom, weightTo);
            return;
          }
        }

        row.getCell('G').value = null;
        return;
      }

      const serviceKey = resolveExcelServiceKey(serviceName);
      if (!serviceKey) {
        row.getCell('G').value = null;
        return;
      }

      const mapKey = createTariffMapKey(serviceKey, zoneKey, weightFrom, weightTo);
      const value = valueMap.get(mapKey);
      if (typeof value === 'number') {
        const finalValue = Number(value.toFixed(2));
        writeValueToTargets(row, finalValue, serviceName, zoneKey, weightFrom, weightTo);
      } else {
        row.getCell('G').value = null;
        sopLog('write-row', {
          service: serviceName,
          zone: zoneKey,
          weight_from: weightFrom,
          weight_to: weightTo,
          value: null
        });
      }
    });
  };

  const applyBaseExpData = (workbook: any) => {
    sopLog('base-exp:start', 'Iniciando escritura en hoja base exp');

    const generalSheet = workbook.getWorksheet('General');
    if (!generalSheet) {
      sopLog('base-exp:error', 'La hoja General no está disponible');
      return;
    }

    const baseExpSheet = workbook.getWorksheet('base exp');
    if (!baseExpSheet) {
      sopLog('base-exp:error', 'La hoja base exp no existe en el workbook');
      return;
    }

    let processedCount = 0;
    let skippedCount = 0;

    generalSheet.eachRow((row: any, rowNumber: number) => {
      if (rowNumber === 1) return;

      try {
        const pvpValue = row.getCell('G').value;
        const targetSheetName = String(row.getCell('J').value ?? '').trim();
        const targetCellK = String(row.getCell('K').value ?? '').trim();
        const targetCellL = String(row.getCell('L').value ?? '').trim();

        if (!targetSheetName || targetSheetName.toLowerCase() !== 'base exp') {
          return;
        }

        const numericPvp = parseNumber(pvpValue);
        if (numericPvp === null) {
          skippedCount++;
          sopLog('base-exp:skip-row', {
            row: rowNumber,
            reason: 'Valor PVP no numérico',
            pvpValue
          });
          return;
        }

        if (!targetCellK || !targetCellL) {
          skippedCount++;
          sopLog('base-exp:skip-row', {
            row: rowNumber,
            reason: 'Celdas K o L vacías',
            cellK: targetCellK,
            cellL: targetCellL
          });
          return;
        }

        const finalValue = Number(numericPvp.toFixed(2));

        const cellK = baseExpSheet.getCell(targetCellK);
        const cellL = baseExpSheet.getCell(targetCellL);

        cellK.value = finalValue;
        cellL.value = finalValue;

        processedCount++;

        const serviceName = String(row.getCell('C').value ?? '').trim();
        const rangeName = String(row.getCell('D').value ?? '').trim();
        const weightFrom = row.getCell('A').value;
        const weightTo = row.getCell('F').value;

        sopLog('base-exp:write-success', {
          row: rowNumber,
          service: serviceName,
          zone: rangeName,
          weight_from: weightFrom,
          weight_to: weightTo,
          pvp: finalValue,
          cellK: targetCellK,
          cellL: targetCellL
        });

      } catch (error) {
        skippedCount++;
        sopLog('base-exp:write-error', {
          row: rowNumber,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    sopLog('base-exp:complete', {
      totalProcessed: processedCount,
      totalSkipped: skippedCount
    });
  };

  const applyMetadata = (workbook: any) => {
    const resolveWorksheet = (rawName: string) => {
      const candidates = [rawName];
      if (rawName.startsWith('_')) {
        candidates.push(rawName.slice(1));
      }
      if (rawName.includes('Retun')) {
        candidates.push(rawName.replace('Retun', 'Return'));
      }
      if (rawName.includes('(martitimo)')) {
        candidates.push(rawName.replace('(martitimo)', '(maritimo)'));
        candidates.push(rawName.replace('(martitimo)', '(marítimo)'));
      }
      if (rawName.includes('(maritimo)')) {
        candidates.push(rawName.replace('(maritimo)', '(marítimo)'));
      }
      return candidates.reduce<any>((found, name) => found ?? workbook.getWorksheet(name), null);
    };

    const writeValue = (
      targets: Array<{ sheet: string; cell: string }>,
      value: string | number | null,
      options?: { percent?: boolean; currency?: boolean }
    ) => {
      targets.forEach(({ sheet, cell }) => {
        const ws = resolveWorksheet(sheet);
        if (!ws) return;
        const excelCell = ws.getCell(cell);
        if (options?.percent) {
          if (value === null || value === '') {
            excelCell.value = null;
          } else {
            const numeric = typeof value === 'number' ? value : parseNumber(value);
            if (numeric === null) {
              excelCell.value = null;
            } else {
              excelCell.value = Number((numeric / 100).toFixed(6));
              excelCell.numFmt = '0.00%';
            }
          }
          return;
        }

        if (value === null || value === '') {
          excelCell.value = '';
        } else {
          excelCell.value = value;
        }
      });
    };

    const todayIso = new Date().toISOString().slice(0, 10);
    const endOfYear = new Date();
    endOfYear.setMonth(11, 31);
    const endOfYearIso = endOfYear.toISOString().slice(0, 10);

    const validFromValue = form.validFrom || todayIso;
    const validToValue = form.validTo || endOfYearIso;

    const reimbursementPercent = parseNumber(form.reimbursementPercent);
    const reimbursementMinimum = parseNumber(form.reimbursementMinimum);
    const reimbursementMax = parseNumber(form.reimbursementMax);
    const reimbursementFixed = parseNumber(form.reimbursementFixed);
    const optionalInsurance = parseNumber(form.optionalInsurance);
    const energy = parseNumber(form.energySurcharge);
    const climate = parseNumber(form.climateProtect);

    const clientTargets = [
      { sheet: 'Express 8_30', cell: 'H7' },
      { sheet: 'Express 10_30', cell: 'H7' },
      { sheet: 'Express 14.00', cell: 'H7' },
      { sheet: 'Express19.00', cell: 'L9' },
      { sheet: 'BusinessParcel', cell: 'L9' },
      { sheet: 'BusinessParcel_Tránsito', cell: 'H9' },
      { sheet: '_EconomyParcel', cell: 'H9' },
      { sheet: '_EconomyParcel (martitimo)', cell: 'H9' },
      { sheet: 'EconomyParcel (maritimo)', cell: 'H9' },
      { sheet: 'ShopDeliveryService & ShopRetun', cell: 'H6' },
      { sheet: 'EuroBusinessParcel', cell: 'P4' }
    ];
    writeValue(clientTargets, form.clientName || '');

    const agencyTargets = [
      { sheet: 'Express 8_30', cell: 'C7' },
      { sheet: 'Express 10_30', cell: 'C7' },
      { sheet: 'Express 14.00', cell: 'C7' },
      { sheet: 'Express19.00', cell: 'D9' },
      { sheet: 'BusinessParcel', cell: 'D9' },
      { sheet: 'BusinessParcel_Tránsito', cell: 'D9' },
      { sheet: '_EconomyParcel', cell: 'D9' },
      { sheet: '_EconomyParcel (martitimo)', cell: 'D9' },
      { sheet: 'EconomyParcel (maritimo)', cell: 'D9' },
      { sheet: 'ShopDeliveryService & ShopRetun', cell: 'C6' },
      { sheet: 'EuroBusinessParcel', cell: 'F4' }
    ];
    writeValue(agencyTargets, form.agencyNameNumber || '');

    const validFromTargets = [
      { sheet: 'Express 8_30', cell: 'C8' },
      { sheet: 'Express 10_30', cell: 'C8' },
      { sheet: 'Express 14.00', cell: 'C8' },
      { sheet: 'Express19.00', cell: 'D10' },
      { sheet: 'BusinessParcel', cell: 'D10' },
      { sheet: 'BusinessParcel_Tránsito', cell: 'D10' },
      { sheet: '_EconomyParcel', cell: 'D10' },
      { sheet: '_EconomyParcel (martitimo)', cell: 'D10' },
      { sheet: 'EconomyParcel (maritimo)', cell: 'D10' },
      { sheet: 'ShopDeliveryService & ShopRetun', cell: 'C7' },
      { sheet: 'EuroBusinessParcel', cell: 'F5' }
    ];
    writeValue(validFromTargets, validFromValue);

    const validToTargets = [
      { sheet: 'Express 8_30', cell: 'H8' },
      { sheet: 'Express 10_30', cell: 'H8' },
      { sheet: 'Express 14.00', cell: 'H8' },
      { sheet: 'Express19.00', cell: 'L10' },
      { sheet: 'BusinessParcel', cell: 'L10' },
      { sheet: 'BusinessParcel_Tránsito', cell: 'H10' },
      { sheet: '_EconomyParcel', cell: 'H10' },
      { sheet: '_EconomyParcel (martitimo)', cell: 'H10' },
      { sheet: 'EconomyParcel (maritimo)', cell: 'H10' },
      { sheet: 'ShopDeliveryService & ShopRetun', cell: 'H7' },
      { sheet: 'EuroBusinessParcel', cell: 'P5' }
    ];
    writeValue(validToTargets, validToValue);

    const commissionTargets = [
      { sheet: 'Express 8_30', cell: 'F38' },
      { sheet: 'Express 10_30', cell: 'F39' },
      { sheet: 'Express 14.00', cell: 'G46' },
      { sheet: 'Express19.00', cell: 'L36' },
      { sheet: 'BusinessParcel', cell: 'L39' },
      { sheet: '_EconomyParcel', cell: 'F37' },
      { sheet: '_EconomyParcel (martitimo)', cell: 'G41' },
      { sheet: 'EconomyParcel (maritimo)', cell: 'G41' }
    ];

    // Añade este log justo aquí, antes de la llamada a writeValue
    sopLog('commissionTargets values:', {
      reimbursementFixed: reimbursementFixed,
      reimbursementPercent: reimbursementPercent,
      valueToWrite: reimbursementFixed !== 0 ? '' : reimbursementPercent !== null ? (reimbursementPercent).toFixed(2) : '',
      rawReimbursementPercent: form.reimbursementPercent
    });

    // Corrección de la asignación
    const commissionValue = reimbursementFixed !== 0 ? '' : reimbursementPercent !== null ? (reimbursementPercent).toFixed(2) : '';
    writeValue(commissionTargets, commissionValue, { percent: true });

    const minTargets = [
      { sheet: 'Express 8_30', cell: 'G38' },
      { sheet: 'Express 10_30', cell: 'G39' },
      { sheet: 'Express 14.00', cell: 'H46' },
      { sheet: 'Express19.00', cell: 'N36' },
      { sheet: 'BusinessParcel', cell: 'N39' },
      { sheet: '_EconomyParcel', cell: 'G37' },
      { sheet: '_EconomyParcel (martitimo)', cell: 'H41' },
      { sheet: 'EconomyParcel (maritimo)', cell: 'H41' }
    ];
    writeValue(minTargets, reimbursementMinimum !== null ? reimbursementMinimum.toFixed(2) : '', { currency: true });

    const maxTargets = [
      { sheet: 'Express 8_30', cell: 'H38' },
      { sheet: 'Express 10_30', cell: 'H39' },
      { sheet: 'Express 14.00', cell: 'I46' },
      { sheet: 'Express19.00', cell: 'P36' },
      { sheet: 'BusinessParcel', cell: 'P39' },
      { sheet: '_EconomyParcel', cell: 'H37' },
      { sheet: '_EconomyParcel (martitimo)', cell: 'I41' },
      { sheet: 'EconomyParcel (maritimo)', cell: 'I41' }
    ];
    writeValue(maxTargets, reimbursementMax !== null ? reimbursementMax.toFixed(2) : '', { currency: true });

    const fixedTargets = [
      { sheet: 'Express 8_30', cell: 'I38' },
      { sheet: 'Express 10_30', cell: 'I39' },
      { sheet: 'Express 14.00', cell: 'J46' },
      { sheet: 'Express19.00', cell: 'R36' },
      { sheet: 'BusinessParcel', cell: 'R39' },
      { sheet: '_EconomyParcel', cell: 'I37' },
      { sheet: '_EconomyParcel (martitimo)', cell: 'J41' },
      { sheet: 'EconomyParcel (maritimo)', cell: 'J41' }
    ];

    // Añade este log justo aquí, antes de la llamada a writeValue
    sopLog('fixedTargets values:', {
      reimbursementFixed: reimbursementFixed,
      reimbursementPercent: reimbursementPercent,
      valueToWrite: reimbursementPercent !== 0 ? '' : reimbursementFixed !== null ? reimbursementFixed.toFixed(2) : '',
      rawReimbursementFixed: form.reimbursementFixed
    });

    // Corrección de la asignación
    const fixedValue = reimbursementPercent !== 0 ? '' : reimbursementFixed !== null ? reimbursementFixed.toFixed(2) : '';
    writeValue(fixedTargets, fixedValue, { currency: true });

    const optionalTargets = [
      { sheet: 'Express 8_30', cell: 'I43' },
      { sheet: 'Express 10_30', cell: 'I44' },
      { sheet: 'Express 14.00', cell: 'J50' },
      { sheet: 'Express19.00', cell: 'R44' },
      { sheet: 'BusinessParcel', cell: 'R44' },
      { sheet: '_EconomyParcel', cell: 'I43' },
      { sheet: '_EconomyParcel (martitimo)', cell: 'J43' },
      { sheet: 'EconomyParcel (maritimo)', cell: 'J43' }
    ];
    writeValue(optionalTargets, optionalInsurance !== null ? (optionalInsurance).toFixed(2) : '', { percent: true });

    const energyTargets = [{ sheet: 'Costes_Adicionales', cell: 'G5' }];
    writeValue(energyTargets, energy !== null ? (energy).toFixed(2) : null, { percent: true });
    const climateTargets = [{ sheet: 'Costes_Adicionales', cell: 'G7' }];
    writeValue(climateTargets, climate !== null ? (climate).toFixed(2) : null, { percent: true });

    const cierreSheet = resolveWorksheet('cierre personalizado');
    if (cierreSheet) {
      cierreSheet.getCell('H50').value = form.agencyAddress || '';
      cierreSheet.getCell('H51').value = form.agencyPostalTown || '';
      cierreSheet.getCell('H52').value = form.agencyProvince || '';
      cierreSheet.getCell('H53').value = form.agencyEmail || '';
    }

    const businessTransit = resolveWorksheet('BusinessParcel_Tránsito');
if (businessTransit) {
  for (let row = 18; row <= 53; row += 1) {
    // Ajusta la referencia de la celda para que comience en C18
    const adjustedRow = row - 16;

    businessTransit.getCell(`C${row}`).value = {
      formula: `IFERROR(INDEX($N$2:$N$1222, S${adjustedRow}), "")`
    };
    businessTransit.getCell(`D${row}`).value = {
      formula: `IFERROR(INDEX($O$2:$O$1222, S${adjustedRow}), "")`
    };
  }
  businessTransit.getCell('H13').value = form.agencyProvince;
}

    // Nueva función para copiar fórmulas (CORREGIDA para referencias relativas)
    const copyFormulasToRange = (workbook: any, sheetName: string, sourceCell: string, targetRange: string) => {
      const sheet = workbook.getWorksheet(sheetName);
      if (!sheet) {
        throw new Error(`La hoja '${sheetName}' no está disponible en la plantilla descargada.`);
      }

      const source = sheet.getCell(sourceCell);
      if (!source || !source.value || typeof source.value !== 'object' || !source.value.formula) {
        throw new Error(`La celda '${sourceCell}' en la hoja '${sheetName}' no contiene una fórmula.`);
      }

      // 1. Obtener la fórmula original y el número de fila de la celda de origen.
      const originalFormula = source.value.formula as string; // Contiene la fórmula original (ej: =SI(Q2=VERDADERO;P2;""))
      const sourceRowMatch = sourceCell.match(/\d+/);
      if (!sourceRowMatch) {
        throw new Error(`La referencia de celda de origen '${sourceCell}' es inválida.`);
      }
      const sourceRow = parseInt(sourceRowMatch[0], 10); // En este caso: 2

      // 2. Interpretar el rango objetivo
      const [startCell, endCell] = targetRange.split(':');
      const startColMatch = startCell.match(/[A-Z]+/);
      const startRowMatch = startCell.match(/\d+/);
      const endColMatch = endCell.match(/[A-Z]+/);
      const endRowMatch = endCell.match(/\d+/);

      if (!startColMatch || !startRowMatch || !endColMatch || !endRowMatch) {
        throw new Error(`Rango '${targetRange}' inválido.`);
      }

      const startColCode = startColMatch[0].charCodeAt(0);
      const endColCode = endColMatch[0].charCodeAt(0);
      const startRow = parseInt(startRowMatch[0], 10); // En este caso: 3
      const endRow = parseInt(endRowMatch[0], 10);     // En este caso: 1211
      
      // 3. Crear el patrón de reemplazo para referencias relativas (sin $)
      // Busca un grupo de letras mayúsculas (columna), seguido por el número de fila de origen,
      // y se asegura de que NO esté seguido por un signo de dólar (que indicaría referencia absoluta).
      const rowRefPattern = new RegExp(`([A-Z]+)${sourceRow}(?!\\$)`, 'g');

      // 4. Copiar la fórmula y ajustarla para cada fila.
      for (let row = startRow; row <= endRow; row++) {
        for (let colCode = startColCode; colCode <= endColCode; colCode++) {
          const cellAddress = String.fromCharCode(colCode) + row;
          const cell = sheet.getCell(cellAddress);

          // Reemplazamos el número de fila de la referencia de origen (ej: 2) con el número de fila actual (ej: 3, 4, etc.).
          const newFormula = originalFormula.replace(rowRefPattern, `$1${row}`);
          
          if (cell) {
            cell.value = { formula: newFormula };
          }
        }
      }
    };

    // Copiar fórmula de Q2 a Q3:Q1211
    copyFormulasToRange(workbook, 'BusinessParcel_Tránsito', 'Q2', 'Q3:Q1211');

    // Copiar fórmula de R2 a R3:R1211. Ahora la fórmula se ajustará a Q3/P3, Q4/P4, etc.
    copyFormulasToRange(workbook, 'BusinessParcel_Tránsito', 'R2', 'R3:R1211');

    // Copiar fórmula de S2 a S3:S1211
    copyFormulasToRange(workbook, 'BusinessParcel_Tránsito', 'S2', 'S3:S1211');
    
  };

  const validateForm = () => {
    if (!form.clientName.trim()) {
      setError('Debes indicar el nombre del cliente o tarifa.');
      return false;
    }
    if (!form.agencyNameNumber.trim()) {
      setError('Debes indicar el nombre y número de agencia.');
      return false;
    }
    setError(null);
    return true;
  };

  const exportExcel = async () => {
    if (!validateForm()) {
      return;
    }

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'Se va a proceder a descargar el Soporte de Oferta (SOP) con los datos indicados. RECUERDE que debe revisar el resto de suplementos y costes indicados en las hojas antes de proceder a su impresión y/o envío al cliente, principal atención a las hojas: "Aduanas" y "Costes Adicionales".'
      );
      if (!confirmed) {
        return;
      }
    }

    setGenerating(true);
    setError(null);
    try {
      const workbook = await prepareWorkbook();

      workbook.worksheets.forEach((sheet) => {
        sheet.eachRow({ includeEmpty: true }, (row: any) => {
          row.eachCell({ includeEmpty: true }, (cell: any) => {
            let value = cell.value;
            if (value && typeof value === 'object') {
              if ('formula' in value) {
                // Mantener las fórmulas (especialmente BusinessParcel_Tránsito)
                return;
              }
              if ('result' in value && value.result !== undefined) {
                value = value.result;
              } else if ('text' in value) {
                value = value.text;
              } else {
                value = null;
              }
            }
            cell.value = value ?? null;
          });
        });
      });

      const generalSheet = workbook.getWorksheet('General');
      if (generalSheet) {
        generalSheet.state = 'hidden';
        sopLog('hide-sheet', 'Hoja General oculta');
      }

      const baseExpSheet = workbook.getWorksheet('base exp');
      if (baseExpSheet) {
        baseExpSheet.state = 'hidden';
        sopLog('hide-sheet', 'Hoja base exp oculta');
      }

      const buffer = await workbook.xlsx.writeBuffer();
      downloadBuffer(buffer, `SOP_${Date.now()}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      trackSOPDownload(user?.id);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'No se pudo generar el Excel de SOP.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleOpen}
        disabled={computedDisabled}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${
          computedDisabled
            ? 'bg-gray-200 text-gray-500 border-gray-200 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
        }`}
      >
        <FileSpreadsheet className="h-4 w-4" />
        Generar SOP
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-2 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Generar documentación SOP</h2>
                <p className="text-xs text-gray-500">Completa los datos comerciales y descarga el Excel actualizado. El SOP cargará los datos de la pantalla principal (%Margen y demás datos aplicados)</p>
  <p className="text-xs mt-1 text-gray-500">
    <span className="font-bold text-red-600">¡ATENCIÓN!</span> los datos del panel 'Comparador Comercial' sólo son exportable con Mini-SOP. 
  </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cerrar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {isPreloaded && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                  <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full"></div>
                  <p className="text-sm text-green-800">
                    <strong>Datos precargados desde tu perfil.</strong> Puedes editarlos si es necesario.
                  </p>
                </div>
              )}

              {loadingBase && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Descargando plantilla corporativa...
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600">
                    Plan comercial aplicable
                    <select
                      value={planSelectValue}
                      onChange={(event) => setLocalPlanGroup(event.target.value)}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sin plan</option>
                      {planGroups.map(([groupKey, label]) => (
                        <option key={groupKey} value={groupKey}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {planMessage && (
                  <div className="text-xs text-blue-600 md:text-right">
                    {planMessage}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-gray-600">Cliente / Tarifa (obligatorio)</span>
                    <input
                      type="text"
                      value={form.clientName}
                      onChange={(event) => handleFieldChange('clientName', event.target.value)}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nombre del cliente o nombre para la tarifa"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-gray-600">Nombre y nº de agencia (obligatorio)</span>
                    <input
                      type="text"
                      value={form.agencyNameNumber}
                      onChange={(event) => handleFieldChange('agencyNameNumber', event.target.value)}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Datos de tu agencia"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-semibold text-gray-600">
  Validez desde
  <span className="ml-1 text-gray-400">(en blanco HOY)</span>
</span>

                      <input
                        type="date"
                        value={form.validFrom}
                        onChange={(event) => handleFieldChange('validFrom', event.target.value)}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </label>
                    <label className="block">
                     <span className="text-xs font-semibold text-gray-600">
  Validez hasta
  <span className="ml-1 text-gray-400">(en blanco 31/12/xx)</span>
</span>

                      <input
                        type="date"
                        value={form.validTo}
                        onChange={(event) => handleFieldChange('validTo', event.target.value)}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-gray-600">Dirección de la agencia</span>
                    <input
                      type="text"
                      value={form.agencyAddress}
                      onChange={(event) => handleFieldChange('agencyAddress', event.target.value)}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Calle y número"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-gray-600">CP & Población</span>
                    <input
                      type="text"
                      value={form.agencyPostalTown}
                      onChange={(event) => handleFieldChange('agencyPostalTown', event.target.value)}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="ej: 28540 Valdemoro (Madrid)"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-semibold text-gray-600">Provincia</span>
                      <input
                        type="text"
                        value={form.agencyProvince}
                        onChange={(event) => handleFieldChange('agencyProvince', event.target.value)}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-gray-600">Email contacto agencia</span>
                      <input
                        type="email"
                        value={form.agencyEmail}
                        onChange={(event) => handleFieldChange('agencyEmail', event.target.value)}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600">Comisión reembolsos (%)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.reimbursementPercent}
                    onChange={(event) => handleReimbursementPercentChange(event.target.value)}
                    disabled={reimbursementPercentLocked}
                    className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      reimbursementPercentLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'border-gray-300'
                    }`}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600">Importe mínimo (€)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.reimbursementMinimum}
                    onChange={(event) => handleFieldChange('reimbursementMinimum', event.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600">Importe máximo (€)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.reimbursementMax}
                    onChange={(event) => handleFieldChange('reimbursementMax', event.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600">Importe fijo (€)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.reimbursementFixed}
                    onChange={(event) => handleReimbursementFixedChange(event.target.value)}
                    disabled={reimbursementFixedLocked}
                    className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      reimbursementFixedLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'border-gray-300'
                    }`}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600">Suplemento de energía (%)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.energySurcharge}
                    onChange={(event) => handleFieldChange('energySurcharge', event.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600">Climate Protect (%)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.climateProtect}
                    onChange={(event) => handleFieldChange('climateProtect', event.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-gray-600">Seguro opcional (%)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.optionalInsurance}
                    onChange={(event) => handleFieldChange('optionalInsurance', event.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                  {error}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                La descarga genera un SOP completo con los datos indicados.
              </div>
              <button
                type="button"
                onClick={exportExcel}
                disabled={!isReady || generating}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  !isReady || generating
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Descargar Excel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SOPGenerator;
