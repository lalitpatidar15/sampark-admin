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
import { api, isStaffRole, unwrap, type Session, type SessionUser } from "./api";

/**
 * Staff session handling.
 *
 * The access token is held in memory and mirrored into sessionStorage purely so
 * a page refresh does not force a re-login. It is deliberately not put in a
 * long-lived cookie or localStorage: a token in localStorage survives logout on
 * the device and is readable by any injected script.
 *
 * Known limitation: because the API issues bearer tokens rather than setting an
 * httpOnly cookie, this token is reachable by JavaScript and a successful XSS
 * would be able to exfiltrate a staff session. Before production, move staff auth
 * to an httpOnly, SameSite=Strict cookie set by this app as a BFF and add CSRF
 * protection. See README "Security notes".
 */
const STORAGE_KEY = "sampark.admin.session";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(emptyState);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setState({ ...emptyState, ready: true });
      return;
    }
    try {
      const saved = JSON.parse(raw) as { session: Session };
      // A non-staff token must never reach the console, even if one was
      // somehow stored by an earlier session on the same browser.
      if (!isStaffRole(saved.session.user.role)) {
        window.sessionStorage.removeItem(STORAGE_KEY);
        setState({ ...emptyState, ready: true });
        return;
      }
      setState({
        user: saved.session.user,
        permissions: saved.session.permissions,
        accessToken: saved.session.accessToken,
        ready: true,
      });
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY);
      setState({ ...emptyState, ready: true });
    }
  }, []);

  const requestOtp = useCallback(async (phone: string) => {
    setError(null);
    const result = await api.post<{ devCode?: string; resendAfterSeconds: number }>(
      "/auth/otp/request",
      { phone, purpose: "LOGIN" },
    );
    return unwrap(result);
  }, []);

  const verifyOtp = useCallback(async (phone: string, code: string) => {
    setError(null);
    try {
      const result = await api.post<Session>("/auth/login", { phone, code });
      const session = unwrap(result);

      if (!isStaffRole(session.user.role)) {
        setError("This account is not a staff account. Use the owner mobile app instead.");
        return;
      }
      if (session.user.status !== "ACTIVE") {
        setError("This staff account is not active. Contact a super admin.");
        return;
      }

      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ session }));
      setState({
        user: session.user,
        permissions: session.permissions,
        accessToken: session.accessToken,
        ready: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    window.sessionStorage.removeItem(STORAGE_KEY);
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
  if (!context) throw new Error("useAuth must be used inside an AuthProvider");
  return context;
}
