import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppRole, Caregiver, CaredPerson } from '../../types';
import { signIn as signInRequest, register as registerRequest } from '../../services/auth';
import { setApiUser } from '../../services/api';
import { APP_ROLE } from '../../services/config';

const STORAGE_KEY = 'ea_session_v1';
const ROLE_KEY = 'ea_app_role';

interface AuthValue {
  user: Caregiver | CaredPerson | null;
  role: AppRole;
  signingIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
  updateCaredProfile: (patch: Partial<CaredPerson>) => void;
}

const AuthContext = createContext<AuthValue>({
  user: null,
  role: APP_ROLE,
  signingIn: false,
  signIn: async () => {},
  register: async () => {},
  signOut: () => {},
  updateCaredProfile: () => {},
});

function loadInitialUser(): Caregiver | CaredPerson | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Caregiver | CaredPerson;
    setApiUser(parsed.id);
    return parsed;
  } catch {
    return null;
  }
}

function loadRole(): AppRole {
  try {
    const stored = localStorage.getItem(ROLE_KEY);
    if (stored === 'caregiver' || stored === 'cared') return stored;
  } catch {}
  return APP_ROLE;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Caregiver | CaredPerson | null>(loadInitialUser);
  const [role, setRole] = useState<AppRole>(loadRole);
  const [signingIn, setSigningIn] = useState(false);

  const signIn = useCallback(async (email: string, password: string) => {
    setSigningIn(true);
    try {
      const result = await signInRequest(email, password);
      setUser(result);
      const resolvedRole: AppRole = 'age' in result && result.age > 0 ? 'cared' : 'caregiver';
      setRole(resolvedRole);
      setApiUser(result.id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
        localStorage.setItem(ROLE_KEY, resolvedRole);
      } catch {}
    } finally {
      setSigningIn(false);
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setSigningIn(true);
    try {
      const result = await registerRequest(name, email, password, APP_ROLE);
      setUser(result);
      setRole(APP_ROLE);
      setApiUser(result.id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
        localStorage.setItem(ROLE_KEY, APP_ROLE);
      } catch {}
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    setRole(APP_ROLE);
    setApiUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ROLE_KEY);
    } catch {}
  }, []);

  const updateCaredProfile = useCallback((patch: Partial<CaredPerson>) => {
    setUser((prev) => {
      if (!prev || !('age' in prev)) return prev;
      const updated = { ...prev, ...patch } as CaredPerson;
      setApiUser(updated.id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const value = useMemo(
    () => ({ user, role, signingIn, signIn, register, signOut, updateCaredProfile }),
    [user, role, signingIn, signIn, register, signOut, updateCaredProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  return useContext(AuthContext);
}
