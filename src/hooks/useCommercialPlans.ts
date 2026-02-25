import { useState, useEffect, useCallback } from 'react';
import { CommercialPlan } from '../types/commercialPlans';
import { useAuth } from '../contexts/AuthContext';
import { authenticatedQuery } from '../lib/authenticatedFetch';

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
      const data = await authenticatedQuery({
        table: 'custom_commercial_plans',
        action: 'select',
        orderBy: { column: 'created_at', ascending: false },
      });

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
      const data = await authenticatedQuery({
        table: 'custom_commercial_plans',
        action: 'insert',
        data: { plan_name: planName, discounts },
      });

      await loadPlans();
      return data?.[0];
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
      const data = await authenticatedQuery({
        table: 'custom_commercial_plans',
        action: 'update',
        data: { plan_name: planName, discounts },
        filters: [{ column: 'id', op: 'eq', value: planId }],
      });

      await loadPlans();
      return data?.[0];
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
      await authenticatedQuery({
        table: 'custom_commercial_plans',
        action: 'delete',
        filters: [{ column: 'id', op: 'eq', value: planId }],
      });

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
