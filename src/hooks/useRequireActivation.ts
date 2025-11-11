import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ActivationStatus {
  isActivated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useRequireActivation(): ActivationStatus {
  const { user } = useAuth();
  const [isActivated, setIsActivated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setIsActivated(false);
      return;
    }

    checkActivationStatus();
  }, [user]);

  const checkActivationStatus = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_tariff_activation')
        .select('is_activated')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (!data) {
        const { error: insertError } = await supabase
          .from('user_tariff_activation')
          .insert({
            user_id: user.id,
            is_activated: false,
          });

        if (insertError && !insertError.message.includes('duplicate')) {
          throw insertError;
        }

        setIsActivated(false);
      } else {
        setIsActivated(data.is_activated || false);
      }
    } catch (err: any) {
      console.error('Error checking activation status:', err);
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
