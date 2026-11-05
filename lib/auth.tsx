"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isStaffRole, type SessionUser } from "./api";

interface AuthState {
  user: SessionUser | null;
  permissions: string[];
  accessToken: string | null;
  ready: boolean;
}

interface AuthContextValue extends AuthState {
  requestOtp: (phone: string) => Promise<{ devCode?: string; resendAfterSeconds: number }>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  logout: () => void;
  can: (permission: string) => boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const emptyState: AuthState = { user: null, permissions: [], accessToken: null, ready: false };

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(emptyState);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    try {
      const data = await fetchJson<{ user: SessionUser | null; permissions: string[] }>('/api/auth/me');
      if (data.user && isStaffRole(data.user.role) && data.user.status === 'ACTIVE') {
        setState({ user: data.user, permissions: data.permissions, accessToken: null, ready: true });
      } else {
        setState({ ...emptyState, ready: true });
      }
    } catch {
      setState({ ...emptyState, ready: true });
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const requestOtp = useCallback(async (phone: string) => {
    setError(null);
    const result = await fetchJson<{ devCode?: string; resendAfterSeconds: number }>('/api/auth/otp', {
      method: 'POST',
      body: JSON.stringify({ phone, purpose: 'LOGIN' }),
    });
    return result;
  }, []);

  const verifyOtp = useCallback(async (phone: string, code: string) => {
    setError(null);
    try {
      const result = await fetchJson<{ user: SessionUser; permissions: string[]; accessToken: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
      });

      if (!isStaffRole(result.user.role)) {
        setError('This account is not a staff account. Use the owner mobile app instead.');
        return;
      }
      if (result.user.status !== 'ACTIVE') {
        setError('This staff account is not active. Contact a super admin.');
        return;
      }

      setState({ user: result.user, permissions: result.permissions, accessToken: result.accessToken, ready: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await fetchJson('/api/auth/logout', { method: 'POST' });
    setState({ ...emptyState, ready: true });
  }, []);

  const can = useCallback(
    (permission: string) => state.permissions.includes(permission),
    [state.permissions],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, requestOtp, verifyOtp, logout, can, error }),
    [state, requestOtp, verifyOtp, logout, can, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider');
  return context;
}