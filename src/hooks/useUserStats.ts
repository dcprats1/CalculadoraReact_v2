import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authenticatedQuery, authenticatedRpc } from '../lib/authenticatedFetch';

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

const EMPTY_STATS: UserActivityStats = {
  total_sop: 0,
  total_minisop: 0,
  total_calculations: 0,
  days_active: 0,
  average_calculations_per_day: 0,
  first_activity: null,
  last_activity: null,
};

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
      const rpcData = await authenticatedRpc({
        rpcName: 'get_user_activity_summary',
        rpcParams: { p_user_id: user.id },
      });

      if (rpcData) {
        const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        if (row) {
          setStats({
            total_sop: row.total_sop || 0,
            total_minisop: row.total_minisop || 0,
            total_calculations: row.total_calculations || 0,
            days_active: row.days_active || 0,
            average_calculations_per_day: row.average_calculations_per_day || 0,
            first_activity: row.first_activity,
            last_activity: row.last_activity,
          });
        } else {
          setStats({ ...EMPTY_STATS });
        }
      } else {
        setStats({ ...EMPTY_STATS });
      }

      const dailyData = await authenticatedQuery({
        table: 'user_daily_activity',
        action: 'select',
        columns: 'activity_date, calculation_count, sop_count, minisop_count',
        orderBy: { column: 'activity_date', ascending: false },
        limit: 7,
      });

      setDailyActivity(dailyData || []);
    } catch (err) {
      console.error('Error loading user stats:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar estadisticas');
      setStats({ ...EMPTY_STATS });
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
