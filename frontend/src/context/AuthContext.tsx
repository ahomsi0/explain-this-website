import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  fetchMe,
  getToken,
  setToken,
  login as apiLogin,
  signup as apiSignup,
  type AuthUser,
} from "../services/authApi";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(!!getToken());

  // On mount: if a token exists, validate it against /api/auth/me.
  // Stale/expired tokens are silently cleared.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    refreshUser().finally(() => setLoading(false));
  }, []);

  async function refreshUser() {
    if (!getToken()) {
      setUser(null);
      return;
    }
    try {
      const me = await fetchMe();
      setUser(me);
    } catch {
      setToken(null);
      setUser(null);
    }
  }

  async function login(email: string, password: string) {
    const res = await apiLogin(email, password);
    setToken(res.token);
    setUser(res.user);
  }

  async function signup(email: string, password: string) {
    const res = await apiSignup(email, password);
    setToken(res.token);
    setUser(res.user);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthCtx.Provider value={{ user, loading, login, signup, refreshUser, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
