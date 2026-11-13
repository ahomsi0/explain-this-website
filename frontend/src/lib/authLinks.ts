// Links to the sign-in and sign-up pages. Every "Sign in" in the app goes
// through here so the visitor returns to where they were afterwards.

export type AuthMode = "login" | "signup";

const AUTH_PATH: Record<AuthMode, string> = { login: "/login", signup: "/signup" };

/**
 * A return target is only honoured when it is a path on this site. Anything
 * else (another origin, "//host", a scheme) falls back to the homepage, so a
 * crafted ?next= link cannot send someone elsewhere after they sign in.
 */
export function safeNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/";
  // Returning to an auth page after signing in would be a loop.
  if (/^\/(login|signup)([/?#]|$)/.test(raw)) return "/";
  return raw;
}

/** Href for the sign-in or sign-up page; `next` defaults to the current page. */
export function authHref(mode: AuthMode, next?: string): string {
  const target = safeNext(next ?? window.location.pathname + window.location.search);
  return target === "/" ? AUTH_PATH[mode] : `${AUTH_PATH[mode]}?next=${encodeURIComponent(target)}`;
}

/** The validated return target on the current auth page. */
export function nextFromLocation(): string {
  return safeNext(new URLSearchParams(window.location.search).get("next"));
}
