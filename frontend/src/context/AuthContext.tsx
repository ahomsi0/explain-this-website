import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  signup as apiSignup,
  type AuthUser,
} from "../services/authApi";
import { AuthCtx } from "./authContextValue";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = await fetchMe();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  // The browser session is an HttpOnly cookie, so validation happens through
  // the API rather than by inspecting browser storage.
  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await apiLogin(email, password);
    setUser(res.user);
  }

  async function signup(email: string, password: string) {
    const res = await apiSignup(email, password);
    setUser(res.user);
  }

  async function logout() {
    try {
      await apiLogout();
    } catch {
      // best-effort; clear local state regardless
    }
    setUser(null);
  }

  return (
    <AuthCtx.Provider value={{ user, loading, login, signup, refreshUser, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
