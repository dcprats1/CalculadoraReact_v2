import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, TrendingUp, Euro, Percent } from 'lucide-react';
import {
  PackageData,
  CostBreakdown,
  ShippingMode,
  SHIPPING_MODE_LABELS,
  formatCurrency,
  formatPercentage,
  formatWeight,
  roundUp
} from '../utils/calculations';

type ZoneCostMap = Record<string, CostBreakdown>;

interface CostBreakdownTableProps {
  costBreakdowns?: ZoneCostMap;
  marginPercentage: number;
  packages: PackageData[];
  showCosts: boolean;
  showPvp: boolean;
  shippingMode: ShippingMode;
  additionalPvp?: number;
  additionalPvpLabel?: string;
  saturdayActive?: boolean;
  saturdayPvp?: number;
  onProvincialCostChange?: (value: number | null) => void;
  provincialCostOverride?: number | null;
  onMarginChange?: (value: number) => void;
  planSelected?: boolean;
  discountSummaryValue?: React.ReactNode;
  discountSummaryDescription?: React.ReactNode;
}

interface AnalysisRow {
  zone: string;
  breakdown: CostBreakdown;
  basePvp: number;
  energyCharge: number;
  climateCharge: number;
  insuranceCharge: number;
  saturdayCharge: number;
  pvpSinIva: number;
  pvpConIva: number;
  marginAmount: number;
}

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

interface SummaryCard {
  title: string;
  value: React.ReactNode;
  description?: React.ReactNode;
  Icon: IconComponent;
  iconClassName: string;
}

export default function CostBreakdownTable({
  costBreakdowns,
  marginPercentage,
  packages,
  showCosts,
  showPvp,
  shippingMode,
  additionalPvp = 0,
  additionalPvpLabel,
  saturdayActive = false,
  saturdayPvp = 0,
  onProvincialCostChange,
  provincialCostOverride = null,
  onMarginChange,
  planSelected = false,
  discountSummaryValue,
  discountSummaryDescription
}: CostBreakdownTableProps) {
  const safePackages = Array.isArray(packages) ? packages : [];

  const totalPackages = safePackages.reduce(
    (sum, pkg) => sum + Math.max(1, Math.round(pkg.quantity ?? 1)),
    0
  );
  const totalWeight = safePackages.reduce(
    (sum, pkg) =>
      sum + (pkg.finalWeight || pkg.weight) * Math.max(1, Math.round(pkg.quantity ?? 1)),
    0
  );

  const [energySurchargePct, setEnergySurchargePct] = useState<number>(7);
  const [climateProtectPct, setClimateProtectPct] = useState<number>(1.5);
  const [optionalInsurancePct, setOptionalInsurancePct] = useState<number>(8);
  const [applyVat, setApplyVat] = useState<boolean>(true);
  const [vatRate, setVatRate] = useState<number>(21);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const analysisRows = useMemo<AnalysisRow[]>(() => {
      // 💡 LÍNEA DE CORRECCIÓN CLAVE
    if (!costBreakdowns) {
      return [];
    }
    const marginFactor = 1 - marginPercentage / 100;
    const canCalculatePvp = marginFactor > 0;
    const vatMultiplier = applyVat ? 1 + vatRate / 100 : 1;

    return Object.entries(costBreakdowns).map(([zone, breakdown]) => {
      const isCalculated = breakdown.status === 'calculated';
      const basePvpRaw = isCalculated && canCalculatePvp ? breakdown.totalCost / marginFactor : 0;
      const basePvp = isCalculated ? roundUp(basePvpRaw) : 0;
      const energyCharge = isCalculated ? roundUp(basePvp * (energySurchargePct / 100)) : 0;
      const climateCharge = isCalculated ? roundUp(basePvp * (climateProtectPct / 100)) : 0;
      const insuranceCharge = isCalculated ? roundUp(basePvp * (optionalInsurancePct / 100)) : 0;
      const extraPvp = isCalculated ? roundUp(additionalPvp) : 0;
      const saturdayCharge = isCalculated ? (saturdayActive ? roundUp(saturdayPvp) : 0) : 0;
      const pvpSinIva = isCalculated
        ? roundUp(basePvp + energyCharge + climateCharge + insuranceCharge + extraPvp + saturdayCharge)
        : 0;
      const pvpConIva = isCalculated ? roundUp(pvpSinIva * vatMultiplier) : 0;
      const rawMargin = isCalculated ? pvpSinIva - breakdown.totalCost : 0;
      const marginAmount = !isCalculated
        ? 0
        : rawMargin >= 0
          ? roundUp(rawMargin)
          : -roundUp(Math.abs(rawMargin));

      return {
        zone,
        breakdown,
        basePvp: Number.isFinite(basePvp) ? basePvp : 0,
        energyCharge: Number.isFinite(energyCharge) ? energyCharge : 0,
        climateCharge: Number.isFinite(climateCharge) ? climateCharge : 0,
        insuranceCharge: Number.isFinite(insuranceCharge) ? insuranceCharge : 0,
        saturdayCharge: Number.isFinite(saturdayCharge) ? saturdayCharge : 0,
        pvpSinIva: Number.isFinite(pvpSinIva) ? pvpSinIva : 0,
        pvpConIva: Number.isFinite(pvpConIva) ? pvpConIva : 0,
        marginAmount: Number.isFinite(marginAmount) ? marginAmount : 0
      };
    });
  }, [
    costBreakdowns,
    marginPercentage,
    energySurchargePct,
    climateProtectPct,
    optionalInsurancePct,
    applyVat,
    vatRate,
    additionalPvp,
    saturdayActive,
    saturdayPvp
  ]);

  const showSaturdayCostColumn = saturdayActive || analysisRows.some(
    row => row.breakdown.status === 'calculated' && row.breakdown.saturdayCost > 0
  );
  const showMileageCostColumn = analysisRows.some(
    row => row.breakdown.status === 'calculated' && row.breakdown.mileageCost > 0
  );
  const validRows = analysisRows.filter(
    row => row.breakdown.status === 'calculated' && row.pvpSinIva > 0
  );
  const pvpSinIvaValues = validRows.map(row => row.pvpSinIva);
  const pvpConIvaValues = validRows.map(row => row.pvpConIva);
  const minPvpSinIva = pvpSinIvaValues.length ? Math.min(...pvpSinIvaValues) : 0;
  const maxPvpSinIva = pvpSinIvaValues.length ? Math.max(...pvpSinIvaValues) : 0;
  const minPvpConIva = pvpConIvaValues.length ? Math.min(...pvpConIvaValues) : 0;
  const maxPvpConIva = pvpConIvaValues.length ? Math.max(...pvpConIvaValues) : 0;
  const hasPvpData = pvpSinIvaValues.length > 0;
  const vatColumnTitle = applyVat ? `PVP CON IVA (${vatRate}%)` : 'PVP CON IVA (no aplicado)';
  const sliderValue = Math.min(Math.max(marginPercentage, 0), 100);
  const sliderPosition = `calc(${sliderValue}% - 16px)`;
  const sliderGradient =
    'linear-gradient(90deg, #dc2626 0%, #f97316 20%, #facc15 38%, #bbf7d0 40%, #4ade80 75%, #16a34a 100%)';
  const summaryCards = useMemo<SummaryCard[]>(() => {
    const zoneDescription = hasPvpData ? (
      <div className="text-xs text-gray-500 space-y-0.5">
        <p>
          PVP sin IVA: {formatCurrency(minPvpSinIva)} - {formatCurrency(maxPvpSinIva)}
        </p>
        {applyVat && (
          <p>
            PVP con IVA: {formatCurrency(minPvpConIva)} - {formatCurrency(maxPvpConIva)}
          </p>
        )}
      </div>
    ) : (
      <p className="text-xs text-gray-500">Pendiente de datos</p>
    );

    const discountValue = discountSummaryValue ?? 'Sin descuentos aplicados';
    const discountDescriptionNode = discountSummaryDescription !== undefined && discountSummaryDescription !== null
      ? typeof discountSummaryDescription === 'string'
        ? <p className="text-xs text-gray-500">{discountSummaryDescription}</p>
        : discountSummaryDescription
      : <p className="text-xs text-gray-500">Sin descuentos aplicados</p>;

    return [
      {
        title: 'Total Bultos',
        value: totalPackages,
        description: <p className="text-sm text-gray-500">{formatWeight(totalWeight)}</p>,
        Icon: Calculator,
        iconClassName: 'text-blue-600'
      },
      {
        title: 'Margen Objetivo',
        value: formatPercentage(marginPercentage),
        description: <p className="text-sm text-gray-500">Sobre venta</p>,
        Icon: TrendingUp,
        iconClassName: 'text-green-600'
      },
      {
        title: 'Zonas Calculadas',
        value: analysisRows.length,
        description: zoneDescription,
        Icon: Euro,
        iconClassName: 'text-purple-600'
      },
      {
        title: 'Descuento Coste Aplicado',
        value: discountValue,
        description: discountDescriptionNode,
        Icon: Percent,
        iconClassName: 'text-orange-500'
      }
    ];
  }, [
    analysisRows.length,
    applyVat,
    hasPvpData,
    marginPercentage,
    maxPvpConIva,
    maxPvpSinIva,
    minPvpConIva,
    minPvpSinIva,
    totalPackages,
    totalWeight,
    discountSummaryValue,
    discountSummaryDescription
  ]);

  const createPercentChangeHandler = (updater: (value: number) => void) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const nextValue = Number(event.target.value);
    updater(Number.isNaN(nextValue) ? 0 : nextValue);
  };

  const handleMarginSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    if (Number.isNaN(value)) {
      return;
    }

    onMarginChange?.(value);
  };

  useEffect(() => {
    if (!selectedZone) {
      return;
    }

    const stillExists = analysisRows.some(row => row.zone === selectedZone);
    if (!stillExists) {
      setSelectedZone(null);
    }
  }, [analysisRows, selectedZone]);

  const handleVatRateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextValue = Number(event.target.value);
    setVatRate(Number.isNaN(nextValue) ? vatRate : nextValue);
  };

  const panelStyle = (visible: boolean): React.CSSProperties => ({
    maxHeight: visible ? '5000px' : '0px',
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(-8px)',
    transition: 'max-height 0.6s ease, opacity 0.3s ease, transform 0.3s ease',
    overflow: 'hidden',
    pointerEvents: visible ? 'auto' : 'none'
  });

  const renderAmountCell = (value: number, breakdown: CostBreakdown) => {
    if (breakdown.status === 'not_available') {
      return <span className="text-red-600 font-semibold">NO</span>;
    }
    if (breakdown.status === 'idle') {
      return <span className="text-gray-400">—</span>;
    }
    const amount = Number.isFinite(value) ? value : 0;
    const formatted = formatCurrency(Math.abs(amount));
    if (amount < 0) {
      return <span className="text-red-600">-{formatted}</span>;
    }
    return formatted;
  };

  const renderIncrementCell = (
    percent: number,
    amount: number,
    breakdown: CostBreakdown
  ) => {
    if (breakdown.status === 'not_available') {
      return <span className="text-red-600 font-semibold">NO</span>;
    }
    if (breakdown.status === 'idle') {
      return <span className="text-gray-400">—</span>;
    }

    const safePercent = Number.isFinite(percent) ? percent : 0;
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    const formattedAmount = formatCurrency(Math.abs(safeAmount));
    const amountNode = safeAmount < 0
      ? <span className="text-red-600">-{formattedAmount}</span>
      : <span className="text-gray-900">{formattedAmount}</span>;

    return (
      <div className="flex flex-col items-end leading-tight">
        {amountNode}
        <span className="text-[11px] text-gray-500">
          {formatPercentage(safePercent)}
        </span>
      </div>
    );
  };

  const renderInitialCostCell = (row: AnalysisRow) => {
    const { breakdown, zone } = row;

    if (breakdown.status === 'not_available' || breakdown.status === 'idle') {
      return renderAmountCell(breakdown.initialCost, breakdown);
    }

    if (!onProvincialCostChange || zone !== 'Provincial') {
      return renderAmountCell(breakdown.initialCost, breakdown);
    }

    const displayValue = planSelected
      ? roundUp(Math.max(0, breakdown.initialCost - breakdown.linearDiscount))
      : provincialCostOverride ?? breakdown.initialCost;

    if (planSelected || !onProvincialCostChange) {
      return renderAmountCell(displayValue, breakdown);
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      if (raw === '') {
        onProvincialCostChange(null);
        return;
      }

      const parsed = Number(raw);
      onProvincialCostChange(Number.isNaN(parsed) ? null : parsed);
    };

    return (
      <input
        type="number"
        step="0.01"
        min="0"
        value={Number.isFinite(displayValue) ? displayValue : 0}
        onChange={handleChange}
        className="w-full max-w-[140px] text-right px-2 py-1 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        title="Si tu provincia tiene un coste especial sustituye el coste inicial calculado en base a peso/medidas para que los cálculos se actualicen."
      />
    );
  };

  return (
    <div className="space-y-8">
      {(showCosts || showPvp) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map(({ title, value, description, Icon, iconClassName }) => (
            <div key={title} className="bg-white rounded-lg shadow-md p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{title}</p>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  {description}
                </div>
                <Icon className={`h-8 w-8 ${iconClassName}`} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        style={panelStyle(showCosts)}
        aria-hidden={!showCosts}
        className="transition-all"
      >
        {showCosts && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Desglose de Costes por Zona de Destino
              </h3>
              <span className="inline-flex items-center px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 bg-blue-50 border border-blue-200 rounded-full">
                Modo: {SHIPPING_MODE_LABELS[shippingMode]}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full table-auto text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-tight leading-snug sticky left-0 bg-gray-50 z-10">
                      Zona de Destino
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-tight leading-snug">
                      Coste Inicial<br />calculado en base al peso y medidas indicadas
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-tight leading-snug">
                      Descuento<br />lineal
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-tight leading-snug">
                      Climate Protect<br />1,5%
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-tight leading-snug">
                      Canon Red<br />(Fijo) 0,27€
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-tight leading-snug">
                      Canon Digital<br />(Fijo) 0,06€
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-tight leading-snug">
                      No Vol.<br />(FIJO) 0,04€
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-tight leading-snug">
                      Ampl. Cobertura<br />(1,95%)
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-tight leading-snug">
                      Energía<br />(7,50%)
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-tight leading-snug">
                      Suplementos<br />(Variable)
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-tight leading-snug">
                      Irregular<br />(Variable)
                    </th>
                    {showMileageCostColumn && (
                      <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-tight leading-snug">
                        Kilometraje
                      </th>
                    )}
                    {showSaturdayCostColumn && (
                      <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-tight leading-snug">
                        Ent. Sáb<br />(Coste)
                      </th>
                    )}
                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-tight leading-snug">
                      Total suma de conceptos anteriores
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-tight leading-snug">
                      Incr. 2024<br />(%)
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-tight leading-snug">
                      Incr. 2025<br />(%)
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-tight leading-snug">
                      Incr. 2026<br />(%) editable
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-tight leading-snug">
                      SPC en €<br />(editable)
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-bold text-blue-600 uppercase tracking-tight leading-snug">
                      TOTAL COSTE<br />(Suma de todo lo anterior)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analysisRows.map(row => (
                    <tr key={row.zone} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                        {row.zone}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {renderInitialCostCell(row)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                        {renderAmountCell(-row.breakdown.linearDiscount, row.breakdown)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                        {renderAmountCell(row.breakdown.climateProtect, row.breakdown)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                        {renderAmountCell(row.breakdown.canonRed, row.breakdown)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                        {renderAmountCell(row.breakdown.canonDigital, row.breakdown)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                        {renderAmountCell(row.breakdown.noVol, row.breakdown)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                        {renderAmountCell(row.breakdown.amplCobertura, row.breakdown)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                        {renderAmountCell(row.breakdown.energia, row.breakdown)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                        {renderAmountCell(row.breakdown.suplementos, row.breakdown)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                        {renderAmountCell(row.breakdown.irregular, row.breakdown)}
                      </td>
                      {showMileageCostColumn && (
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                          {renderAmountCell(row.breakdown.mileageCost, row.breakdown)}
                        </td>
                      )}
                      {showSaturdayCostColumn && (
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                          {renderAmountCell(row.breakdown.saturdayCost, row.breakdown)}
                        </td>
                      )}
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {renderAmountCell(row.breakdown.subtotal, row.breakdown)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                        {renderIncrementCell(
                          row.breakdown.incr2024Percent,
                          row.breakdown.incr2024,
                          row.breakdown
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                        {renderIncrementCell(
                          row.breakdown.incr2025Percent,
                          row.breakdown.incr2025,
                          row.breakdown
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                        {renderIncrementCell(
                          row.breakdown.incr2026Percent,
                          row.breakdown.incr2026,
                          row.breakdown
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                        {renderAmountCell(row.breakdown.spc, row.breakdown)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-blue-600 text-right font-bold">
                        {renderAmountCell(row.breakdown.totalCost, row.breakdown)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <div
        style={panelStyle(showPvp)}
        aria-hidden={!showPvp}
        className="transition-all"
      >
        {showPvp && (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-gray-900">
                Análisis Comparativo
              </h3>
              <span className="text-sm text-gray-500">
                Zonas evaluadas: {analysisRows.length}
              </span>
            </div>

            {additionalPvp > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800 flex items-center justify-between">
                <div>
                  <p className="font-semibold uppercase tracking-wide text-xs text-red-700">
                    {additionalPvpLabel ?? 'Cargos adicionales'}
                  </p>
                  <p>
                    Se añaden {formatCurrency(additionalPvp)} al PVP total para este envío.
                  </p>
                </div>
              </div>
            )}

            {saturdayActive && saturdayPvp > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 flex items-center justify-between">
                <div>
                  <p className="font-semibold uppercase tracking-wide text-xs text-blue-700">
                    Entrega en sábado
                  </p>
                  <p>
                    Se añaden {formatCurrency(saturdayPvp)} al PVP total para cubrir la entrega en sábado.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Suplemento de energía (%)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={energySurchargePct}
                  onChange={createPercentChangeHandler(setEnergySurchargePct)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Se aplica sobre el PVP base calculado con el margen.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Climate Protect (%)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={climateProtectPct}
                  onChange={createPercentChangeHandler(setClimateProtectPct)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ajusta el recargo del 1,5% para protección climática.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seguro Opcional (%)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={optionalInsurancePct}
                  onChange={createPercentChangeHandler(setOptionalInsurancePct)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Incremento editable para cubrir seguros adicionales.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-stretch">
              <div className="bg-white border border-gray-200 rounded-lg p-4 md:basis-1/4 md:max-w-[25%]">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Margen objetivo sobre venta
                </p>
                <div className="relative">
                  <div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{ background: sliderGradient }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={0.1}
                    value={sliderValue}
                    onChange={handleMarginSliderChange}
                    className="relative w-full appearance-none h-2 rounded-full bg-transparent focus:outline-none"
                    aria-label="Margen objetivo sobre venta"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Number.isFinite(marginPercentage) ? marginPercentage : 0}
                    list="margin-percentage-ticks"
                  />
                  <div className="absolute -top-7" style={{ left: sliderPosition }}>
                    <span className="px-2 py-1 rounded-md bg-gray-900 text-white text-xs shadow">
                      {formatPercentage(marginPercentage)}
                    </span>
                  </div>
                </div>
                <datalist id="margin-percentage-ticks">
                  {Array.from({ length: 21 }).map((_, index) => {
                    const value = index * 5;
                    return <option key={value} value={value} label={`${value}%`} />;
                  })}
                </datalist>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-wrap items-center gap-4 justify-end md:basis-3/4 md:max-w-[75%]">
                <div className="mr-auto">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    PVP SIN IVA
                  </p>
                  <p className="text-sm text-gray-600">
                    Los suplementos editables se suman al PVP calculado con el margen seleccionado.
                  </p>
                </div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={applyVat}
                    onChange={(event) => setApplyVat(event.target.checked)}
                  />
                  <span>Aplicar IVA al resultado</span>
                </label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">IVA</span>
                  <select
                    value={vatRate}
                    onChange={handleVatRateChange}
                    disabled={!applyVat}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    <option value={21}>21%</option>
                    <option value={0}>0%</option>
                    <option value={4}>4%</option>
                    <option value={7}>7%</option>
                  </select>
                </div>
                <div className="text-xs text-gray-500">
                  {applyVat ? `Mostrando también PVP con IVA (${vatRate}%).` : 'Mostrando únicamente PVP sin IVA.'}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Zona de Destino
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Coste
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PVP base
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sup. energía ({formatPercentage(energySurchargePct)})
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Climate Protect ({formatPercentage(climateProtectPct)})
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Seguro Opcional ({formatPercentage(optionalInsurancePct)})
                    </th>
                    {showSaturdayCostColumn && (
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ent. Sáb
                      </th>
                    )}
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Margen (sin IVA)
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {vatColumnTitle}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analysisRows.map(row => (
                    <tr
                      key={`${row.zone}-analysis`}
                      className={`${selectedZone === row.zone ? 'bg-green-50' : ''} hover:bg-gray-50 transition-colors cursor-pointer`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedZone(row.zone)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedZone(row.zone);
                        }
                      }}
                    >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {row.zone}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                          {renderAmountCell(row.breakdown.totalCost, row.breakdown)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                          {renderAmountCell(row.basePvp, row.breakdown)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                          {renderAmountCell(row.energyCharge, row.breakdown)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                          {renderAmountCell(row.climateCharge, row.breakdown)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                          {renderAmountCell(row.insuranceCharge, row.breakdown)}
                        </td>
                        {showSaturdayCostColumn && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                            {renderAmountCell(row.saturdayCharge, row.breakdown)}
                          </td>
                        )}
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                          {renderAmountCell(row.marginAmount, row.breakdown)}
                        </td>
                        <td
                          className={`px-4 py-3 whitespace-nowrap text-sm font-semibold text-right ${
                            applyVat ? 'text-blue-600' : 'text-gray-500'
                          }`}
                        >
                          {renderAmountCell(row.pvpConIva, row.breakdown)}
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {validRows.length === 0 && (
              <p className="text-sm text-gray-500">
                La tabla de costes se actualizará automáticamente al indicar pesos, medidas y ajustes necesarios.
              </p>
            )}

          </div>
        )}
      </div>

      {!showCosts && !showPvp && (
        <div className="bg-white border border-dashed border-gray-300 rounded-lg p-6 text-center text-sm text-gray-500">
          Usa los botones «Ver costes» o «Ver PVP» para desplegar la información.
        </div>
      )}
    </div>
  );
}
