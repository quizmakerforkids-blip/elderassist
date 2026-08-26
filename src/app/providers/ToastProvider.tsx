import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export type ToastTone = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
}

interface ToastValue {
  toasts: Toast[];
  push: (toast: { tone: ToastTone; title: string; message?: string }) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastValue>({ toasts: [], push: () => {}, dismiss: () => {} });

let nextToastId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer != null) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    ({ tone, title, message }: { tone: ToastTone; title: string; message?: string }) => {
      const id = nextToastId++;
      setToasts((prev) => [...prev.slice(-3), { id, tone, title, message }]);
      const ttl = tone === 'error' ? 8000 : 5000;
      const timer = window.setTimeout(() => dismiss(id), ttl);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastValue {
  return useContext(ToastContext);
}
