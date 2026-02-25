import { useState, useEffect } from 'react';
import { supabase, Tariff, DiscountPlan, ConstantByService, CustomTariff, CustomTariffActive } from '../lib/supabase';
import { authenticatedQuery } from '../lib/authenticatedFetch';

export function useTariffs(clientId?: string, useCustomOverrides: boolean = false, applyUserCustomTariffs: boolean = false, refetchTrigger?: number) {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTariffs = async () => {
      try {
        const { data, error } = await supabase
          .from('tariffs')
          .select('*');

        if (error) throw error;

        // CRÍTICO: Convertir weight_from y weight_to de string (VARCHAR en BD) a number
        // y ordenar NUMÉRICAMENTE (no alfabéticamente)
        let finalTariffs = (data || []).map(tariff => ({
          ...tariff,
          weight_from: parseFloat(tariff.weight_from as any) || 0,
          weight_to: tariff.weight_to ? parseFloat(tariff.weight_to as any) : null
        })).sort((a, b) => {
          // Primero ordenar por servicio
          if (a.service_name !== b.service_name) {
            return a.service_name.localeCompare(b.service_name);
          }
          // Luego por peso (ahora numérico)
          return a.weight_from - b.weight_from;
        });

        if (useCustomOverrides && clientId) {
          try {
            const overrides = await authenticatedQuery({
              table: 'custom_cost_overrides',
              action: 'select',
              filters: [{ column: 'is_active', op: 'eq', value: true }],
            });

            if (overrides && overrides.length > 0) {
              finalTariffs = applyCustomOverrides(finalTariffs, overrides);
            }
          } catch (overrideError) {
            console.error('Error loading custom overrides, using standard tariffs:', overrideError);
          }
        }

        if (applyUserCustomTariffs) {
          try {
            const customTariffs = await authenticatedQuery({
              table: 'custom_tariffs',
              action: 'select',
            });

            const activeStates = await authenticatedQuery({
              table: 'custom_tariffs_active',
              action: 'select',
              filters: [{ column: 'is_active', op: 'eq', value: true }],
            });

            if (customTariffs && activeStates && activeStates.length > 0) {
              const activeServices = new Set(activeStates.map((s: any) => s.service_name));
              finalTariffs = mergeCustomTariffs(finalTariffs, customTariffs, activeServices);
            }
          } catch (customError) {
            console.error('Error loading custom tariffs, using standard tariffs:', customError);
          }
        }

        setTariffs(finalTariffs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching tariffs');
      } finally {
        setLoading(false);
      }
    };

    fetchTariffs();
  }, [clientId, useCustomOverrides, applyUserCustomTariffs, refetchTrigger]);

  return { tariffs, loading, error };
}

function applyCustomOverrides(tariffs: Tariff[], overrides: any[]): Tariff[] {
  const tariffsCopy = JSON.parse(JSON.stringify(tariffs));

  for (const override of overrides) {
    const matchingTariffs = tariffsCopy.filter((t: Tariff) => {
      const matchesService = t.service_name === override.service_name;
      const matchesWeight =
        t.weight_from >= override.weight_from &&
        (override.weight_to === null || t.weight_to === null || t.weight_from <= override.weight_to);

      return matchesService && matchesWeight;
    });

    for (const tariff of matchingTariffs) {
      if (override.cost_factor_name in tariff) {
        (tariff as any)[override.cost_factor_name] = override.override_value;
      }
    }
  }

  return tariffsCopy;
}

function mergeCustomTariffs(officialTariffs: Tariff[], customTariffs: CustomTariff[], activeServices: Set<string>): Tariff[] {
  const result = JSON.parse(JSON.stringify(officialTariffs)) as Tariff[];

  for (const customTariff of customTariffs) {
    if (!activeServices.has(customTariff.service_name)) {
      continue;
    }

    const matchingTariffIndex = result.findIndex(t =>
      t.service_name === customTariff.service_name &&
      t.weight_from.toString() === customTariff.weight_from &&
      (
        (t.weight_to === null && customTariff.weight_to === '999') ||
        (t.weight_to !== null && t.weight_to.toString() === customTariff.weight_to)
      )
    );

    if (matchingTariffIndex !== -1) {
      const officialTariff = result[matchingTariffIndex];

      Object.keys(customTariff).forEach(key => {
        if (
          key !== 'id' &&
          key !== 'user_id' &&
          key !== 'service_name' &&
          key !== 'weight_from' &&
          key !== 'weight_to' &&
          key !== 'created_at' &&
          key !== 'updated_at'
        ) {
          const customValue = (customTariff as any)[key];
          if (customValue !== null && customValue !== undefined) {
            (officialTariff as any)[key] = customValue;
          }
        }
      });

      result[matchingTariffIndex] = officialTariff;
    }
  }

  return result;
}

export function useDiscountPlans() {
  const [discountPlans, setDiscountPlans] = useState<DiscountPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDiscountPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('discount_plans')
          .select('*')
          .eq('is_active', true)
          .order('plan_name', { ascending: true });

        if (error) throw error;
        setDiscountPlans(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching discount plans');
      } finally {
        setLoading(false);
      }
    };

    fetchDiscountPlans();
  }, []);

  return { discountPlans, loading, error };
}

export function useConstants() {
  const [constants, setConstants] = useState<ConstantByService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConstants = async () => {
      try {
        const { data, error } = await supabase
          .from('constants_by_service')
          .select('*')
          .order('service_name', { ascending: true });

        if (error) throw error;
        setConstants(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching constants');
      } finally {
        setLoading(false);
      }
    };

    fetchConstants();
  }, []);

  return { constants, loading, error };
}

export function useCustomTariffs(userId?: string) {
  const [customTariffs, setCustomTariffs] = useState<CustomTariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const data = await authenticatedQuery({
        table: 'custom_tariffs',
        action: 'select',
        orderBy: [
          { column: 'service_name', ascending: true },
          { column: 'weight_from', ascending: true },
        ],
      });
      setCustomTariffs(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching custom tariffs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  return { customTariffs, loading, error, refetch: async () => {
    setLoading(true);
    await fetchData();
  }};
}

export function useCustomTariffsActive(userId?: string) {
  const [activeStates, setActiveStates] = useState<CustomTariffActive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const data = await authenticatedQuery({
        table: 'custom_tariffs_active',
        action: 'select',
        orderBy: { column: 'service_name', ascending: true },
      });
      setActiveStates(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching custom tariffs active states');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  return { activeStates, loading, error, refetch: async () => {
    setLoading(true);
    await fetchData();
  }};
}

export interface TariffInternationalEurope {
  id: string;
  service_name: string;
  weight_from: number;
  weight_to: number | null;
  country: string;
  cost: number;
}

export function useInternationalEuropeTariffs() {
  const [tariffs, setTariffs] = useState<TariffInternationalEurope[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTariffs = async () => {
      try {
        const { data, error } = await supabase
          .from('tariffs_international_europe')
          .select('id, service_name, weight_from, weight_to, country, cost')
          .order('country', { ascending: true })
          .order('weight_from', { ascending: true });

        if (error) throw error;
        setTariffs(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching international europe tariffs');
      } finally {
        setLoading(false);
      }
    };

    fetchTariffs();
  }, []);

  return { tariffs, loading, error };
}

export function findInternationalEuropeTariff(
  tariffs: TariffInternationalEurope[],
  country: string,
  weight: number
): TariffInternationalEurope | null {
  const roundedWeight = Math.ceil(Math.max(weight, 0));
  const countryTariffs = tariffs.filter(t => t.country === country);

  if (!countryTariffs.length) return null;

  const sorted = [...countryTariffs].sort((a, b) => a.weight_from - b.weight_from);

  for (const tariff of sorted) {
    if (tariff.weight_to === null) {
      if (roundedWeight > tariff.weight_from) return tariff;
    } else {
      if (roundedWeight > tariff.weight_from && roundedWeight <= tariff.weight_to) {
        return tariff;
      }
      if (tariff.weight_from === 0 && roundedWeight <= tariff.weight_to) {
        return tariff;
      }
    }
  }

  return null;
}

export function calculateInternationalEuropeCost(
  tariffs: TariffInternationalEurope[],
  country: string,
  weight: number
): number | null {
  const roundedWeight = Math.ceil(Math.max(weight, 0));
  if (roundedWeight <= 0) return 0;

  const countryTariffs = tariffs.filter(t => t.country === country);
  if (!countryTariffs.length) return null;

  const sorted = [...countryTariffs].sort((a, b) => a.weight_from - b.weight_from);
  const finiteTariffs = sorted.filter(t => t.weight_to !== null);
  const plusOneTariff = sorted.find(t => t.weight_to === null);

  const lastFinite = finiteTariffs.length > 0
    ? finiteTariffs[finiteTariffs.length - 1]
    : null;
  const maxFiniteWeight = lastFinite?.weight_to ?? 0;

  let baseTariff: TariffInternationalEurope | null = null;
  for (const tariff of finiteTariffs) {
    const isFirst = tariff.weight_from === 0;
    if (isFirst && roundedWeight <= (tariff.weight_to ?? 0)) {
      baseTariff = tariff;
      break;
    }
    if (!isFirst && roundedWeight > tariff.weight_from && roundedWeight <= (tariff.weight_to ?? 0)) {
      baseTariff = tariff;
      break;
    }
  }

  if (baseTariff) {
    return baseTariff.cost;
  }

  if (roundedWeight > maxFiniteWeight && plusOneTariff && lastFinite) {
    const extraKg = roundedWeight - maxFiniteWeight;
    return lastFinite.cost + (extraKg * plusOneTariff.cost);
  }

  return null;
}