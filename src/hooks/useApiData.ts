import { useEffect, useRef, useState } from 'react';
import { describeError } from '../services/api';
import { useDemoVersion } from '../demo/demoStore';

export interface AsyncData<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApiData<T>(fetcher: () => Promise<T>, deps: unknown[] = []): AsyncData<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const demoVersion = useDemoVersion();
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    fetcherRef
      .current()
      .then((result) => {
        if (!alive) return;
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        setError(describeError(err));
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [...deps, attempt, demoVersion]);

  return { data, loading, error, refetch: () => setAttempt((a) => a + 1) };
}
