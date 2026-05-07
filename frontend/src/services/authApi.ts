// Auth + audit-history API client. Token is stored in localStorage and attached
// to every authenticated request via the Authorization header.

import { getVisitorId } from "../lib/visitorId";

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

export interface AdminUserRow {
  id: number;
  email: string;
  plan: "free" | "pro";
  subscriptionStatus: string;
  dailyLimit: number;
  dailyUsed: number;
  dailyRemaining: number;
  createdAt: string;
  suspendedAt?: string;   // ISO string when suspended, absent if not
  adminNote?: string;
}

export interface SlowAuditRow {
  url: string;
  durationMs: number;
  createdAt: string;
}

export interface AuditOutcomeRow {
  date: string;
  total: number;
  perfOk: number;
  perfFail: number;
}

export interface AdminVisitorRow {
  visitorId: string;
  dailyLimit: number;
  dailyUsed: number;
  dailyRemaining: number;
  updatedAt: string;
}

export interface RecentAuditRow {
  id: string;
  url: string;
  title: string;
  email?: string;
  createdAt: string;
}

export interface DayCount {
  date: string;
  count: number;
}

export interface UrlCount {
  url: string;
  count: number;
}

export interface FailureEntry {
  at: string;
  url: string;
  message: string;
  userId?: number;
}

export interface HealthState {
  lastSuccessAt: string;
  lastErrorAt: string;
  lastErrorMsg: string;
}

export interface SystemHealth {
  dbOk: boolean;
  dbLatencyMs: number;
  pagespeedKeySet: boolean;
  resendKeySet: boolean;
  jwtSecretSet: boolean;
  stripeKeySet: boolean;
  pagespeed: HealthState;
  resend: HealthState;
}

export interface AdminOverview {
  currentDate: string;
  adminEmail?: string;
  anySignedInIsAdmin: boolean;
  users: AdminUserRow[];
  anonymousVisitors: AdminVisitorRow[];
  recentAudits: RecentAuditRow[];
  auditsByDay: DayCount[];
  topUrls: UrlCount[];
  failureLog: FailureEntry[];
  systemHealth: SystemHealth;
  featureFlags: Record<string, boolean>;
  slowAudits: SlowAuditRow[];
  auditOutcomes: AuditOutcomeRow[];
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
  const base = { "X-Visitor-Id": getVisitorId() };
  return t ? { ...base, Authorization: `Bearer ${t}` } : base;
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

export async function fetchAdminOverview(): Promise<AdminOverview> {
  return jsonFetch<AdminOverview>("/api/admin/overview");
}

export async function updateAdminUserUsage(userId: number, count: number): Promise<void> {
  await jsonFetch<{ ok: boolean }>("/api/admin/user-usage", {
    method: "POST",
    body: JSON.stringify({ userId, count }),
  });
}

export async function updateAdminAnonUsage(visitorId: string, count: number): Promise<void> {
  await jsonFetch<{ ok: boolean }>("/api/admin/anon-usage", {
    method: "POST",
    body: JSON.stringify({ visitorId, count }),
  });
}

export async function updateAdminUserPlan(userId: number, plan: "free" | "pro", subscriptionStatus?: string): Promise<void> {
  await jsonFetch<{ ok: boolean }>("/api/admin/user-plan", {
    method: "POST",
    body: JSON.stringify({ userId, plan, subscriptionStatus }),
  });
}

export async function patchAdminUser(
  userId: number,
  patch: { plan?: "free" | "pro"; suspended?: boolean; note?: string }
): Promise<void> {
  await jsonFetch<void>(`/api/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function toggleAdminFlag(name: string, enabled: boolean): Promise<void> {
  await jsonFetch<{ ok: boolean }>("/api/admin/flag", {
    method: "POST",
    body: JSON.stringify({ name, enabled }),
  });
}

export interface BroadcastResult {
  sent: number;
  failed: number;
  total: number;
}

export async function adminBroadcastEmail(subject: string, body: string): Promise<BroadcastResult> {
  return jsonFetch<BroadcastResult>("/api/admin/broadcast", {
    method: "POST",
    body: JSON.stringify({ subject, body }),
  });
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

export async function clearAudits(): Promise<void> {
  const res = await fetch(`${API_URL}/api/audits`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Clear failed (${res.status})`);
  }
}
