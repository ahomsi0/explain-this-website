import { createContext } from "react";
import type { AuthUser } from "../services/authApi";

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

export const AuthCtx = createContext<AuthState | null>(null);
