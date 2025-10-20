import { useState, useEffect } from 'react';
import { supabase, Tariff, DiscountPlan, ConstantByService } from '../lib/supabase';

export function useTariffs(clientId?: string, useCustomOverrides: boolean = false) {
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

        setTariffs(finalTariffs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching tariffs');
      } finally {
        setLoading(false);
      }
    };

    fetchTariffs();
  }, [clientId, useCustomOverrides]);

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