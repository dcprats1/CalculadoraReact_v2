import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { CommercialPlan } from '../types/commercialPlans';
import { useAuth } from '../contexts/AuthContext';

export function useCommercialPlans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<CommercialPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    if (!user) {
      setPlans([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('custom_commercial_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setPlans(data || []);
    } catch (err) {
      console.error('Error loading commercial plans:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar planes comerciales');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const createPlan = useCallback(async (planName: string, discounts: CommercialPlan['discounts']) => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('custom_commercial_plans')
        .insert({
          user_id: user.id,
          plan_name: planName,
          discounts,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await loadPlans();
      return data;
    } catch (err) {
      console.error('Error creating commercial plan:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al crear plan comercial';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, loadPlans]);

  const updatePlan = useCallback(async (planId: string, planName: string, discounts: CommercialPlan['discounts']) => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: updateError } = await supabase
        .from('custom_commercial_plans')
        .update({
          plan_name: planName,
          discounts,
        })
        .eq('id', planId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      await loadPlans();
      return data;
    } catch (err) {
      console.error('Error updating commercial plan:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar plan comercial';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, loadPlans]);

  const deletePlan = useCallback(async (planId: string) => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('custom_commercial_plans')
        .delete()
        .eq('id', planId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      await loadPlans();
    } catch (err) {
      console.error('Error deleting commercial plan:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar plan comercial';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, loadPlans]);

  return {
    plans,
    loading,
    error,
    loadPlans,
    createPlan,
    updatePlan,
    deletePlan,
  };
}
