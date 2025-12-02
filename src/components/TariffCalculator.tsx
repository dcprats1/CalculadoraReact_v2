import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Package, AlertCircle, Calculator, ArrowUp, MapPin, Settings, LogOut, User, Eye, EyeOff, Sliders } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useViewMode } from '../contexts/ViewModeContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { trackPackageCalculation } from '../utils/tracking';
import { UserSettingsPanel } from './settings/UserSettingsPanel';
import { AdminPanel } from './admin/AdminPanel';
import CommercialPlansManager from './settings/CommercialPlansManager';
import { useCommercialPlans } from '../hooks/useCommercialPlans';
import { CommercialPlan } from '../types/commercialPlans';
import { calculateCustomPlanDiscount, getCustomPlanDisplayInfo } from '../utils/customCommercialPlans';
import { useTariffs, useDiscountPlans, useCustomTariffsActive } from '../hooks/useSupabaseData';
import {
  PackageData,
  DESTINATION_ZONES,
  calculateCostBreakdown,
  CostBreakdown,
  STATIC_SERVICES,
  createEmptyCostBreakdown,
  SHIPPING_MODES,
  ShippingMode,
  SHIPPING_MODE_LABELS,
  computeZoneCostForPackage,
  DestinationZone,
  formatCurrency,
  formatPercentage,
  roundUp,
  getEnergyRateForService,
  calculatePlanDiscountForWeight,
  isParcelShopService
} from '../utils/calculations';
import PackageManager from './PackageManager';
import CostBreakdownTable from './CostBreakdownTable';
import SOPGenerator from './sop/SOPGenerator';
import MiniSOPLauncher from './sop/MiniSOPLauncher';
import CommercialComparatorPanel, {
  COMPARATOR_COLUMNS,
  COMPARATOR_ZONES,
  ComparatorBlockKey,
  ComparatorColumn,
  ComparatorTable,
  ComparatorZone
} from './CommercialComparatorPanel';
import {
  CUSTOM_DISCOUNT_PLANS,
  getCustomPlanDefinition,
  getCustomPlanMessage,
  getCustomPlanPercentage,
  findPlanForServiceGroup,
  getPlanGroupKey
} from '../utils/customPlans';

const buildEmptyBreakdowns = (): Record<string, CostBreakdown> => {
  const breakdowns: Record<string, CostBreakdown> = {};
  DESTINATION_ZONES.forEach(zone => {
    breakdowns[zone] = createEmptyCostBreakdown();
  });
  return breakdowns;
};

const createDefaultPackage = (): PackageData => ({
  id: `pkg-${Date.now().toString(36)}`,
  weight: 1.0,
  finalWeight: 1.0,
  quantity: 1
});

const createEmptyComparatorTable = (): ComparatorTable => {
  return COMPARATOR_ZONES.reduce((zoneAcc, zone) => {
    zoneAcc[zone] = COMPARATOR_COLUMNS.reduce((colAcc, column) => {
      colAcc[column] = 0;
      return colAcc;
    }, {} as Record<ComparatorColumn, number>);

    return zoneAcc;
  }, {} as ComparatorTable);
};

const createInitialComparatorState = (): Record<ComparatorBlockKey, ComparatorTable> => ({
  competition: createEmptyComparatorTable(),
  agency: createEmptyComparatorTable(),
  offer: createEmptyComparatorTable()
});

type ComparatorManualFlags = Record<ComparatorZone, Record<ComparatorColumn, boolean>>;

const createEmptyComparatorManualFlags = (): ComparatorManualFlags =>
  COMPARATOR_ZONES.reduce((zoneAcc, zone) => {
    zoneAcc[zone] = COMPARATOR_COLUMNS.reduce((colAcc, column) => {
      colAcc[column] = false;
      return colAcc;
    }, {} as Record<ComparatorColumn, boolean>);

    return zoneAcc;
  }, {} as ComparatorManualFlags);

const COMPARATOR_ZONE_TO_DESTINATION: Record<ComparatorZone, DestinationZone> = {
  'Prov.': 'Provincial',
  'Reg.': 'Regional',
  'Pen.': 'Nacional',
  'Port.': 'Portugal',
  'Can.My.': 'Canarias Mayores',
  'Can.Mn.': 'Canarias Menores',
  'Bal.My.': 'Baleares Mayores',
  'Bal.Mn.': 'Baleares Menores',
  Ceuta: 'Ceuta',
  Melilla: 'Melilla'
};

const COMPARATOR_COLUMN_WEIGHTS: Record<ComparatorColumn, number> = {
  '0 a 1kg': 1,
  '1 a 3kg': 3,
  '3 a 5kg': 5,
  '5 a 10kg': 10,
  '10 a 15kg': 15,
  'kg. adc': 16
};

type ServiceIncrementConfig = {
  base: number;
  overrides: Partial<Record<DestinationZone, number>>;
};

const SERVICE_INCREMENT_RULES: Record<string, ServiceIncrementConfig> = {
  'Urg8:30H Courier': {
    base: 9,
    overrides: {
      'Canarias Mayores': 10,
      'Canarias Menores': 10
    }
  },
  'Urg10H Courier': {
    base: 9,
    overrides: {
      'Canarias Mayores': 10,
      'Canarias Menores': 10,
      'Baleares Mayores': 10,
      'Baleares Menores': 10
    }
  },
  'Urg14H Courier': {
    base: 9,
    overrides: {
      'Canarias Mayores': 10,
      'Canarias Menores': 10,
      'Baleares Mayores': 10,
      'Baleares Menores': 10
    }
  },
  'Urg19H Courier': {
    base: 6,
    overrides: {
      'Canarias Mayores': 10,
      'Canarias Menores': 10,
      'Baleares Mayores': 10,
      'Baleares Menores': 10
    }
  },
  'Economy Parcel': {
    base: 2,
    overrides: {
      'Canarias Mayores': 4,
      'Canarias Menores': 4,
      'Baleares Mayores': 4,
      'Baleares Menores': 4
    }
  },
  'Marítimo': { base: 4, overrides: {} },
  'Business Parcel': {
    base: 0,
    overrides: {
      'Canarias Mayores': 4,
      'Canarias Menores': 4
    }
  },
  'EuroBusiness Parcel': { base: 0, overrides: {} },
  'Parcel Shop': { base: 0, overrides: {} }
};

const EXPRESS_SERVICES = new Set<string>([
  'Urg8:30H Courier',
  'Urg10H Courier',
  'Urg14H Courier'
]);

const SERVICE_INCREMENT_2025_RULES: Record<string, Partial<Record<DestinationZone, number>>> = {
  'Urg8:30H Courier': {
    Provincial: 5,
    Regional: 5,
    Nacional: 5,
    Portugal: 5,
    'Baleares Mayores': 5,
    'Baleares Menores': 5
  },
  'Urg10H Courier': {
    Provincial: 5,
    Regional: 5,
    Nacional: 5,
    Portugal: 5,
    'Baleares Mayores': 5,
    'Baleares Menores': 5
  },
  'Urg14H Courier': {
    Provincial: 5,
    Regional: 5,
    Nacional: 5,
    Portugal: 5,
    'Baleares Mayores': 5,
    'Baleares Menores': 5
  },
  'Urg19H Courier': {
    Provincial: 3,
    Regional: 3,
    Nacional: 3,
    Portugal: 3,
    Andorra: 3,
    Gibraltar: 3
  }
};

const UNIVERSAL_2025_OVERRIDES: Partial<Record<DestinationZone, number>> = {
  'Canarias Mayores': 3,
  'Canarias Menores': 3,
  'Baleares Mayores': 3,
  'Baleares Menores': 3
};

const ISLAND_ONLY_2025_SERVICES = new Set<string>([
  'Business Parcel',
  'Economy Parcel',
  'Marítimo',
  'Parcel Shop'
]);

const IRREGULAR_SURCHARGE = 7;

type MileageTotals = {
  cost: number;
  sale: number;
};

const ZERO_MILEAGE_TOTALS: MileageTotals = { cost: 0, sale: 0 };

const computeMileageTotals = (
  mileageKm: number,
  mileagePvpPerKm: number,
  mileageCostPerKm: number,
  selectedService: string,
  saturdayDelivery: boolean
): MileageTotals => {
  const mileageAllowed =
    selectedService === 'Urg10H Courier' ||
    (selectedService === 'Urg14H Courier' && saturdayDelivery);

  if (!mileageAllowed || !Number.isFinite(mileageKm) || mileageKm <= 0) {
    return ZERO_MILEAGE_TOTALS;
  }

  const salePerKm = Number.isFinite(mileagePvpPerKm) ? mileagePvpPerKm : 0;

  return {
    cost: roundUp(mileageKm * mileageCostPerKm),
    sale: roundUp(mileageKm * salePerKm)
  };
};


const getServiceIncrementConfig = (service: string): ServiceIncrementConfig => {
  const config = SERVICE_INCREMENT_RULES[service];
  if (!config) {
    return { base: 0, overrides: {} };
  }
  return {
    base: config.base,
    overrides: config.overrides ?? {}
  };
};

const getZoneIncrement = (service: string, zone: DestinationZone): number => {
  const config = getServiceIncrementConfig(service);
  return config.overrides[zone] ?? config.base;
};


const getZoneIncrement2025 = (service: string, zone: DestinationZone): number => {
  const serviceOverrides = SERVICE_INCREMENT_2025_RULES[service];
  const serviceValue = serviceOverrides?.[zone] ?? 0;
  if (service === 'EuroBusiness Parcel') {
    return serviceValue;
  }

  const universalValue = UNIVERSAL_2025_OVERRIDES[zone] ?? 0;

  return Math.max(serviceValue, universalValue);
};

const getMaxIncrement2025ForService = (service: string): number => {
  return DESTINATION_ZONES.reduce(
    (max, zone) => Math.max(max, getZoneIncrement2025(service, zone)),
    0
  );
};

const TariffCalculator: React.FC = () => {
  const { userData, signOut } = useAuth();
  const { viewMode, setViewMode, isAdminView } = useViewMode();
  const [showSettings, setShowSettings] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [tariffRefetchTrigger, setTariffRefetchTrigger] = useState(0);

  const {
    tariffs = [],
    loading: tariffsLoading = true,
    error: tariffsError = null
  } = useTariffs(undefined, false, true, tariffRefetchTrigger) ?? {};

  const {
    discountPlans: remoteDiscountPlans = [],
    loading: discountLoading = true,
    error: discountError = null
  } = useDiscountPlans() ?? {};

  // IMPORTANTE: Pasamos userData?.id para filtrar por usuario actual
  // Esto garantiza que solo se cargan los estados de activación del usuario autenticado
  const { activeStates: customTariffsActiveStates = [], refetch: refetchActiveStates } = useCustomTariffsActive(userData?.id) ?? {};

  const { preferences } = usePreferences();

  const [selectedService, setSelectedService] = useState<string>(STATIC_SERVICES[0]);

  const isCustomTariffActive = useMemo(() => {
    return customTariffsActiveStates.some(s => s.service_name === selectedService && s.is_active);
  }, [customTariffsActiveStates, selectedService]);
  const [marginPercentage, setMarginPercentage] = useState<number>(40);
  const [selectedDiscountPlan, setSelectedDiscountPlan] = useState<string>('');
  const [selectedPlanGroup, setSelectedPlanGroup] = useState<string>('');
  const lastAlertedPlanRef = useRef<string | null>(null);
  const [packages, setPackages] = useState<PackageData[]>(() => [createDefaultPackage()]);
  const [shippingMode, setShippingMode] = useState<ShippingMode>('salida');

  // Cost adjustment parameters
  const [incr2026, setIncr2026] = useState<number>(0);
  const [spc, setSpc] = useState<number>(0);
  const [suplementos, setSuplementos] = useState<number>(0);
  const [irregular, setIrregular] = useState<number>(0);
  const [linearDiscount, setLinearDiscount] = useState<number>(0);
  const [mileageKm, setMileageKm] = useState<number>(0);
  const [mileagePvpPerKm, setMileagePvpPerKm] = useState<number>(0);
  const [dismissedMileageServices, setDismissedMileageServices] = useState<Record<string, boolean>>({});
  const [showMileageWarning, setShowMileageWarning] = useState<boolean>(false);
  const [saturdayDelivery, setSaturdayDelivery] = useState<boolean>(false);
  const [saturdayPvp, setSaturdayPvp] = useState<number>(0);
  const [provincialCostOverride, setProvincialCostOverride] = useState<number | null>(null);
  const [costBreakdowns, setCostBreakdowns] = useState<Record<string, CostBreakdown>>(() => buildEmptyBreakdowns());
  const [missingZones, setMissingZones] = useState<string[]>([]);
  const [restrictedZones, setRestrictedZones] = useState<string[]>([]);
  const [showCosts, setShowCosts] = useState<boolean>(false);
  const [showPvp, setShowPvp] = useState<boolean>(false);
  const [isComparatorOpen, setIsComparatorOpen] = useState<boolean>(false);
  const [comparatorTables, setComparatorTables] = useState<Record<ComparatorBlockKey, ComparatorTable>>(
    () => createInitialComparatorState()
  );
  const [comparatorOfferMargin, setComparatorOfferMargin] = useState<number>(40);
  const [comparatorOfferManualFlags, setComparatorOfferManualFlags] = useState<ComparatorManualFlags>(
    () => createEmptyComparatorManualFlags()
  );
  const [comparatorServiceSelection, setComparatorServiceSelection] = useState<string>(selectedService);
  const skipNextComparatorAutoRecalc = useRef(false);
  const [isPlansManagerOpen, setIsPlansManagerOpen] = useState<boolean>(false);
  const { plans: customCommercialPlans, loading: plansLoading, loadPlans: reloadCustomPlans } = useCommercialPlans();
  const [selectedCustomPlanId, setSelectedCustomPlanId] = useState<string | null>(null);

  const selectedCustomPlan = useMemo(
    () => customCommercialPlans.find(p => p.id === selectedCustomPlanId) || null,
    [customCommercialPlans, selectedCustomPlanId]
  );

  const allDiscountPlans = useMemo(() => {
    const userPlansAsDiscounts = customCommercialPlans.flatMap(plan => {
      const services = [
        'Urg8:30H Courier',
        'Urg10H Courier',
        'Urg14H Courier',
        'Urg19H Courier',
        'Business Parcel',
        'Economy Parcel',
        'EuroBusiness Parcel'
      ];

      return services.map(serviceName => ({
        id: `user-plan-${plan.id}-${serviceName}`,
        plan_name: plan.plan_name,
        service_name: serviceName,
        discount_type: 'custom' as const,
        discount_value: 0,
        min_volume: 0,
        applies_to: 'cost' as const,
        is_active: true,
        created_at: plan.created_at,
        _userPlanId: plan.id
      }));
    });

    return [...remoteDiscountPlans, ...CUSTOM_DISCOUNT_PLANS, ...userPlansAsDiscounts];
  }, [remoteDiscountPlans, customCommercialPlans]);

  const applicableDiscountPlans = useMemo(
    () =>
      allDiscountPlans.filter(
        plan => plan.service_name === selectedService && plan.is_active
      ),
    [allDiscountPlans, selectedService]
  );

  const planForSelectedService = useMemo(
    () => findPlanForServiceGroup(allDiscountPlans, selectedPlanGroup, selectedService) ?? null,
    [allDiscountPlans, selectedPlanGroup, selectedService]
  );

  const planGroupDisplayName = useMemo(() => {
    if (!selectedPlanGroup) {
      return '';
    }

    const matching = allDiscountPlans.find(
      plan => getPlanGroupKey(plan) === selectedPlanGroup
    );

    return matching?.plan_name ?? '';
  }, [allDiscountPlans, selectedPlanGroup]);

  const comparatorDiscountPlans = useMemo(
    () =>
      allDiscountPlans.filter(
        plan => plan.service_name === comparatorServiceSelection && plan.is_active
      ),
    [allDiscountPlans, comparatorServiceSelection]
  );

  const comparatorPlan = useMemo(
    () => findPlanForServiceGroup(allDiscountPlans, selectedPlanGroup, comparatorServiceSelection) ?? null,
    [allDiscountPlans, selectedPlanGroup, comparatorServiceSelection]
  );

  const comparatorPlanId = comparatorPlan?.id ?? '';

  const serviceIncrementConfig = useMemo(
    () => getServiceIncrementConfig(selectedService),
    [selectedService]
  );

  const maxServiceIncrement2025 = useMemo(
    () => getMaxIncrement2025ForService(selectedService),
    [selectedService]
  );

  const irregularAnalysis = useMemo(() => {
    let irregularCount = 0;
    let hasNonEncintablePackages = false;

    packages.forEach(pkg => {
      const quantity = Math.max(1, Math.round(pkg.quantity ?? 1));
      if (quantity <= 0) {
        return;
      }

      const height = pkg.dimensions?.height ?? 0;
      const width = pkg.dimensions?.width ?? 0;
      const length = pkg.dimensions?.length ?? 0;
      const perimeter = height + width + length;
      const maxSide = Math.max(height, width, length);
      const actualWeight = pkg.weight ?? 0;

      const isIrregular = perimeter > 300 || maxSide > 200 || actualWeight > 40;
      if (isIrregular) {
        irregularCount += quantity;
      }

      if (maxSide > 120) {
        hasNonEncintablePackages = true;
      }
    });

    const autoIrregularCost = irregularCount * IRREGULAR_SURCHARGE;

    return {
      irregularCount,
      autoIrregularCost,
      hasIrregularPackages: irregularCount > 0,
      hasNonEncintablePackages
    };
  }, [packages]);

  useEffect(() => {
    setIrregular(irregularAnalysis.autoIrregularCost);
  }, [irregularAnalysis.autoIrregularCost]);

  const showIrregularTransitWarning = useMemo(() => {
    return EXPRESS_SERVICES.has(selectedService) && irregularAnalysis.hasIrregularPackages;
  }, [irregularAnalysis.hasIrregularPackages, selectedService]);

  const showNonEncintableWarning = irregularAnalysis.hasNonEncintablePackages;

  const mileageCostPerKm = 0.34;
  const mileageTotals = useMemo(
    () =>
      computeMileageTotals(
        mileageKm,
        mileagePvpPerKm,
        mileageCostPerKm,
        selectedService,
        saturdayDelivery
      ),
    [mileageKm, mileagePvpPerKm, mileageCostPerKm, saturdayDelivery, selectedService]
  );

  const mileageCostTotal = mileageTotals.cost;
  const mileageSaleTotal = mileageTotals.sale;

  const showMileageBanner =
    selectedService === 'Urg10H Courier' ||
    (selectedService === 'Urg14H Courier' && saturdayDelivery);

  const comparatorAgencyTable = useMemo(() => {
    if (tariffsLoading || !comparatorServiceSelection) {
      return createEmptyComparatorTable();
    }

    const serviceTariffs = tariffs.filter(
      tariff => tariff.service_name === comparatorServiceSelection
    );

    if (!serviceTariffs.length) {
      return createEmptyComparatorTable();
    }

    const comparatorIsParcelShop = isParcelShopService(comparatorServiceSelection);
    const effectiveLinearDiscount =
      selectedPlanGroup || selectedCustomPlan || comparatorIsParcelShop ? 0 : linearDiscount;
    const saturdayCostValue =
      comparatorServiceSelection === 'Urg14H Courier' && saturdayDelivery ? 2.5 : 0;
    const comparatorPlanDefinition = comparatorPlanId
      ? getCustomPlanDefinition(comparatorPlanId)
      : undefined;
    const comparatorPlanMatchesService = Boolean(comparatorPlanDefinition);
    const comparatorEnergyRate = getEnergyRateForService(comparatorServiceSelection);

    const buildBreakdownForWeight = (
      weight: number,
      zone: DestinationZone,
      zoneIncrement: number,
      zoneIncrement2025: number
    ): CostBreakdown | null => {
      if (weight <= 0) {
        return null;
      }

      const packageData: PackageData = {
        id: `cmp-${zone}-${weight}`,
        weight,
        finalWeight: weight,
        quantity: 1
      };

      const zoneCost = computeZoneCostForPackage(
        packageData,
        comparatorServiceSelection,
        zone,
        shippingMode,
        serviceTariffs
      );

      if (!zoneCost.available) {
        return null;
      }

      const roundedCost = roundUp(zoneCost.cost);
      const weightForPlan = zoneCost.finalWeight ?? weight;
      let planDiscountAmount = 0;

      if (comparatorPlan) {
        const isUserPlan = comparatorPlan.id.startsWith('user-plan-');

        if (isUserPlan) {
          const userPlanId = (comparatorPlan as any)._userPlanId;
          const userPlan = customCommercialPlans.find(p => p.id === userPlanId);

          if (userPlan) {
            planDiscountAmount = calculateCustomPlanDiscount(
              serviceTariffs,
              userPlan,
              comparatorServiceSelection,
              zone,
              weightForPlan,
              shippingMode
            );
          }
        } else {
          const canApplyPlan =
            comparatorPlan.discount_type !== 'custom' || comparatorPlanMatchesService;

          if (canApplyPlan) {
            planDiscountAmount = calculatePlanDiscountForWeight(
              serviceTariffs,
              comparatorServiceSelection,
              zone,
              comparatorPlan,
              weightForPlan,
              shippingMode
            );
          }
        }
      }

      return calculateCostBreakdown(
        roundedCost,
        zoneIncrement,
        zoneIncrement2025,
        incr2026,
        spc,
        suplementos,
        irregular,
        effectiveLinearDiscount,
        saturdayCostValue,
        0,
        {
          planDiscountAmount,
          energyRate: comparatorEnergyRate,
          serviceName: comparatorServiceSelection
        }
      );
    };

    const nextTable = createEmptyComparatorTable();

    COMPARATOR_ZONES.forEach(zoneKey => {
      const destination = COMPARATOR_ZONE_TO_DESTINATION[zoneKey];
      if (!destination) {
        return;
      }

      const zoneIncrement = getZoneIncrement(comparatorServiceSelection, destination);
      const zoneIncrement2025 = getZoneIncrement2025(comparatorServiceSelection, destination);

      COMPARATOR_COLUMNS.forEach(columnKey => {
        let computedValue = 0;

        if (columnKey === 'kg. adc') {
          const baseBreakdown = buildBreakdownForWeight(15, destination, zoneIncrement, zoneIncrement2025);
          const extraBreakdown = buildBreakdownForWeight(
            COMPARATOR_COLUMN_WEIGHTS[columnKey],
            destination,
            zoneIncrement,
            zoneIncrement2025
          );

          if (baseBreakdown && extraBreakdown) {
            computedValue = roundUp(Math.max(0, extraBreakdown.totalCost - baseBreakdown.totalCost));
          } else if (extraBreakdown) {
            computedValue = roundUp(extraBreakdown.totalCost);
          }
        } else {
          const targetWeight = COMPARATOR_COLUMN_WEIGHTS[columnKey];
          const breakdown = buildBreakdownForWeight(
            targetWeight,
            destination,
            zoneIncrement,
            zoneIncrement2025
          );

          if (breakdown) {
            computedValue = roundUp(breakdown.totalCost);
          }
        }

        nextTable[zoneKey][columnKey] = Number.isFinite(computedValue)
          ? computedValue
          : 0;
      });
    });

    return nextTable;
  }, [
    comparatorServiceSelection,
    incr2026,
    irregular,
    linearDiscount,
    saturdayDelivery,
    comparatorPlanId,
    comparatorPlan,
    selectedPlanGroup,
    shippingMode,
    spc,
    suplementos,
    tariffs,
    tariffsLoading,
    customCommercialPlans,
    selectedCustomPlan
  ]);

  const comparatorTablesForPanel = useMemo(
    () => ({
      ...comparatorTables,
      agency: comparatorAgencyTable
    }),
    [comparatorAgencyTable, comparatorTables]
  );

  useEffect(() => {
    setComparatorOfferManualFlags(createEmptyComparatorManualFlags());
  }, [comparatorServiceSelection, comparatorPlanId]);

  useEffect(() => {
    if (skipNextComparatorAutoRecalc.current) {
      skipNextComparatorAutoRecalc.current = false;
      return;
    }

    setComparatorTables(prev => {
      let hasChanges = false;

      const updatedOffer = COMPARATOR_ZONES.reduce((zoneAcc, zone) => {
        const currentZoneValues = prev.offer[zone];
        let zoneChanged = false;
        const zoneCopy: Record<ComparatorColumn, number> = { ...currentZoneValues };

        COMPARATOR_COLUMNS.forEach(column => {
          if (comparatorOfferManualFlags[zone][column]) {
            return;
          }

          const costValue = comparatorAgencyTable[zone][column];
          const denominator = Math.max(1 - comparatorOfferMargin / 100, 0.01);
          const computedValue = Number.isFinite(costValue)
            ? roundUp(costValue / denominator)
            : 0;

          if (Math.abs(zoneCopy[column] - computedValue) > 0.005) {
            zoneCopy[column] = computedValue;
            zoneChanged = true;
          }
        });

        if (zoneChanged) {
          hasChanges = true;
          zoneAcc[zone] = zoneCopy;
        } else {
          zoneAcc[zone] = currentZoneValues;
        }

        return zoneAcc;
      }, {} as ComparatorTable);

      if (!hasChanges) {
        return prev;
      }

      return {
        ...prev,
        offer: updatedOffer
      };
    });
  }, [comparatorAgencyTable, comparatorOfferManualFlags, comparatorOfferMargin]);

  const comparatorOfferAverageMargin = useMemo(() => {
    let weightedCost = 0;
    let weightedOffer = 0;

    COMPARATOR_ZONES.forEach(zone => {
      COMPARATOR_COLUMNS.forEach(column => {
        const costValue = comparatorAgencyTable[zone][column];
        const offerValue = comparatorTables.offer[zone][column];

        if (Number.isFinite(costValue) && Number.isFinite(offerValue) && offerValue > 0) {
          const weight = COMPARATOR_COLUMN_WEIGHTS[column];
          weightedCost += costValue * weight;
          weightedOffer += offerValue * weight;
        }
      });
    });

    const margin = weightedOffer > 0 ? ((weightedOffer - weightedCost) / weightedOffer) * 100 : 0;

    return {
      totalCost: weightedCost,
      totalOffer: weightedOffer,
      margin
    };
  }, [comparatorAgencyTable, comparatorTables.offer]);

  const discountSummary = useMemo(() => {
    if (planForSelectedService) {
      if (planForSelectedService.discount_type === 'custom') {
        let totalPercent = 0;
        let totalQuantity = 0;

        packages.forEach(pkg => {
          const quantity = Math.max(1, Math.round(pkg.quantity ?? 1));
          if (quantity <= 0) {
            return;
          }

          const weight = pkg.finalWeight ?? pkg.weight ?? 0;
          const percent = getCustomPlanPercentage(planForSelectedService.id, selectedService, weight);
          totalPercent += percent * quantity;
          totalQuantity += quantity;
        });

        const averagePercent = totalQuantity > 0 ? totalPercent / totalQuantity : 0;

        return {
          value: planForSelectedService.plan_name,
          description:
            totalQuantity > 0 && averagePercent > 0
              ? `Descuento medio aplicado: ${formatPercentage(averagePercent)}`
              : 'Aplicado según tramo de peso'
        };
      }

      if (planForSelectedService.discount_type === 'percentage') {
        return {
          value: planForSelectedService.plan_name,
          description: `-${formatPercentage(planForSelectedService.discount_value)} sobre coste base`
        };
      }

      if (planForSelectedService.discount_type === 'fixed') {
        return {
          value: planForSelectedService.plan_name,
          description: `-${formatCurrency(planForSelectedService.discount_value)} por envío`
        };
      }
    }

    if (selectedCustomPlan) {
      const planInfo = getCustomPlanDisplayInfo(selectedCustomPlan);
      return {
        value: planInfo.name,
        description: planInfo.description
      };
    }

    if (selectedPlanGroup) {
      return {
        value: planGroupDisplayName || 'Plan comercial seleccionado',
        description: 'No aplica descuento directo para este servicio'
      };
    }

    if (linearDiscount > 0) {
      return {
        value: `-${formatPercentage(linearDiscount)}`,
        description: 'Descuento lineal sobre coste base'
      };
    }

    return {
      value: 'Sin descuentos aplicados',
      description: undefined
    };
  }, [
    selectedCustomPlan,
    planForSelectedService,
    packages,
    selectedService,
    linearDiscount,
    selectedPlanGroup,
    planGroupDisplayName
  ]);

  const sanitizePackages = (items: PackageData[]): PackageData[] =>
    items.map(pkg => ({
      ...pkg,
      finalWeight: pkg.finalWeight ?? pkg.weight,
      quantity: Math.max(1, Math.round(pkg.quantity ?? 1))
    }));

  const renderServiceConfigurationCard = (wrapperClass = '') => (
    <div className={`bg-white rounded-lg shadow-md p-4 space-y-3 ${wrapperClass}`}>
      <h3 className="text-base font-semibold text-gray-900 flex items-center">
        <Package className="h-4 w-4 mr-2 text-blue-600" />
        Configuración del Envío
      </h3>

      <div className="space-y-3">
        {(() => {
          const showSaturdayOption = selectedService === 'Urg14H Courier';
          const showSaturdayPvpInput = selectedService === 'Urg14H Courier' && saturdayDelivery;

          return (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Servicio
                </label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {STATIC_SERVICES.map(service => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </div>

              {showSaturdayOption && (
                <div className="flex flex-col gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2">
                  <label className="inline-flex items-center text-sm font-medium text-blue-900">
                    <input
                      type="checkbox"
                      className="mr-2 h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                      checked={saturdayDelivery}
                      onChange={(event) => setSaturdayDelivery(event.target.checked)}
                    />
                    Entrega en sábado disponible
                  </label>
                  {showSaturdayPvpInput && (
                    <div className="pl-6">
                      <label className="block text-xs font-semibold text-blue-900 mb-1">
                        PVP entrega sábado (€)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={saturdayPvp}
                        onChange={(event) => setSaturdayPvp(Number(event.target.value) || 0)}
                        className="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          );
        })()}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="sm:basis-[30%] sm:max-w-[30%]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Margen Deseado (%)
            </label>
            <input
              type="number"
              value={marginPercentage}
              onChange={(e) => setMarginPercentage(Number(e.target.value))}
              min="0"
              max="100"
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Margen sobre venta</p>
          </div>
          <div className="sm:basis-[70%] sm:max-w-[70%]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Selección Plan Comercial Aplicable
            </label>
            <div className="flex gap-2">
              <select
                value={selectedCustomPlanId ? `user-plan-${selectedCustomPlanId}` : (planForSelectedService?.id || '')}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.startsWith('user-plan-')) {
                    setSelectedCustomPlanId(value.replace('user-plan-', ''));
                    setSelectedPlanGroup('');
                    setSelectedDiscountPlan('');
                  } else {
                    setSelectedCustomPlanId(null);
                    handleDiscountPlanSelection(value);
                  }
                }}
                disabled={applicableDiscountPlans.length === 0 && customCommercialPlans.length === 0}
                className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  applicableDiscountPlans.length === 0 && customCommercialPlans.length === 0
                    ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                    : 'border-gray-300'
                }`}
              >
                <option value="">
                  {applicableDiscountPlans.length === 0 && customCommercialPlans.length === 0 ? 'Sin planes disponibles' : 'Sin descuento'}
                </option>
                {applicableDiscountPlans.length > 0 && (
                  <optgroup label="Planes del Sistema">
                    {applicableDiscountPlans.map(plan => (
                      <option key={plan.id} value={plan.id}>
                        {plan.plan_name}
                        {plan.discount_type !== 'custom'
                          ? ` (-${plan.discount_value}${plan.discount_type === 'percentage' ? '%' : '€'})`
                          : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
                {customCommercialPlans.length > 0 && (
                  <optgroup label="Planes Personalizados">
                    {customCommercialPlans.map(plan => (
                      <option key={`user-plan-${plan.id}`} value={`user-plan-${plan.id}`}>
                        {plan.plan_name} (Personalizado)
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <button
                onClick={() => setIsPlansManagerOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap text-sm font-medium"
                title="Gestionar planes comerciales personalizados"
              >
                <Sliders size={16} />
                <span className="hidden sm:inline">Gestionar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCostAdjustmentsCard = (wrapperClass = '') => {
    const canariasMayores = serviceIncrementConfig.overrides['Canarias Mayores'] ?? serviceIncrementConfig.base;
    const canariasMenores = serviceIncrementConfig.overrides['Canarias Menores'] ?? serviceIncrementConfig.base;
    const balearesMayores = serviceIncrementConfig.overrides['Baleares Mayores'] ?? serviceIncrementConfig.base;
    const balearesMenores = serviceIncrementConfig.overrides['Baleares Menores'] ?? serviceIncrementConfig.base;
    const showCanarias = canariasMayores !== serviceIncrementConfig.base || canariasMenores !== serviceIncrementConfig.base;
    const showBaleares = balearesMayores !== serviceIncrementConfig.base || balearesMenores !== serviceIncrementConfig.base;
    const showIsland2025Badges = ISLAND_ONLY_2025_SERVICES.has(selectedService);
    const displayIncrement2025 = showIsland2025Badges ? 0 : maxServiceIncrement2025;
    const canariasIncrement2025 = UNIVERSAL_2025_OVERRIDES['Canarias Mayores'] ?? 0;
    const balearesIncrement2025 = UNIVERSAL_2025_OVERRIDES['Baleares Mayores'] ?? 0;

    const planActive = Boolean(selectedPlanGroup);

    return (
      <div className={`bg-white rounded-lg shadow-md p-4 ${wrapperClass}`}>
        <h3 className="text-base font-semibold text-gray-900 mb-3">
          Ajustes de Coste
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
              Incr. 2024 (%)
            </label>
            <input
              type="text"
              readOnly
              value={`${serviceIncrementConfig.base.toFixed(2)} %`}
              className="w-full px-2 py-1.5 border border-gray-200 rounded-md bg-gray-50 text-sm font-semibold text-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
              Incr. 2025 (%)
            </label>
            <input
              type="text"
              readOnly
              value={`${displayIncrement2025.toFixed(2)} %`}
              className="w-full px-2 py-1.5 border border-gray-200 rounded-md bg-gray-50 text-sm font-semibold text-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
              Incr. 2026 (%)
            </label>
            <input
              type="number"
              value={incr2026}
              onChange={(e) => setIncr2026(Number(e.target.value))}
              step="0.1"
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
              SPC (€)
            </label>
            <input
              type="number"
              value={spc}
              onChange={(e) => setSpc(Number(e.target.value))}
              step="0.01"
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
              Otros (€)
            </label>
            <input
              type="number"
              value={suplementos}
              onChange={(e) => setSuplementos(Number(e.target.value))}
              step="0.01"
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          <p className="text-xs text-gray-500 mt-1">
             Costes adicionales: cajas, bolsas, etiquetas,...
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
              Irregular (€)
            </label>
            <input
              type="text"
              readOnly
              value={formatCurrency(irregular)}
              className="w-full px-2 py-1.5 border border-gray-200 rounded-md bg-gray-50 text-sm font-semibold text-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">
              Se aplica automáticamente 7 € por cada bulto irregular detectado.
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
              Descuento lineal (%)
            </label>
            <input
              type="number"
              value={planActive ? 0 : linearDiscount}
              onChange={(e) => setLinearDiscount(Number(e.target.value))}
              min="0"
              step="0.1"
              disabled={planActive}
              className={`w-full px-2 py-1.5 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${planActive ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-gray-300'}`}
            />
            <p className="text-xs text-gray-500 mt-1">
              {planActive
                ? 'Los planes comerciales desactivan el descuento lineal manual.'
                : 'Se resta al coste inicial antes de recargos e incrementos.'}
            </p>
          </div>
          {showCanarias && (
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                Canarias (Incr. 2024)
              </label>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="flex-1 px-2 py-1 border border-gray-200 rounded-md bg-gray-50">
                  Mayores: {canariasMayores.toFixed(2)}%
                </span>
                <span className="flex-1 px-2 py-1 border border-gray-200 rounded-md bg-gray-50">
                  Menores: {canariasMenores.toFixed(2)}%
                </span>
              </div>
            </div>
          )}
          {showBaleares && (
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                Baleares (Incr. 2024)
              </label>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="flex-1 px-2 py-1 border border-gray-200 rounded-md bg-gray-50">
                  Mayores: {balearesMayores.toFixed(2)}%
                </span>
                <span className="flex-1 px-2 py-1 border border-gray-200 rounded-md bg-gray-50">
                  Menores: {balearesMenores.toFixed(2)}%
                </span>
              </div>
            </div>
          )}

          {showIsland2025Badges && (
            <>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                  Canarias (Incr. 2025)
                </label>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="flex-1 px-2 py-1 border border-gray-200 rounded-md bg-gray-50">
                    Mayores: {canariasIncrement2025.toFixed(2)}%
                  </span>
                  <span className="flex-1 px-2 py-1 border border-gray-200 rounded-md bg-gray-50">
                    Menores: {canariasIncrement2025.toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                  Baleares (Incr. 2025)
                </label>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="flex-1 px-2 py-1 border border-gray-200 rounded-md bg-gray-50">
                    Mayores: {balearesIncrement2025.toFixed(2)}%
                  </span>
                  <span className="flex-1 px-2 py-1 border border-gray-200 rounded-md bg-gray-50">
                    Menores: {balearesIncrement2025.toFixed(2)}%
                  </span>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    );
  };

  const handlePackagesChange = (updatedPackages: PackageData[]) => {
    setPackages(sanitizePackages(updatedPackages));
    trackPackageCalculation(userData?.id);
  };

  const handleProvincialCostChange = (value: number | null) => {
    if (value === null || Number.isNaN(value)) {
      setProvincialCostOverride(null);
      return;

    }

    setProvincialCostOverride(Math.max(0, value));
  };

  const handleClearPackages = () => {
    setPackages(current => {
      if (current.length === 0) {
        return [createDefaultPackage()];
      }

      const [first] = sanitizePackages(current);
      return [first];
    });
  };

  const handleResetAll = () => {
    setSelectedService(STATIC_SERVICES[0]);
    setMarginPercentage(40);
    setSelectedDiscountPlan('');
    setSelectedPlanGroup('');
    setShippingMode('salida');
    setIncr2026(0);
    setSpc(0);
    setSuplementos(0);
    setIrregular(0);
    setLinearDiscount(0);
    setMileageKm(0);
    setMileagePvpPerKm(0);
    setDismissedMileageServices({});
    setPackages([createDefaultPackage()]);
    setCostBreakdowns(buildEmptyBreakdowns());
    setMissingZones([]);
    setRestrictedZones([]);
    setShowCosts(false);
    setShowPvp(false);
    setSaturdayDelivery(false);
    setSaturdayPvp(0);
    setProvincialCostOverride(null);
    setComparatorTables(createInitialComparatorState());
    setComparatorOfferManualFlags(createEmptyComparatorManualFlags());
    setComparatorOfferMargin(40);
    setComparatorServiceSelection(STATIC_SERVICES[0]);
  };

  const toggleCostsPanel = () => {
    setShowCosts(prev => !prev);
  };

  const togglePvpPanel = () => {
    setShowPvp(prev => !prev);
  };

  const handleComparatorValueChange = (
    block: ComparatorBlockKey,
    zone: ComparatorZone,
    column: ComparatorColumn,
    value: number
  ) => {
    if (block === 'agency') {
      return;
    }

    const nextValue = Number.isFinite(value) ? Math.max(0, value) : 0;

    if (block === 'offer') {
      setComparatorOfferManualFlags(prev => ({
        ...prev,
        [zone]: {
          ...prev[zone],
          [column]: true
        }
      }));
    }

    setComparatorTables(prev => ({
      ...prev,
      [block]: {
        ...prev[block],
        [zone]: {
          ...prev[block][zone],
          [column]: nextValue
        }
      }
    }));
  };

  const handleComparatorOfferMarginChange = (value: number) => {
    const clamped = Math.min(100, Math.max(0, value));
    setComparatorOfferMargin(clamped);
  };

  const handleComparatorReset = () => {
    setComparatorTables(createInitialComparatorState());
    setComparatorOfferManualFlags(createEmptyComparatorManualFlags());
    setComparatorOfferMargin(40);
  };

  const handleComparatorMatchCompetition = () => {
    let hasMissingCompetition = false;

    COMPARATOR_ZONES.forEach(zone => {
      COMPARATOR_COLUMNS.forEach(column => {
        const competitionValue = comparatorTables.competition[zone][column];
        if (!Number.isFinite(competitionValue) || competitionValue <= 0) {
          hasMissingCompetition = true;
        }
      });
    });

    let fillMissingWithCost = true;
    if (hasMissingCompetition) {
      fillMissingWithCost = window.confirm(
        'Existen celdas sin precio en "Precios competencia". Pulsa Aceptar para rellenarlas con el coste base calculado o Cancelar para dejarlas a 0,00.'
      );
    }

    const nextOfferTable = createEmptyComparatorTable();
    let weightedCost = 0;
    let weightedOffer = 0;

    COMPARATOR_ZONES.forEach(zone => {
      COMPARATOR_COLUMNS.forEach(column => {
        const costValue = comparatorAgencyTable[zone][column];
        const competitionValue = comparatorTables.competition[zone][column];

        const cost = Number.isFinite(costValue) ? costValue : 0;
        const competition = Number.isFinite(competitionValue) ? competitionValue : 0;

        let baseValue = competition;
        if (competition <= 0) {
          baseValue = fillMissingWithCost ? cost : 0;
        }

        if (cost > 0 && baseValue > 0 && baseValue < cost) {
          baseValue = cost;
        }

        if (baseValue > 0) {
          const rounded = roundUp(baseValue);
          nextOfferTable[zone][column] = rounded;
          if (cost > 0) {
            const weight = COMPARATOR_COLUMN_WEIGHTS[column];
            weightedCost += cost * weight;
            weightedOffer += rounded * weight;
          }
        } else {
          nextOfferTable[zone][column] = 0;
        }
      });
    });

    setComparatorTables(prev => ({
      ...prev,
      offer: nextOfferTable
    }));
    setComparatorOfferManualFlags(createEmptyComparatorManualFlags());

    const resultingMargin = weightedOffer > 0 ? ((weightedOffer - weightedCost) / weightedOffer) * 100 : 0;
    skipNextComparatorAutoRecalc.current = true;
    setComparatorOfferMargin(Math.min(100, Math.max(0, resultingMargin)));
  };

  const handleDiscountPlanSelection = useCallback(
    (planId: string) => {
      if (!planId) {
        setSelectedPlanGroup('');
        setSelectedDiscountPlan('');
        return;
      }

      const matchingPlan = allDiscountPlans.find(plan => plan.id === planId);

      if (!matchingPlan) {
        setSelectedPlanGroup('');
        setSelectedDiscountPlan('');
        return;
      }

      setSelectedPlanGroup(getPlanGroupKey(matchingPlan));
      setSelectedDiscountPlan(matchingPlan.id);
    },
    [allDiscountPlans]
  );

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

  };

  const handleCloseMileageWarning = () => {
    setDismissedMileageServices(prev => ({
      ...prev,
      [selectedService]: true
    }));
    setShowMileageWarning(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setShowMenu(false);
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'admin' ? 'user' : 'admin');
    setShowMenu(false);
  };

  const handleToggleCustomTariff = async () => {
    if (!userData) return;

    try {
      // Si intenta activar la tabla personalizada, verificamos que existan datos
      if (!isCustomTariffActive) {
        // Verificar si existen tarifas personalizadas para este servicio
        const { data: existingCustomTariffs } = await supabase
          .from('custom_tariffs')
          .select('id')
          .eq('user_id', userData.id)
          .eq('service_name', selectedService)
          .limit(1);

        if (!existingCustomTariffs || existingCustomTariffs.length === 0) {
          window.alert(
            'No tienes una tabla de costes personalizada creada para este servicio.\n\n' +
            'Para crear tu tabla personalizada ve a:\n' +
            'Usuario → Configuración → Tarifas Personalizadas'
          );
          return;
        }
      }

      const existingState = customTariffsActiveStates.find(s => s.service_name === selectedService);

      if (existingState) {
        await supabase
          .from('custom_tariffs_active')
          .update({ is_active: !existingState.is_active })
          .eq('id', existingState.id);
      } else {
        await supabase
          .from('custom_tariffs_active')
          .insert([{
            user_id: userData.id,
            service_name: selectedService,
            is_active: true
          }]);
      }

      await refetchActiveStates();
      // Forzar recarga de tarifas para aplicar cambios
      setTariffRefetchTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error toggling custom tariff state:', error);
      window.alert('Error al cambiar el estado de la tabla personalizada');
    }
  };

  const isAdmin = userData?.is_admin || false;

  useEffect(() => {
    if (!selectedPlanGroup) {
      if (selectedDiscountPlan !== '') {
        setSelectedDiscountPlan('');
      }
      return;
    }

    if (planForSelectedService) {
      if (planForSelectedService.id !== selectedDiscountPlan) {
        setSelectedDiscountPlan(planForSelectedService.id);
      }
    } else if (selectedDiscountPlan !== '') {
      setSelectedDiscountPlan('');
    }
  }, [planForSelectedService, selectedPlanGroup, selectedDiscountPlan]);

  useEffect(() => {
    if (!selectedDiscountPlan) {
      lastAlertedPlanRef.current = null;
      return;
    }

    const message = getCustomPlanMessage(selectedDiscountPlan);
    if (message && lastAlertedPlanRef.current !== selectedDiscountPlan) {
      window.alert(message);
      lastAlertedPlanRef.current = selectedDiscountPlan;
    }
  }, [selectedDiscountPlan]);

  useEffect(() => {
    if (planForSelectedService) {
      setProvincialCostOverride(null);
    }
  }, [planForSelectedService]);

  useEffect(() => {
    if (selectedPlanGroup) {
      setLinearDiscount(0);
    }
  }, [selectedPlanGroup]);

  useEffect(() => {
    if (selectedCustomPlanId) {
      setLinearDiscount(0);
      setSelectedPlanGroup('');
      setSelectedDiscountPlan('');
    }
  }, [selectedCustomPlanId]);

  useEffect(() => {
    if (selectedService !== 'Urg14H Courier') {
      setSaturdayDelivery(false);
    }
  }, [selectedService]);

  useEffect(() => {
    setComparatorServiceSelection(selectedService);
  }, [selectedService]);

  useEffect(() => {
    if (!saturdayDelivery || selectedService !== 'Urg14H Courier') {
      setSaturdayPvp(0);
    }
  }, [saturdayDelivery, selectedService]);

  useEffect(() => {
    const needsWarning = showMileageBanner && !dismissedMileageServices[selectedService];

    if (needsWarning) {
      setShowMileageWarning(true);
    } else {
      setShowMileageWarning(false);
    }
  }, [dismissedMileageServices, saturdayDelivery, selectedService, showMileageBanner]);

  useEffect(() => {
    if (tariffsLoading) {
      setCostBreakdowns(buildEmptyBreakdowns());
      setMissingZones([]);
      setRestrictedZones([]);

      return;
    }

    if (!selectedService) {
      setCostBreakdowns(buildEmptyBreakdowns());
      setMissingZones([]);
      setRestrictedZones([]);
      return;
    }


    const hasPositiveWeight = packages.some(pkg => {
      const effectiveWeight = pkg.finalWeight ?? pkg.weight;
      return effectiveWeight > 0;
    });

    if (!hasPositiveWeight) {
      setCostBreakdowns(buildEmptyBreakdowns());
      setMissingZones([]);
      setRestrictedZones([]);
      return;
    }

    const breakdowns = buildEmptyBreakdowns();
    const zonesWithMissingTariffs = new Set<string>();
    const zonesWithRestrictions = new Set<string>();

    const serviceTariffs = tariffs.filter(tariff => tariff.service_name === selectedService);
    const hasActivePlan = Boolean(planForSelectedService) || Boolean(selectedCustomPlan);
    const parcelShopSelected = isParcelShopService(selectedService);
    const effectiveLinearDiscount =
      hasActivePlan || parcelShopSelected ? 0 : linearDiscount;
    const applySaturdayExtras = saturdayDelivery && selectedService === 'Urg14H Courier';
    const saturdayCostValue = applySaturdayExtras ? 2.5 : 0;
    const mileageCostContribution = mileageCostTotal > 0 ? mileageCostTotal : 0;
    const energyRate = getEnergyRateForService(selectedService);

    DESTINATION_ZONES.forEach(zoneName => {
      let totalInitialCost = 0;
      let planDiscountTotal = 0;
      let zoneStatus: 'idle' | 'calculated' | 'not_available' = 'idle';
      let missingTariffForZone = serviceTariffs.length === 0;
      let restrictedForZone = false;
      const zoneIncrement = getZoneIncrement(selectedService, zoneName);
      const zoneIncrement2025 = getZoneIncrement2025(selectedService, zoneName);

      let zoneProcessingActive = true;
      for (const pkg of packages) {
        if (!zoneProcessingActive) {
          continue;
        }
        const quantity = Math.max(1, Math.round(pkg.quantity ?? 1));
        if (quantity <= 0) continue;

        const zoneCost = computeZoneCostForPackage(
          pkg,
          selectedService,
          zoneName,
          shippingMode,
          serviceTariffs
        );

        if (!zoneCost.available) {
          zoneStatus = 'not_available';
          if (zoneCost.reason === 'missing_tariff') {
            missingTariffForZone = true;

          }
          if (zoneCost.reason === 'restriction') {
            restrictedForZone = true;
          }

          zoneProcessingActive = false;
          continue;
        }

        zoneStatus = 'calculated';
        const roundedCost = roundUp(zoneCost.cost);
        totalInitialCost += roundedCost * quantity;

        if (selectedCustomPlan) {
          const weightForPlan = zoneCost.finalWeight ?? pkg.weight ?? 0;
          const discountPerUnit = calculateCustomPlanDiscount(
            serviceTariffs,
            selectedCustomPlan,
            selectedService,
            zoneName,
            weightForPlan,
            shippingMode
          );
          if (discountPerUnit > 0) {
            planDiscountTotal += discountPerUnit * quantity;
          }
        } else if (planForSelectedService) {
          const weightForPlan = zoneCost.finalWeight ?? pkg.weight ?? 0;
          const discountPerUnit = calculatePlanDiscountForWeight(
            serviceTariffs,
            selectedService,
            zoneName,
            planForSelectedService,
            weightForPlan,
            shippingMode
          );
          if (discountPerUnit > 0) {
            planDiscountTotal += discountPerUnit * quantity;
          }
        }
      }

      if (zoneStatus === 'not_available' || missingTariffForZone) {
        breakdowns[zoneName] = createEmptyCostBreakdown('not_available');
        if (missingTariffForZone) {
          zonesWithMissingTariffs.add(zoneName);
        }
        if (restrictedForZone) {
          zonesWithRestrictions.add(zoneName);
        }
        return;
      }

      if (zoneStatus === 'idle') {
        breakdowns[zoneName] = createEmptyCostBreakdown('idle');
        return;
      }

      const baseOverrideForZone =
        zoneName === 'Provincial' &&
        provincialCostOverride !== null &&
        !selectedDiscountPlan
          ? provincialCostOverride
          : null;

      const zoneLinearDiscount = baseOverrideForZone !== null ? 0 : effectiveLinearDiscount;
      const planDiscountAmountForZone = (planForSelectedService || selectedCustomPlan) ? planDiscountTotal : 0;

      breakdowns[zoneName] = calculateCostBreakdown(
        totalInitialCost,
        zoneIncrement,
        zoneIncrement2025,
        incr2026,
        spc,
        suplementos,
        irregular,
        zoneLinearDiscount,
        applySaturdayExtras ? saturdayCostValue : 0,
        mileageCostContribution,
        {
          planDiscountAmount: planDiscountAmountForZone,
          energyRate,
          baseOverride: baseOverrideForZone,
          serviceName: selectedService
        }
      );
    });

    setCostBreakdowns(breakdowns);
    setMissingZones(Array.from(zonesWithMissingTariffs).sort());
    setRestrictedZones(Array.from(zonesWithRestrictions).sort());
  }, [
    tariffs,
    tariffsLoading,
    selectedService,
    packages,
    incr2026,
    spc,
    suplementos,
    irregular,
    shippingMode,
    planForSelectedService,
    linearDiscount,
    saturdayDelivery,
    provincialCostOverride,
    mileageCostTotal
  ]);

  // Cargar valores de preferencias al montar el componente o cuando cambien las preferencias
  useEffect(() => {
    if (!preferences) return;

    // Aplicar SPC fijo si está configurado (puede ser positivo o negativo)
    if (preferences.fixed_spc_value !== null && preferences.fixed_spc_value !== undefined) {
      setSpc(preferences.fixed_spc_value);
    }

    // Aplicar descuento lineal fijo si está configurado (debe ser positivo)
    if (preferences.fixed_discount_percentage !== null && preferences.fixed_discount_percentage !== undefined && preferences.fixed_discount_percentage > 0) {
      setLinearDiscount(preferences.fixed_discount_percentage);
    }
  }, [preferences]); // Se ejecuta cuando cambian las preferencias

  // Restaurar descuento lineal cuando se deselecciona un plan
  useEffect(() => {
    const hasNoPlan = !selectedPlanGroup && !selectedCustomPlanId;
    const hasPreferenceDiscount = preferences?.fixed_discount_percentage && preferences.fixed_discount_percentage > 0;

    if (hasNoPlan && hasPreferenceDiscount && linearDiscount === 0) {
      setLinearDiscount(preferences.fixed_discount_percentage);
    }
  }, [selectedPlanGroup, selectedCustomPlanId, preferences, linearDiscount]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calculator className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Calculadora de Tarifas</h1>
              {isAdmin && !isAdminView && (
                <span className="ml-3 px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-800 rounded-full">
                  Modo Usuario
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500 hidden sm:inline">
                Sistema de Cálculo de Tarifas
              </span>
              <SOPGenerator
                tariffs={tariffs}
                marginPercentage={marginPercentage}
                discountPlans={allDiscountPlans}
                selectedPlanGroup={selectedPlanGroup}
                linearDiscount={planForSelectedService ? 0 : linearDiscount}
                spc={spc}
                variableSurcharge={0}
                irregularSurcharge={0}
                increment2026={incr2026}
                selectedService={selectedService}
                provincialCostOverride={provincialCostOverride}
                disabled={!tariffs.length}
              />

              <div className="hidden sm:flex items-center text-sm text-gray-700">
                <User className="h-4 w-4 mr-2 text-gray-400" />
                <span className="font-medium">{userData?.full_name}</span>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {userData?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || userData?.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </button>

                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      <div className="px-4 py-3 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-900">{userData?.full_name}</p>
                        <p className="text-xs text-gray-500">{userData?.email}</p>
                      </div>

                      <button
                        onClick={() => {
                          setShowSettings(true);
                          setShowMenu(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Settings className="h-4 w-4 mr-3 text-gray-400" />
                        Configuración
                      </button>

                      {isAdmin && isAdminView && (
                        <>
                          <div className="border-t border-gray-200 my-1" />
                          <button
                            onClick={() => {
                              setShowAdmin(true);
                              setShowMenu(false);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <Settings className="h-4 w-4 mr-3 text-gray-400" />
                            Panel de Administración
                          </button>
                        </>
                      )}

                      {isAdmin && (
                        <>
                          <div className="border-t border-gray-200 my-1" />
                          <div className="px-4 py-2">
                            <label className="flex items-center justify-between cursor-pointer">
                              <div className="flex items-center">
                                <Eye className="h-4 w-4 mr-3 text-gray-400" />
                                <span className="text-sm text-gray-700">Ver como Usuario</span>
                              </div>
                              <button
                                onClick={toggleViewMode}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                  !isAdminView ? 'bg-blue-600' : 'bg-gray-200'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    !isAdminView ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </label>
                          </div>
                        </>
                      )}

                      <div className="border-t border-gray-200 mt-1 pt-1">
                        <button
                          onClick={handleSignOut}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Cerrar sesión
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Custom Tariffs Active Indicator */}
      {isCustomTariffActive ? (
        <div className="bg-green-50 border-b border-green-200 px-4 sm:px-6 lg:px-8 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
            <span className="text-sm font-medium text-green-900">
              Estado actual: Usando tabla personalizada para {selectedService}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-gray-400 rounded-full"></span>
            <span className="text-sm font-medium text-gray-700">
              Estado actual: Usando tabla oficial para {selectedService}
            </span>
          </div>
        </div>
      )}

      {showSettings && (
        <UserSettingsPanel onClose={() => setShowSettings(false)} />
      )}

      {isAdmin && isAdminView && showAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Panel de Administración</h2>
              <button
                onClick={() => setShowAdmin(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <AdminPanel />
            </div>
          </div>
        </div>
      )}

      <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {renderServiceConfigurationCard()}
          {renderCostAdjustmentsCard()}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsComparatorOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
          >
            COMPARADOR COMERCIAL
          </button>
        </div>

        {/* Package Manager now spans full width */}
        <PackageManager
          packages={packages}
          onChange={handlePackagesChange}
          selectedService={selectedService}
          onClearPackages={handleClearPackages}
        />

        {showMileageBanner && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-600" />
              <h4 className="text-sm font-semibold text-red-700 uppercase tracking-wide">
                Kilometraje adicional
              </h4>
              <span className="text-xs text-red-600 font-medium">¡Atención!, posibles cargos por kilometraje</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-red-700 mb-1 uppercase tracking-wide">Kms</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={mileageKm}
                  onChange={(event) => setMileageKm(Number(event.target.value) || 0)}
                  className="w-full px-2 py-1.5 border border-red-200 rounded-md focus:ring-2 focus:ring-red-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-red-700 mb-1 uppercase tracking-wide">Coste por km (€)</label>
                <input
                  type="text"
                  readOnly
                  value={mileageCostPerKm.toFixed(2)}
                  className="w-full px-2 py-1.5 border border-red-200 rounded-md bg-red-100 text-red-800 font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-red-700 mb-1 uppercase tracking-wide">PVP por km (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={mileagePvpPerKm}
                  onChange={(event) => setMileagePvpPerKm(Number(event.target.value) || 0)}
                  className="w-full px-2 py-1.5 border border-red-200 rounded-md focus:ring-2 focus:ring-red-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-red-700 mb-1 uppercase tracking-wide">Total Coste (€)</label>
                <input
                  type="text"
                  readOnly
                  value={formatCurrency(mileageCostTotal)}
                  className="w-full px-2 py-1.5 border border-red-200 rounded-md bg-red-100 text-red-800 font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-red-700 mb-1 uppercase tracking-wide">Total Venta (€)</label>
                <input
                  type="text"
                  readOnly
                  value={formatCurrency(mileageSaleTotal)}
                  className="w-full px-2 py-1.5 border border-red-200 rounded-md bg-red-100 text-red-800 font-semibold"
                />
              </div>
            </div>
            <p className="text-xs font-semibold text-red-700 text-right uppercase tracking-wide">
              Sumado al total PVP
            </p>
          </div>
        )}

        <div className="sticky top-28 z-30">
          <div className="flex flex-wrap items-center justify-center gap-4 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full px-5 py-3 shadow">
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2 shadow-inner">
              <span className="text-xs font-semibold uppercase tracking-wide text-blue-800">Modalidad</span>
              {SHIPPING_MODES.map(mode => {
                const isActive = shippingMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setShippingMode(mode)}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-white text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    {SHIPPING_MODE_LABELS[mode]}
                  </button>
                );
              })}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleCustomTariff}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                    isCustomTariffActive
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {isCustomTariffActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {isCustomTariffActive ? 'Tabla Personalizada Activa' : 'Tabla Oficial Activa'}
                </button>
                <button
                  type="button"
                  onClick={toggleCostsPanel}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                    showCosts ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  {showCosts ? 'Ocultar costes' : 'Ver costes'}
                </button>
                <button
                  type="button"
                  onClick={togglePvpPanel}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                    showPvp ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                  }`}
              >
                {showPvp ? 'Ocultar PVP' : 'Ver PVP'}
              </button>
              <button
                type="button"
                onClick={handleResetAll}
                className="px-4 py-2 text-sm font-medium rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Limpiar datos
              </button>
            </div>
          </div>
        </div>

        {showIrregularTransitWarning && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
            <p className="text-sm text-yellow-900">
              SE HA DETECTADO UNO O VARIOS BULTOS IRREGULARES EN LA EXPEDICIÓN. TENGA EN CUENTA QUE EL TIEMPO DE TRÁNSITO SERÁ DE FPE+1.
            </p>
          </div>
        )}

        {showNonEncintableWarning && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
            <p className="text-sm text-red-900">
              DETECTADO UNO O VARIOS BULTOS NO ENCINTABLES. TENER EN CUENTA POSIBLES SANCIONES, RECARGOS Y +FPE.

            </p>
          </div>
        )}

        {missingZones.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
            <p className="text-sm text-yellow-900">
              Zonas no aplicables al servicio se marcan como "NO".
            </p>
          </div>
        )}

        {restrictedZones.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
            <div className="text-sm text-red-900">
              <p className="font-medium">Reglas del servicio impiden estas combinaciones.</p>
              <p>
                El servicio <span className="font-semibold">{selectedService}</span> marca como "NO" las zonas
                <span className="font-semibold"> {restrictedZones.join(', ')}</span> para los bultos introducidos.
              </p>
            </div>
          </div>
        )}

        <div className={`${!showCosts && !showPvp ? 'lg:sticky lg:top-36' : ''}`}>
          <CostBreakdownTable
            costBreakdowns={costBreakdowns}
            marginPercentage={marginPercentage}
            packages={packages}
            showCosts={showCosts}
            showPvp={showPvp}
            shippingMode={shippingMode}
            additionalPvp={mileageSaleTotal}
            additionalPvpLabel={showMileageBanner && mileageSaleTotal > 0 ? 'Kilometraje adicional' : undefined}
            saturdayActive={saturdayDelivery && selectedService === 'Urg14H Courier'}
            saturdayPvp={saturdayDelivery && selectedService === 'Urg14H Courier' ? saturdayPvp : 0}
            onProvincialCostChange={handleProvincialCostChange}
            provincialCostOverride={provincialCostOverride}
            onMarginChange={setMarginPercentage}
            planSelected={Boolean(selectedPlanGroup) || Boolean(selectedCustomPlan)}
            discountSummaryValue={discountSummary.value}
            discountSummaryDescription={discountSummary.description}
          />
        </div>
      </div>

      <CommercialComparatorPanel
        isOpen={isComparatorOpen}
        onClose={() => setIsComparatorOpen(false)}
        tables={comparatorTablesForPanel}
        onValueChange={handleComparatorValueChange}
        availableServices={STATIC_SERVICES}
        selectedService={comparatorServiceSelection}
        onServiceChange={setComparatorServiceSelection}
        discountPlans={comparatorDiscountPlans}
        selectedPlan={comparatorPlanId}
        onPlanChange={handleDiscountPlanSelection}
        offerMargin={comparatorOfferMargin}
        onOfferMarginChange={handleComparatorOfferMarginChange}
        offerAverageMargin={comparatorOfferAverageMargin.margin}
        onReset={handleComparatorReset}
        onMatchCompetition={handleComparatorMatchCompetition}
        sopLauncher={
          <SOPGenerator
            tariffs={tariffs}
            marginPercentage={marginPercentage}
            discountPlans={allDiscountPlans}
            selectedPlanGroup={selectedPlanGroup}
            linearDiscount={planForSelectedService ? 0 : linearDiscount}
            spc={spc}
            variableSurcharge={0}
            irregularSurcharge={0}
            increment2026={incr2026}
            selectedService={selectedService}
            provincialCostOverride={provincialCostOverride}
            disabled={!tariffs.length}
          />
        }
      />

      <button
        type="button"
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
        aria-label="Volver arriba"
      >
        <ArrowUp className="h-5 w-5" />
      </button>

      {showMileageWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-6 w-6 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                ¡Atención!
              </h2>
            </div>
            <p className="text-sm text-gray-700">
              El servicio seleccionado puede generar cargos adicionales por kilometraje. Revisa los datos antes de confirmar el envío.
            </p>
            <button
              type="button"
              onClick={handleCloseMileageWarning}
              className="w-full inline-flex justify-center items-center px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {isPlansManagerOpen && (
        <CommercialPlansManager
          onClose={() => {
            setIsPlansManagerOpen(false);
            reloadCustomPlans();
          }}
          onPlanSelected={(plan) => {
            if (plan) {
              console.log('Plan seleccionado:', plan);
            }
            setIsPlansManagerOpen(false);
            reloadCustomPlans();
          }}
        />
      )}
    </div>
  );
};

export default TariffCalculator;
