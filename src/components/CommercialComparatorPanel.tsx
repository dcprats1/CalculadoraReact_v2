import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import type { DiscountPlan } from '../lib/supabase';
import { roundUp } from '../utils/calculations';
import { ComparatorMiniSOPGenerator } from './sop/ComparatorMiniSOPGenerator';

export const COMPARATOR_ZONES = [
  'Prov.',
  'Reg.',
  'Pen.',
  'Port.',
  'Can.My.',
  'Can.Mn.',
  'Bal.My.',
  'Bal.Mn.',
  'Ceuta',
  'Melilla'
] as const;

export const COMPARATOR_COLUMNS = [
  '0 a 1kg',
  '1 a 3kg',
  '3 a 5kg',
  '5 a 10kg',
  '10 a 15kg',
  'kg. adc'
] as const;

export type ComparatorZone = typeof COMPARATOR_ZONES[number];
export type ComparatorColumn = typeof COMPARATOR_COLUMNS[number];

export type ComparatorTable = Record<ComparatorZone, Record<ComparatorColumn, number>>;

export type ComparatorBlockKey = 'competition' | 'agency' | 'offer';

interface CommercialComparatorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tables: Record<ComparatorBlockKey, ComparatorTable>;
  onValueChange: (
    block: ComparatorBlockKey,
    zone: ComparatorZone,
    column: ComparatorColumn,
    value: number
  ) => void;
  availableServices: string[];
  selectedService: string;
  onServiceChange: (service: string) => void;
  discountPlans: DiscountPlan[];
  selectedPlan: string;
  onPlanChange: (planId: string) => void;
  offerMargin: number;
  onOfferMarginChange: (value: number) => void;
  offerAverageMargin: number;
  onReset: () => void;
  onMatchCompetition: () => void;
  sopLauncher: ReactNode;
}

const EDITABLE_BLOCKS: ComparatorBlockKey[] = ['competition', 'offer'];

const buildEditableSequence = () =>
  EDITABLE_BLOCKS.flatMap(block =>
    COMPARATOR_ZONES.flatMap(zone =>
      COMPARATOR_COLUMNS.map(column => ({ block, zone, column }))
    )
  );

const getCellId = (block: ComparatorBlockKey, zone: ComparatorZone, column: ComparatorColumn) =>
  `${block}__${zone}__${column}`;
const blockHeaders: Record<
  ComparatorBlockKey,
  { color: string; title: string; subtitle: string }
> = {
  competition: {
    color: 'bg-yellow-200',
    title: 'Precios competencia',
    subtitle: '¡Recuerda! Otro GLS no es tu competencia.'
  },
  agency: {
    color: 'bg-blue-200',
    title: 'Costes base agencia',
    subtitle: 'Se actualiza según tarifa y plan asociado'
  },
  offer: {
    color: 'bg-green-200',
    title: 'Precios a ofrecer',
    subtitle: 'Barra deslizadora para ajustar tu margen'
  }
};

const PANEL_MARGIN = 16;

const SLIDER_TICKS = Array.from({ length: 21 }, (_, index) => index * 5);

const sliderStyles = `
.comparator-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 8px;
  background: transparent;
  cursor: pointer;
}

.comparator-slider:focus {
  outline: none;
}

.comparator-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  height: 18px;
  width: 18px;
  border-radius: 9999px;
  background: #1d4ed8;
  border: 3px solid #ffffff;
  box-shadow: 0 0 0 1px rgba(29, 78, 216, 0.6);
}

.comparator-slider::-moz-range-thumb {
  height: 18px;
  width: 18px;
  border-radius: 9999px;
  background: #1d4ed8;
  border: 3px solid #ffffff;
  box-shadow: 0 0 0 1px rgba(29, 78, 216, 0.6);
}

.comparator-slider::-webkit-slider-runnable-track,
.comparator-slider::-moz-range-track {
  background: transparent;
}
`;

export const CommercialComparatorPanel: React.FC<CommercialComparatorPanelProps> = ({
  isOpen,
  onClose,
  tables,
  onValueChange,
  availableServices,
  selectedService,
  onServiceChange,
  discountPlans,
  selectedPlan,
  onPlanChange,
  offerMargin,
  onOfferMarginChange,
  offerAverageMargin,
  onReset,
  onMatchCompetition,
  sopLauncher
}) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ pointerId: number | null; offsetX: number; offsetY: number }>({
    pointerId: null,
    offsetX: 0,
    offsetY: 0
  });
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: PANEL_MARGIN, y: PANEL_MARGIN });
  const [isDragging, setIsDragging] = useState(false);
  const [activeCell, setActiveCell] = useState<
    | null
    | {
        block: ComparatorBlockKey;
        zone: ComparatorZone;
        column: ComparatorColumn;
      }
  >(null);
  const [activeDraft, setActiveDraft] = useState('');
  const editableSequence = useMemo(buildEditableSequence, []);
  const [marginDraft, setMarginDraft] = useState(() => offerMargin.toFixed(2));

  const sliderGradient =
    'linear-gradient(90deg, #dc2626 0%, #f97316 20%, #facc15 35%, #bbf7d0 40%, #86efac 70%, #166534 100%)';
  const sliderIndicatorPosition = Math.min(98, Math.max(2, offerMargin));
  const baseEditableInputClasses =
    'w-full rounded-md border px-1.5 py-1 text-right text-[11px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors';

  const formatInputValue = (value: number) => {
    const safe = Number.isFinite(value) ? value : 0;
    return safe.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const parseInputValue = (raw: string): number => {
    const trimmed = raw.trim();
    if (!trimmed) {
      return 0;
    }

    const normalized = trimmed.includes(',')
      ? trimmed.replace(/\./g, '').replace(',', '.')
      : trimmed;
    const parsed = Number.parseFloat(normalized);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }
    return roundUp(parsed);
  };

  const focusCell = (
    block: ComparatorBlockKey,
    zone: ComparatorZone,
    column: ComparatorColumn,
    numericValue: number
  ) => {
    setActiveCell({ block, zone, column });
    setActiveDraft(formatInputValue(numericValue));
  };

  const commitActiveDraft = () => {
    if (!activeCell) {
      return;
    }

    const { block, zone, column } = activeCell;
    const currentValue = tables[block][zone][column];
    const parsed = parseInputValue(activeDraft);

    if (Math.abs(parsed - currentValue) > 0.004) {
      onValueChange(block, zone, column, parsed);
    }

    setActiveCell(null);
  };

const moveFocusFromCell = (
  origin: { block: ComparatorBlockKey; zone: ComparatorZone; column: ComparatorColumn },
  direction: 1 | -1
) => {
  const originIndex = editableSequence.findIndex(
    cell =>
      cell.block === origin.block && cell.zone === origin.zone && cell.column === origin.column
  );

  if (originIndex === -1) {
    return false;
  }

  const targetIndex = originIndex + direction;
  if (targetIndex < 0 || targetIndex >= editableSequence.length) {
    return false;
  }

  const target = editableSequence[targetIndex];
  const nextValue = tables[target.block][target.zone][target.column];
  focusCell(target.block, target.zone, target.column, nextValue);

    requestAnimationFrame(() => {
      const selector = `input[data-cell-id="${getCellId(target.block, target.zone, target.column)}"]`;
      const element = panelRef.current?.querySelector<HTMLInputElement>(selector);
      element?.focus();
      element?.select();
    });

    return true;
  };

  const getOfferHighlightClasses = (
    offerValue: number,
    competitionValue: number,
    agencyValue: number
  ): { cellClass: string; inputClass: string } => {
    const epsilon = 0.01;
    const hasCompetition = Number.isFinite(competitionValue);
    const hasAgency = Number.isFinite(agencyValue);

    const defaultHighlight = {
      cellClass: '',
      inputClass: 'border-gray-300 text-gray-900 bg-white'
    };

    if (hasCompetition && offerValue < (competitionValue as number) - epsilon) {
      const diff = (competitionValue as number) - offerValue;
      const base = Math.max(competitionValue as number, 1);
      const ratio = Math.min(diff / base, 1);

      if (ratio > 0.5) {
        return {
          cellClass: 'bg-green-300/70',
          inputClass: 'border-green-500 text-green-900 bg-white/70'
        };
      }

      if (ratio > 0.2) {
        return {
          cellClass: 'bg-green-200/70',
          inputClass: 'border-green-400 text-green-900 bg-white/70'
        };
      }

      return {
        cellClass: 'bg-green-100/70',
        inputClass: 'border-green-300 text-green-900 bg-white/70'
      };
    }

    if (
      hasAgency &&
      offerValue >= (hasCompetition ? (competitionValue as number) - epsilon : offerValue - epsilon) &&
      offerValue <= (agencyValue as number) + epsilon
    ) {
      const diffToCost = Math.abs((agencyValue as number) - offerValue);
      const base = Math.max(agencyValue as number, 1);
      const ratio = Math.min(diffToCost / base, 1);

      if (ratio < 0.05) {
        return {
          cellClass: 'bg-yellow-200/60',
          inputClass: 'border-yellow-400 text-yellow-900 bg-white/70'
        };
      }

      return {
        cellClass: 'bg-yellow-100/60',
        inputClass: 'border-yellow-300 text-yellow-900 bg-white/70'
      };
    }

    return defaultHighlight;
  };

  useEffect(() => {
    if (!isOpen) {
      setActiveCell(null);
      setActiveDraft('');
      setMarginDraft(offerMargin.toFixed(2));
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, offerMargin]);

  useEffect(() => {
    if (isOpen) {
      setMarginDraft(offerMargin.toFixed(2));
    }
  }, [isOpen, offerMargin]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    requestAnimationFrame(() => {
      const { innerWidth, innerHeight } = window;
      const width = panelRef.current?.offsetWidth ?? 0;
      const height = panelRef.current?.offsetHeight ?? 0;
      const centeredX = Math.max((innerWidth - width) / 2, PANEL_MARGIN);
      const centeredY = Math.max((innerHeight - height) / 2, PANEL_MARGIN);
      setPosition({ x: centeredX, y: centeredY });
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isDragging) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent) => {
      setPosition(prev => {
        const width = panelRef.current?.offsetWidth ?? 0;
        const height = panelRef.current?.offsetHeight ?? 0;
        const maxX = Math.max(window.innerWidth - width - PANEL_MARGIN, PANEL_MARGIN);
        const maxY = Math.max(window.innerHeight - height - PANEL_MARGIN, PANEL_MARGIN);
        return {
          x: Math.min(Math.max(event.clientX - dragState.current.offsetX, PANEL_MARGIN), maxX),
          y: Math.min(Math.max(event.clientY - dragState.current.offsetY, PANEL_MARGIN), maxY)
        };
      });
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (dragState.current.pointerId !== null && panelRef.current) {
        try {
          panelRef.current.releasePointerCapture(dragState.current.pointerId);
        } catch (error) {
          // ignore release errors (e.g. pointer already released)
        }
      }
      dragState.current.pointerId = null;
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  const handleDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panelRef.current) {
      return;
    }

    if (event.target instanceof HTMLElement) {
      const interactive = event.target.closest('button,select,input');
      if (interactive && interactive !== event.currentTarget) {
        return;
      }
    }

    dragState.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - position.x,
      offsetY: event.clientY - position.y
    };

    try {
      panelRef.current.setPointerCapture(event.pointerId);
    } catch (error) {
      // ignore pointer capture errors
    }

    setIsDragging(true);
  };

  const handleHeaderPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLElement) {
      const interactive = event.target.closest('button,select,input');
      if (interactive) {
        return;
      }
    }

    handleDragStart(event);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <style>{sliderStyles}</style>
      <div className="absolute inset-0 bg-black/40" role="presentation" onClick={onClose} />
      <aside
        ref={panelRef}
        className="absolute w-[98vw] max-w-[1400px] bg-white shadow-2xl border border-gray-200 rounded-2xl"
        style={{ left: position.x, top: position.y }}
        aria-modal="true"
        role="dialog"
      >
        <div className="border-b border-gray-200 px-6 py-4 rounded-t-2xl bg-white">
          <div className="flex flex-col gap-3" onPointerDown={handleHeaderPointerDown}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <h2 className="text-lg font-semibold text-gray-900">Comparador comercial</h2>
                <p className="text-sm text-gray-500">
                  Introduce y compara precios manuales frente a los costes calculados.
                </p>
              </div>
            </div>
            <div className="grid w-full grid-cols-[auto_auto_auto_minmax(0,1fr)_auto_auto] items-end gap-3">
              <button
                type="button"
                ref={closeButtonRef}
                onClick={onClose}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
              >
                Cerrar
              </button>
              <label className="text-[11px] font-medium text-gray-800 w-44">
                Servicio a comparar
                <select
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={selectedService}
                  onChange={event => onServiceChange(event.target.value)}
                >
                  {availableServices.map(service => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[11px] font-medium text-gray-800 w-48">
                Plan comercial aplicable
                <select
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={selectedPlan}
                  onChange={event => onPlanChange(event.target.value)}
                >
                  <option value="">Sin plan</option>
                  {discountPlans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.plan_name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-col w-full min-w-[18rem]">
                <div className="flex items-center justify-between text-[11px] text-gray-800">
                  <span>Margen objetivo sobre venta</span>
                  <span className="font-semibold">{offerMargin.toFixed(0)}%</span>
                </div>
                <div className="relative w-full pt-5">
                  <div
                    className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full"
                    style={{ background: sliderGradient }}
                    aria-hidden="true"
                  />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={offerMargin}
                    onChange={event => {
                      const value = Number(event.target.value);
                      onOfferMarginChange(value);
                      setMarginDraft(value.toFixed(2));
                    }}
                    className="comparator-slider relative z-10 w-full"
                    aria-label="Margen objetivo sobre venta"
                  />
                  <div
                    className="absolute top-0 flex"
                    style={{ left: `${sliderIndicatorPosition}%`, transform: 'translateX(-50%) translateY(-90%)' }}
                    aria-hidden="true"
                  >
                    <span className="px-2 py-1 text-[10px] font-semibold text-white bg-gray-900 rounded-full shadow">
                      {offerMargin.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div
                  className="grid text-[9px] text-gray-600"
                  style={{ gridTemplateColumns: 'repeat(21, minmax(0, 1fr))' }}
                  aria-hidden="true"
                >
                  {SLIDER_TICKS.map(tick => (
                    <span key={tick} className="text-center">
                      {tick}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-800">
                  <span>Margen medio actual</span>
                  <span className="font-semibold">{offerAverageMargin.toFixed(2)}%</span>
                </div>
                <label className="mt-2 text-[11px] font-medium text-gray-800">
                  Margen deseado (%)
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9.,]*"
                    value={marginDraft}
                    onChange={event => {
                      setMarginDraft(event.target.value);
                    }}
                    onBlur={() => {
                      const parsed = parseInputValue(marginDraft);
                      const clamped = Math.min(100, Math.max(0, parsed));
                      onOfferMarginChange(clamped);
                      setMarginDraft(clamped.toFixed(2));
                    }}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        const parsed = parseInputValue(marginDraft);
                        const clamped = Math.min(100, Math.max(0, parsed));
                        onOfferMarginChange(clamped);
                        setMarginDraft(clamped.toFixed(2));
                      }
                    }}
                    className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 text-[11px] text-gray-600">
                {sopLauncher}
                <button
                  type="button"
                  onClick={() => {
                    setActiveCell(null);
                    setActiveDraft('');
                    onReset();
                  }}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                >
                  Limpiar
                </button>
                <span className="max-w-xs text-left">
                  Para reiniciar por completo y perder los cambios, cierre el comparador y pulse «Limpiar datos» en el panel principal.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-8 max-h-[82vh] overflow-y-auto">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {(['competition', 'agency', 'offer'] as ComparatorBlockKey[]).map(block => {
            return (
              <div key={block} className="bg-gray-50 border border-gray-200 rounded-xl shadow-sm">
                <div className={`${blockHeaders[block].color} px-4 py-3 border-b border-gray-200 rounded-t-xl`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                        {blockHeaders[block].title}
                      </h3>
                      <p className="text-xs text-gray-700 font-medium">
                        {blockHeaders[block].subtitle}
                      </p>
                    </div>
                    {block === 'offer' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={onMatchCompetition}
                          className="inline-flex items-center px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-semibold shadow hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500"
                        >
                          Ajustar a la competencia
                        </button>
                        <ComparatorMiniSOPGenerator
                          serviceName={selectedService}
                          offerTable={tables.offer}
                        />
                      </div>
                    )}
                  </div>
                </div>
                  <div className="p-4">
                    <table className="w-full table-fixed text-[11px]">
                      <thead>
                        <tr>
                          <th className="text-left font-semibold text-gray-700 pb-2 pr-2">Zona</th>
                          {COMPARATOR_COLUMNS.map(column => (
                            <th key={column} className="text-center font-semibold text-gray-700 pb-2 px-1">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {COMPARATOR_ZONES.map(zone => (
                          <tr key={zone}>
                            <th className="text-left font-medium text-gray-700 py-2 pr-2">{zone}</th>
                            {COMPARATOR_COLUMNS.map(column => {
                              const value = tables[block][zone][column];
                              const numericValue = Number.isFinite(value) ? Number(value) : 0;

                              if (block === 'competition') {
                                return (
                                  <td key={column} className="px-1 py-1.5">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      pattern="[0-9.,]*"
                                      data-cell-id={getCellId(block, zone, column)}
                                      value={
                                        activeCell &&
                                        activeCell.block === block &&
                                        activeCell.zone === zone &&
                                        activeCell.column === column
                                          ? activeDraft
                                          : formatInputValue(numericValue)
                                      }
                                      onFocus={event => {
                                        focusCell(block, zone, column, numericValue);
                                        event.target.select();
                                      }}
                                      onBlur={() => {
                                        commitActiveDraft();
                                      }}
                                  onKeyDown={event => {
                                    if (event.key === 'Enter') {
                                      event.preventDefault();
                                      commitActiveDraft();
                                    }
                                    if (event.key === 'Tab') {
                                      const origin = { block, zone, column };
                                      commitActiveDraft();
                                      const moved = moveFocusFromCell(origin, event.shiftKey ? -1 : 1);
                                      if (moved) {
                                        event.preventDefault();
                                      }
                                    }
                                  }}
                                  onChange={event => {
                                    if (
                                      activeCell &&
                                      activeCell.block === block &&
                                          activeCell.zone === zone &&
                                          activeCell.column === column
                                        ) {
                                          setActiveDraft(event.target.value);
                                        } else {
                                          focusCell(block, zone, column, numericValue);
                                          setActiveDraft(event.target.value);
                                        }
                                      }}
                                      className={`${baseEditableInputClasses} border-gray-300 text-gray-900 bg-white`}
                                    />
                                  </td>
                                );
                              }

                              if (block === 'offer') {
                                const competitionValue = tables.competition[zone][column];
                                const agencyValue = tables.agency[zone][column];
                                const { cellClass, inputClass } = getOfferHighlightClasses(
                                  numericValue,
                                  Number(competitionValue),
                                  Number(agencyValue)
                                );

                                return (
                                  <td key={column} className={`px-1 py-1.5 text-right text-[11px] ${cellClass}`}>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      pattern="[0-9.,]*"
                                      data-cell-id={getCellId(block, zone, column)}
                                      value={
                                        activeCell &&
                                        activeCell.block === block &&
                                        activeCell.zone === zone &&
                                        activeCell.column === column
                                          ? activeDraft
                                          : formatInputValue(numericValue)
                                      }
                                      onFocus={event => {
                                        focusCell(block, zone, column, numericValue);
                                        event.target.select();
                                      }}
                                      onBlur={() => {
                                        commitActiveDraft();
                                      }}
                                  onKeyDown={event => {
                                    if (event.key === 'Enter') {
                                      event.preventDefault();
                                      commitActiveDraft();
                                    }
                                    if (event.key === 'Tab') {
                                      const origin = { block, zone, column };
                                      commitActiveDraft();
                                      const moved = moveFocusFromCell(origin, event.shiftKey ? -1 : 1);
                                      if (moved) {
                                        event.preventDefault();
                                      }
                                    }
                                  }}
                                      onChange={event => {
                                        if (
                                          activeCell &&
                                          activeCell.block === block &&
                                          activeCell.zone === zone &&
                                          activeCell.column === column
                                        ) {
                                          setActiveDraft(event.target.value);
                                        } else {
                                          focusCell(block, zone, column, numericValue);
                                          setActiveDraft(event.target.value);
                                        }
                                      }}
                                      className={`${baseEditableInputClasses} ${inputClass}`}
                                    />
                                  </td>
                                );
                              }

                              const competitionValue = tables.competition[zone][column];
                              const diff = numericValue - (Number.isFinite(competitionValue)
                                ? Number(competitionValue)
                                : 0);

                              let emphasisClass = '';
                              if (diff > 0.01) {
                                const baseReference = Number.isFinite(competitionValue)
                                  ? Math.max(Number(competitionValue), 0.01)
                                  : 1;
                                const ratio = Math.min(diff / baseReference, 1);

                                if (ratio > 0.5) {
                                  emphasisClass = ' bg-red-300';
                                } else if (ratio > 0.2) {
                                  emphasisClass = ' bg-red-200';
                                } else {
                                  emphasisClass = ' bg-red-100';
                                }
                              }

                              return (
                                <td key={column} className={`px-1 py-1.5 text-right text-[11px]${emphasisClass}`}>
                                  <span className="inline-block w-full rounded-md border border-transparent bg-white/60 px-1 py-1 text-right font-semibold text-gray-900">
                                    {numericValue.toLocaleString('es-ES', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    })}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-gray-600">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-yellow-200/60 border border-yellow-400" aria-hidden="true" />
              Margen igual o inferior al coste.
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-green-200/70 border border-green-400" aria-hidden="true" />
              PVP inferior al precio de la competencia.
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-red-200 border border-red-400" aria-hidden="true" />
              Coste agencia superior a la competencia.
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default CommercialComparatorPanel;
