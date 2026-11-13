import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/useAuth";
import { ForgotPasswordModal } from "./ForgotPasswordModal";
import { track } from "../../lib/analytics";
import { authHref, nextFromLocation, type AuthMode } from "../../lib/authLinks";
import { ResendVerification } from "./ResendVerification";
import { dismissVerifyNotice } from "../../lib/verifyNotice";

const COPY: Record<AuthMode, { title: string; intro: string; submit: string }> = {
  login: {
    title: "Sign in",
    intro: "Welcome back.",
    submit: "Sign in",
  },
  signup: {
    title: "Create your account",
    intro: "Free, and it takes about ten seconds.",
    submit: "Create account",
  },
};

// Left column: what an account is for. Every line is something the product
// does today, so the page sells nothing it cannot deliver.
const PITCH: Record<AuthMode, string> = {
  login: "Your audits are where you left them.",
  signup: "Keep every audit, and see what changed.",
};

const BENEFITS: { title: string; body: string }[] = [
  { title: "Saved history", body: "Every audit you run is kept, so you can come back to it and track a site over time." },
  { title: "Side-by-side compare", body: "Audit your site against a competitor in one run and see where each one wins." },
  { title: "Your own daily allowance", body: "5 analyses a day on a free account. No card needed." },
];

const inputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-[16px] sm:text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20";

/**
 * Sign in and sign up as full pages (/login, /signup) instead of a popup.
 * `?next=` carries the page to return to; it is validated in authLinks.
 */
export function AuthPage({ mode }: { mode: AuthMode }) {
  const { user, login, signup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const next = nextFromLocation();
  const copy = COPY[mode];
  const other: AuthMode = mode === "login" ? "signup" : "login";

  // After a new account is created the page stays to say that a
  // verification email is on its way; `createdFor` holds that address.
  const [createdFor, setCreatedFor] = useState<string | null>(null);
  const signingUp = useRef(false);

  // Covers both a fresh sign-in and arriving here while already signed in.
  // A sign-up in progress is excluded so the confirmation can be shown first.
  useEffect(() => {
    if (user && !signingUp.current && !createdFor) window.location.replace(next);
  }, [user, next, createdFor]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    track(mode === "login" ? "login_started" : "signup_started");
    signingUp.current = mode === "signup";
    try {
      if (mode === "login") {
        await login(email, password);
        // The effect above sends the visitor on once `user` is set.
      } else {
        await signup(email, password);
        // They have just been told about the email; no need for the
        // reminder bar on the very next page as well.
        dismissVerifyNotice();
        setCreatedFor(email);
      }
      track(mode === "login" ? "login_completed" : "signup_completed");
    } catch (err) {
      signingUp.current = false;
      track(mode === "login" ? "login_failed" : "signup_failed");
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  if (createdFor) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <main className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:py-28">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-400">Account created</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Check your inbox</h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            We sent a verification link to{" "}
            <span className="font-medium text-zinc-100 break-all">{createdFor}</span>. It works for 24 hours.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            You do not have to wait for it. Your account is ready to use now.
          </p>
          <a
            href={next}
            className="mt-8 inline-flex w-full items-center justify-center rounded-md bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500"
          >
            Continue
          </a>
          <p className="mt-8 border-t border-zinc-800 pt-5 text-sm text-zinc-400">
            Nothing arrived? Check your spam folder, or{" "}
            <ResendVerification label="resend the link" />
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Two columns from lg up: the words on the left, the form on the
          right. On phones the form comes first, since it is why you are here.
          From lg up the pair is centred in the space between the header and
          the footer, and the shorter form is centred against the words. */}
      <main className="mx-auto grid max-w-4xl grid-cols-1 gap-x-14 gap-y-12 px-4 py-12 sm:px-6 lg:min-h-[calc(100vh-10rem)] lg:grid-cols-2 lg:content-center lg:items-center lg:py-16">
        <section className="order-2 lg:order-1" aria-label="What an account gives you">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-400">Explain This Website</p>
          <p className="mt-3 max-w-md text-3xl font-bold leading-[1.15] tracking-tight sm:text-4xl">{PITCH[mode]}</p>
          <ul className="mt-8 max-w-md border-t border-zinc-800">
            {BENEFITS.map((b) => (
              <li key={b.title} className="border-b border-zinc-800 py-4">
                <p className="text-sm font-medium text-zinc-100">{b.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">{b.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="order-1 lg:order-2 lg:border-l lg:border-zinc-800 lg:py-6 lg:pl-14">
          <div className="max-w-sm lg:mx-auto">
        <h1 className="text-2xl font-bold tracking-tight">{copy.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">{copy.intro}</p>

        <form onSubmit={submit} className="mt-8 flex flex-col gap-4" aria-label={copy.title}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="auth-email" className="text-xs font-medium text-zinc-400">Email</label>
            <input
              type="email"
              id="auth-email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <label htmlFor="auth-password" className="text-xs font-medium text-zinc-400">Password</label>
              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              type="password"
              id="auth-password"
              required
              minLength={8}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder={mode === "signup" ? "8 or more characters" : "Your password"}
            />
          </div>

          {error && (
            <p role="alert" className="border-l-2 border-red-500 pl-3 text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 w-full rounded-md bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Please wait…" : copy.submit}
          </button>

          {mode === "signup" && (
            <p className="text-xs leading-relaxed text-zinc-500">
              By creating an account you agree to the{" "}
              <a href="/terms" className="text-zinc-300 underline decoration-zinc-700 underline-offset-2 hover:text-zinc-100">Terms</a>{" "}
              and{" "}
              <a href="/privacy" className="text-zinc-300 underline decoration-zinc-700 underline-offset-2 hover:text-zinc-100">Privacy Policy</a>.
            </p>
          )}
        </form>

        <p className="mt-8 border-t border-zinc-800 pt-5 text-sm text-zinc-400">
          {mode === "login" ? "New here? " : "Already have an account? "}
          <a href={authHref(other, next)} className="font-medium text-violet-400 hover:text-violet-300 transition-colors">
            {mode === "login" ? "Create an account" : "Sign in"}
          </a>
        </p>
          </div>
        </section>
      </main>

      <ForgotPasswordModal
        open={forgotOpen}
        initialEmail={email}
        onClose={() => setForgotOpen(false)}
        onBackToSignIn={() => setForgotOpen(false)}
      />
    </div>
  );
}
