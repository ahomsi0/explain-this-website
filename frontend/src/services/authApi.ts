// Auth + audit-history API client. Browser sessions use an HttpOnly cookie set
// by the API, so JavaScript never needs to read or persist a JWT.

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export interface UsageSummary {
  plan: "free" | "pro" | "owner";
  dailyLimit: number;
  dailyUsed: number;
  dailyRemaining: number;
}

export interface AuthUser {
  id: number;
  email: string;
  createdAt: string;
  plan: "free" | "pro" | "owner";
  subscriptionStatus: string;
  usage: UsageSummary;
  billingEnabled: boolean;
}

export interface AuthResponse {
  user: AuthUser;
}

export interface AuditListItem {
  id: string;
  url: string;
  title?: string;
  createdAt: string;
  shareable: boolean;
  shareExpiresAt?: string;
}

export interface UsageHistoryDay {
  date: string;
  count: number;
}

export interface UsageHistory {
  current: UsageSummary;
  days: UsageHistoryDay[];
  apiRequestsLast30Days: number;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
  todayRequests: number;
}

export interface CreatedApiKey {
  id: string;
  name: string;
  prefix: string;
  key: string;
  createdAt: string;
}

export interface Webhook {
  id: string;
  url: string;
  createdAt: string;
  lastDeliveredAt?: string;
  lastStatus?: number;
  failureCount: number;
  revokedAt?: string;
}

export interface CreatedWebhook {
  id: string;
  url: string;
  createdAt: string;
  secret: string;
}

export interface AuditComparisonSnapshot {
  id: string;
  url: string;
  title: string;
  createdAt: string;
  seoScore: number;
  uxScore: number;
  conversionScore: number;
  performanceScore?: number;
  priorityIssueCount: number;
  brokenLinkCount: number;
  securityFailureCount: number;
}

export interface AuditComparison {
  before: AuditComparisonSnapshot;
  after: AuditComparisonSnapshot;
}

export interface AdminUserRow {
  id: number;
  email: string;
  plan: "free" | "pro" | "owner";
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

export interface ConversionFunnel {
  landingViews: number;
  analysisStarted: number;
  analysisCompleted: number;
  signupCompleted: number;
  repeatUsage: number;
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
  tapKeySet: boolean;
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
  conversionFunnel: ConversionFunnel;
}

async function jsonFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    return await jsonFetch<AuthUser>("/api/auth/me", { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function logout(): Promise<void> {
  await jsonFetch<void>("/api/auth/logout", { method: "POST" });
}

export async function fetchAudits(): Promise<AuditListItem[]> {
  return jsonFetch<AuditListItem[]>("/api/audits");
}

export async function compareAudits(a: string, b: string): Promise<AuditComparison> {
  return jsonFetch<AuditComparison>(`/api/audits/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
}

// compareLive runs fresh analyses of two sites and returns the same
// before/after shape as saved-audit comparison (before = "yours").
export async function compareLive(yours: string, competitor: string): Promise<AuditComparison> {
  return jsonFetch<AuditComparison>("/api/compare-live", {
    method: "POST",
    body: JSON.stringify({ yours, competitor }),
  });
}

export async function revokeShare(id: string): Promise<void> {
  await jsonFetch<void>(`/api/audits/${id}/revoke-share`, { method: "POST" });
}

export async function fetchUsage(): Promise<UsageSummary> {
  return jsonFetch<UsageSummary>("/api/usage");
}

export async function fetchUsageHistory(): Promise<UsageHistory> {
  return jsonFetch<UsageHistory>("/api/usage/history");
}

export async function listApiKeys(): Promise<ApiKey[]> {
  return jsonFetch<ApiKey[]>("/api/api-keys");
}

export async function createApiKey(name: string): Promise<CreatedApiKey> {
  return jsonFetch<CreatedApiKey>("/api/api-keys", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function revokeApiKey(id: string): Promise<void> {
  await jsonFetch<void>(`/api/api-keys/${id}`, { method: "DELETE" });
}

export async function listWebhooks(): Promise<Webhook[]> {
  return jsonFetch<Webhook[]>("/api/webhooks");
}

export async function createWebhook(url: string): Promise<CreatedWebhook> {
  return jsonFetch<CreatedWebhook>("/api/webhooks", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export async function revokeWebhook(id: string): Promise<void> {
  await jsonFetch<void>(`/api/webhooks/${id}`, { method: "DELETE" });
}

export async function testWebhook(id: string): Promise<void> {
  await jsonFetch<{ ok: boolean }>(`/api/webhooks/${id}/test`, { method: "POST" });
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

export async function resetPassword(email: string, code: string, newPassword: string): Promise<{ ok: boolean }> {
  return jsonFetch<{ ok: boolean }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, code, newPassword }),
  });
}

export async function createCheckoutSession(interval: "monthly" | "yearly" = "monthly"): Promise<{ url: string }> {
  return jsonFetch<{ url: string }>("/api/billing/checkout-session", {
    method: "POST",
    body: JSON.stringify({ interval }),
  });
}

export async function cancelSubscription(): Promise<void> {
  await jsonFetch<void>("/api/billing/cancel", { method: "POST" });
}

export async function deleteAudit(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/audits/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Delete failed (${res.status})`);
  }
}

export async function clearAudits(): Promise<void> {
  const res = await fetch(`${API_URL}/api/audits`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Clear failed (${res.status})`);
  }
}
