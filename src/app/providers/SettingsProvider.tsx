import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type AssistantLanguage = 'en' | 'hi' | 'te' | 'ml' | 'mr' | 'ta';

interface Settings {
  largerText: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  language: AssistantLanguage;
}

interface SettingsValue extends Settings {
  update: (patch: Partial<Settings>) => void;
}

const STORAGE_KEY = 'ea_settings_v1';

const DEFAULT_SETTINGS: Settings = {
  largerText: false,
  highContrast: false,
  reducedMotion:
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  language: 'en',
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const SettingsContext = createContext<SettingsValue>({
  ...DEFAULT_SETTINGS,
  update: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.textSize = settings.largerText ? 'large' : 'default';
    root.dataset.contrast = settings.highContrast ? 'high' : 'default';
    root.dataset.motion = settings.reducedMotion ? 'reduced' : 'full';
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
    }
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo(() => ({ ...settings, update }), [settings, update]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  return useContext(SettingsContext);
}

export const LANGUAGE_OPTIONS: { value: AssistantLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी — Hindi' },
  { value: 'te', label: 'తెలుగు — Telugu' },
  { value: 'ml', label: 'മലയാളം — Malayalam' },
  { value: 'mr', label: 'मराठी — Marathi' },
  { value: 'ta', label: 'தமிழ் — Tamil' },
];
