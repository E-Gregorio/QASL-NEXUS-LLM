import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

interface PipelineData {
  pipeline_id: string;
  status?: string;
  estado?: string;
  tipo?: string;
  pass_rate?: number;
  total_tc_ejecutados?: number;
  total_passed?: number;
  total_failed?: number;
  fases_ejecutadas?: Record<string, string>;
  [key: string]: any;
}

export function usePipelinePolling(pipelineId: string | null) {
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isComplete = data?.estado === 'Success' || data?.estado === 'Failed' || data?.estado === 'Cancelled';

  const refresh = useCallback(async () => {
    if (!pipelineId) return;
    try {
      const result = await api.getPipelineStatus(pipelineId);
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, [pipelineId]);

  useEffect(() => {
    if (!pipelineId) return;
    setLoading(true);
    setData(null);
    setError(null);

    let active = true;

    async function poll() {
      try {
        const result = await api.getPipelineStatus(pipelineId!);
        if (active) {
          setData(result);
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    poll();
    const interval = setInterval(() => {
      if (!active) return;
      // Stop polling if complete
      if (data?.estado === 'Success' || data?.estado === 'Failed' || data?.estado === 'Cancelled') {
        clearInterval(interval);
        return;
      }
      poll();
    }, 2000);

    return () => { active = false; clearInterval(interval); };
  }, [pipelineId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, isComplete, refresh };
}
