import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { IS_DEMO_MODE } from '../../services/config';
import { useDemoVersion } from '../../demo/demoStore';
import { getEmergencies } from '../../services/emergencies';
import { getNotifications } from '../../services/notifications';

interface EventCounts {
  unreadNotifications: number;
  openEmergencies: number;
}

interface EventCountsValue extends EventCounts {
  refresh: () => void;
}

const EventCountsContext = createContext<EventCountsValue>({
  unreadNotifications: 0,
  openEmergencies: 0,
  refresh: () => {},
});

export function EventCountsProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<EventCounts>({
    unreadNotifications: 0,
    openEmergencies: 0,
  });
  const demoVersion = useDemoVersion();
  const [poll, setPoll] = useState(0);

  const refresh = useCallback(() => setPoll((p) => p + 1), []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [notifications, emergencies] = await Promise.all([
          getNotifications(),
          getEmergencies(),
        ]);
        if (!alive) return;
        setCounts({
          unreadNotifications: notifications.filter((n) => !n.read).length,
          openEmergencies: emergencies.filter((e) => e.status === 'OPEN').length,
        });
      } catch {
      }
    })();
    return () => {
      alive = false;
    };
  }, [demoVersion, poll]);

  useEffect(() => {
    if (IS_DEMO_MODE) return;
    const timer = window.setInterval(refresh, 45_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const value = useMemo(() => ({ ...counts, refresh }), [counts, refresh]);

  return <EventCountsContext.Provider value={value}>{children}</EventCountsContext.Provider>;
}

export function useEventCounts(): EventCountsValue {
  return useContext(EventCountsContext);
}
