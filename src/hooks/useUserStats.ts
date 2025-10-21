import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export interface UserActivityStats {
  total_sop: number;
  total_minisop: number;
  total_calculations: number;
  days_active: number;
  average_calculations_per_day: number;
  first_activity: string | null;
  last_activity: string | null;
}

export interface DailyActivity {
  activity_date: string;
  calculation_count: number;
  sop_count: number;
  minisop_count: number;
}

interface UseUserStatsReturn {
  stats: UserActivityStats | null;
  dailyActivity: DailyActivity[];
  isLoading: boolean;
  error: string | null;
  refreshStats: () => Promise<void>;
}

export function useUserStats(): UseUserStatsReturn {
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<UserActivityStats | null>(null);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadStats();
    } else {
      setStats(null);
      setDailyActivity([]);
    }
  }, [isAuthenticated, user]);

  async function loadStats() {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_user_activity_summary', { p_user_id: user.id })
        .maybeSingle();

      if (rpcError) throw rpcError;

      if (data) {
        setStats({
          total_sop: data.total_sop || 0,
          total_minisop: data.total_minisop || 0,
          total_calculations: data.total_calculations || 0,
          days_active: data.days_active || 0,
          average_calculations_per_day: data.average_calculations_per_day || 0,
          first_activity: data.first_activity,
          last_activity: data.last_activity,
        });
      } else {
        setStats({
          total_sop: 0,
          total_minisop: 0,
          total_calculations: 0,
          days_active: 0,
          average_calculations_per_day: 0,
          first_activity: null,
          last_activity: null,
        });
      }

      const { data: dailyData, error: dailyError } = await supabase
        .from('user_daily_activity')
        .select('activity_date, calculation_count, sop_count, minisop_count')
        .eq('user_id', user.id)
        .order('activity_date', { ascending: false })
        .limit(7);

      if (dailyError) throw dailyError;

      setDailyActivity(dailyData || []);
    } catch (err) {
      console.error('Error loading user stats:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar estadísticas');
      setStats({
        total_sop: 0,
        total_minisop: 0,
        total_calculations: 0,
        days_active: 0,
        average_calculations_per_day: 0,
        first_activity: null,
        last_activity: null,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshStats() {
    await loadStats();
  }

  return {
    stats,
    dailyActivity,
    isLoading,
    error,
    refreshStats,
  };
}
