// Auth + audit-history API client. Token is stored in localStorage and attached
// to every authenticated request via the Authorization header.

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
const TOKEN_KEY = "etw_auth_token";

export interface UsageSummary {
  plan: "free" | "pro";
  dailyLimit: number;
  dailyUsed: number;
  dailyRemaining: number;
}

export interface AuthUser {
  id: number;
  email: string;
  createdAt: string;
  plan: "free" | "pro";
  subscriptionStatus: string;
  usage: UsageSummary;
  billingEnabled: boolean;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface AuditListItem {
  id: string;
  url: string;
  title?: string;
  createdAt: string;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): HeadersInit {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function jsonFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.error ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export async function signup(email: string, password: string): Promise<AuthResponse> {
  return jsonFetch<AuthResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return jsonFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchMe(): Promise<AuthUser> {
  return jsonFetch<AuthUser>("/api/auth/me");
}

export async function fetchAudits(): Promise<AuditListItem[]> {
  return jsonFetch<AuditListItem[]>("/api/audits");
}

export async function fetchUsage(): Promise<UsageSummary> {
  return jsonFetch<UsageSummary>("/api/usage");
}

export async function requestPasswordReset(email: string): Promise<void> {
  await jsonFetch<{ ok: boolean }>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<{ token?: string }> {
  return jsonFetch<{ ok: boolean; token?: string }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, code, newPassword }),
  });
}

export async function createCheckoutSession(): Promise<{ url: string }> {
  return jsonFetch<{ url: string }>("/api/billing/checkout-session", {
    method: "POST",
  });
}

export async function createPortalSession(): Promise<{ url: string }> {
  return jsonFetch<{ url: string }>("/api/billing/portal-session", {
    method: "POST",
  });
}

export async function deleteAudit(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/audits/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Delete failed (${res.status})`);
  }
}
