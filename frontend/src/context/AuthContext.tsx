import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
  // Every auth operation gets a monotonically increasing version. This keeps
  // a slow initial /me request from overwriting a sign-in that completed
  // while that request was still in flight.
  const authVersion = useRef(0);

  const refreshUser = useCallback(async () => {
    const version = ++authVersion.current;
    try {
      const me = await fetchMe();
      if (authVersion.current === version) setUser(me);
    } catch {
      if (authVersion.current === version) setUser(null);
    }
  }, []);

  // The browser session is an HttpOnly cookie, so validation happens through
  // the API rather than by inspecting browser storage.
  useEffect(() => {
    const version = authVersion.current;
    fetchMe()
      .then((me) => {
        if (authVersion.current === version) setUser(me);
      })
      .catch(() => {
        if (authVersion.current === version) setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    ++authVersion.current;
    const res = await apiLogin(email, password);
    setUser(res.user);
  }

  async function signup(email: string, password: string) {
    ++authVersion.current;
    const res = await apiSignup(email, password);
    setUser(res.user);
  }

  async function logout() {
    ++authVersion.current;
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
