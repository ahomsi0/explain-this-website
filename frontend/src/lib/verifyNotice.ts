// Session-scoped "don't remind me" for the unverified-email bar.

const DISMISS_KEY = "etw_verify_notice_dismissed";

/** Hides the reminder for the rest of this browser session. */
export function dismissVerifyNotice(): void {
  try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* storage blocked */ }
}

export function isVerifyNoticeDismissed(): boolean {
  try { return sessionStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
}
