import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { IS_DEMO_MODE } from '../../services/config';
import { pingBackend } from '../../services/health';

export type ConnectionState = 'demo' | 'checking' | 'connected' | 'unavailable';

interface ConnectionValue {
  state: ConnectionState;
  recheck: () => void;
}

const ConnectionContext = createContext<ConnectionValue>({
  state: IS_DEMO_MODE ? 'demo' : 'checking',
  recheck: () => {},
});

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConnectionState>(IS_DEMO_MODE ? 'demo' : 'checking');

  const check = useCallback(async () => {
    try {
      const reachable = await pingBackend();
      setState(reachable ? 'connected' : 'unavailable');
    } catch {
      setState('unavailable');
    }
  }, []);

  useEffect(() => {
    if (IS_DEMO_MODE) return;
    void check();
    const timer = window.setInterval(() => void check(), 30_000);
    return () => window.clearInterval(timer);
  }, [check]);

  const value = useMemo(() => ({ state, recheck: () => void check() }), [state, check]);

  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>;
}

export function useConnection(): ConnectionValue {
  return useContext(ConnectionContext);
}
