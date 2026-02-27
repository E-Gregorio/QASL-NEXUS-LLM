import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { DashboardOverview } from '../types';

export function useDashboardData() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchDashboard() {
      try {
        setLoading(true);
        const overview = await api.getDashboardOverview();
        if (active) {
          setData(overview);
          setError(null);
        }
      } catch (err: any) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 60000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  return { data, loading, error };
}
