import { useState, useEffect } from 'react';
import { api } from '../api/client';

export function useMicroserviceHealth() {
  const [health, setHealth] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchHealth() {
      try {
        const data = await api.getHealth();
        if (active && data.microservices) {
          setHealth(data.microservices);
        }
      } catch {
        // MS-08 unreachable, mark all as unknown
        if (active) setHealth({});
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  return { health, loading };
}
