import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  fetchMe,
  getToken,
  setToken,
  login as apiLogin,
  signup as apiSignup,
  type AuthUser,
} from "../services/authApi";
import { AuthCtx } from "./authContextValue";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(!!getToken());

  const refreshUser = useCallback(async () => {
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
  }, []);

  // On mount: if a token exists, validate it against /api/auth/me.
  // Stale/expired tokens are silently cleared.
  useEffect(() => {
    if (!getToken()) return;
    fetchMe()
      .then(setUser)
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

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
