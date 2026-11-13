import { useState } from "react";
import { resendVerification } from "../../services/authApi";

type State =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "verified" }
  | { kind: "error"; message: string };

/**
 * "Resend the link" plus its outcome, shared by the post-sign-up screen and
 * the reminder bar. The server enforces a one-minute gap and says so in its
 * error, which is shown as is.
 */
export function ResendVerification({ label = "Resend the link", className = "" }: { label?: string; className?: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function resend() {
    setState({ kind: "sending" });
    try {
      const res = await resendVerification();
      setState({ kind: res.status === "verified" ? "verified" : "sent" });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Could not send the email." });
    }
  }

  if (state.kind === "sent") {
    return <span role="status" className={`text-emerald-400 ${className}`}>Sent. Check your inbox.</span>;
  }
  if (state.kind === "verified") {
    return <span role="status" className={`text-emerald-400 ${className}`}>Your email is already verified.</span>;
  }
  return (
    <span className={className}>
      <button
        type="button"
        onClick={() => void resend()}
        disabled={state.kind === "sending"}
        className="font-medium text-violet-400 underline decoration-violet-500/30 underline-offset-2 transition-colors hover:text-violet-300 disabled:opacity-60"
      >
        {state.kind === "sending" ? "Sending…" : label}
      </button>
      {state.kind === "error" && (
        <span role="alert" className="ml-2 text-red-400">{state.message}</span>
      )}
    </span>
  );
}
