import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

type State = "loading" | "success" | "already" | "error";

function getToken() {
  return new URLSearchParams(window.location.search).get("token") ?? "";
}

export function VerifyEmailPage() {
  const token = getToken();
  const [state, setState] = useState<State>(token ? "loading" : "error");
  const [message, setMessage] = useState(
    token ? "" : "No verification token found. Please use the link from your email.",
  );

  useEffect(() => {
    if (!token) return;

    fetch(`${API_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
      credentials: "include",
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          const msg: string = data.message ?? "";
          setState(msg.includes("already") ? "already" : "success");
        } else {
          setMessage(data.error ?? "Verification failed. The link may have expired.");
          setState("error");
        }
      })
      .catch(() => {
        setMessage("Could not reach the server. Please try again.");
        setState("error");
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
        {state === "loading" && (
          <>
            <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-400 text-sm">Verifying your email…</p>
          </>
        )}

        {state === "success" && (
          <>
            <div className="text-4xl mb-4">✓</div>
            <h1 className="text-xl font-bold text-zinc-100 mb-2">Email verified</h1>
            <p className="text-zinc-400 text-sm mb-6">Your account is now confirmed. You're all set.</p>
            <a
              href="/"
              className="inline-block bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
            >
              Go to homepage
            </a>
          </>
        )}

        {state === "already" && (
          <>
            <div className="text-4xl mb-4">✓</div>
            <h1 className="text-xl font-bold text-zinc-100 mb-2">Already verified</h1>
            <p className="text-zinc-400 text-sm mb-6">Your email address has already been confirmed.</p>
            <a
              href="/"
              className="inline-block bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
            >
              Go to homepage
            </a>
          </>
        )}

        {state === "error" && (
          <>
            <div className="text-4xl mb-4">✗</div>
            <h1 className="text-xl font-bold text-zinc-100 mb-2">Verification failed</h1>
            <p className="text-zinc-400 text-sm mb-6">{message}</p>
            <a
              href="/"
              className="inline-block bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
            >
              Go to homepage
            </a>
          </>
        )}
      </div>
    </div>
  );
}
