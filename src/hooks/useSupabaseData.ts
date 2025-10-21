import { useState, useEffect } from 'react';
import { supabase, Tariff, DiscountPlan, ConstantByService, CustomTariff, CustomTariffActive } from '../lib/supabase';

export function useTariffs(clientId?: string, useCustomOverrides: boolean = false, applyUserCustomTariffs: boolean = false) {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTariffs = async () => {
      try {
        const { data, error } = await supabase
          .from('tariffs')
          .select('*')
          .order('service_name', { ascending: true })
          .order('weight_from', { ascending: true });

        if (error) throw error;

        let finalTariffs = data || [];

        if (useCustomOverrides && clientId) {
          try {
            const { data: overrides } = await supabase
              .from('custom_cost_overrides')
              .select('*')
              .eq('client_id', clientId)
              .eq('is_active', true);

            if (overrides && overrides.length > 0) {
              finalTariffs = applyCustomOverrides(finalTariffs, overrides);
            }
          } catch (overrideError) {
            console.error('Error loading custom overrides, using standard tariffs:', overrideError);
          }
        }

        if (applyUserCustomTariffs) {
          try {
            const { data: customTariffs } = await supabase
              .from('custom_tariffs')
              .select('*');

            const { data: activeStates } = await supabase
              .from('custom_tariffs_active')
              .select('*')
              .eq('is_active', true);

            if (customTariffs && activeStates && activeStates.length > 0) {
              const activeServices = new Set(activeStates.map(s => s.service_name));
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
  }, [clientId, useCustomOverrides, applyUserCustomTariffs]);

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

export function useCustomTariffs() {
  const [customTariffs, setCustomTariffs] = useState<CustomTariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomTariffs = async () => {
      try {
        const { data, error } = await supabase
          .from('custom_tariffs')
          .select('*')
          .order('service_name', { ascending: true })
          .order('weight_from', { ascending: true });

        if (error) throw error;
        setCustomTariffs(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching custom tariffs');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomTariffs();
  }, []);

  return { customTariffs, loading, error, refetch: async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_tariffs')
        .select('*')
        .order('service_name', { ascending: true })
        .order('weight_from', { ascending: true });

      if (error) throw error;
      setCustomTariffs(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching custom tariffs');
    } finally {
      setLoading(false);
    }
  }};
}

export function useCustomTariffsActive() {
  const [activeStates, setActiveStates] = useState<CustomTariffActive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActiveStates = async () => {
      try {
        const { data, error } = await supabase
          .from('custom_tariffs_active')
          .select('*')
          .order('service_name', { ascending: true });

        if (error) throw error;
        setActiveStates(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching custom tariffs active states');
      } finally {
        setLoading(false);
      }
    };

    fetchActiveStates();
  }, []);

  return { activeStates, loading, error, refetch: async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_tariffs_active')
        .select('*')
        .order('service_name', { ascending: true });

      if (error) throw error;
      setActiveStates(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching custom tariffs active states');
    } finally {
      setLoading(false);
    }
  }};
}