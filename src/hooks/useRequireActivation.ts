import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ActivationStatus {
  isActivated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useRequireActivation(): ActivationStatus {
  const { user, isAuthenticated } = useAuth();
  const [isActivated, setIsActivated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsLoading(false);
      setIsActivated(false);
      return;
    }

    checkActivationStatus();
  }, [user, isAuthenticated]);

  const checkActivationStatus = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('[useRequireActivation] Checking activation for user:', user.id);

      const { data, error: functionError } = await supabase.functions.invoke('check-tariff-activation', {
        body: { userId: user.id }
      });

      if (functionError) {
        console.error('[useRequireActivation] Function error:', functionError);
        throw functionError;
      }

      console.log('[useRequireActivation] Activation status:', data);

      setIsActivated(data?.is_activated || false);

    } catch (err: any) {
      console.error('[useRequireActivation] Error checking activation status:', err);
      setError(err.message);
      setIsActivated(false);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isActivated,
    isLoading,
    error,
  };
}
