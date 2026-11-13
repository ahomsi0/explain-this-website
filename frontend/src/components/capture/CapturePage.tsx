// Where a page from behind a login is handed over: the visitor pastes the
// page's source and address, checks what they are about to send, and the page
// is analysed and saved to their account. Nothing reaches the API until they
// press the button on the confirm step.

import { useState, type FormEvent } from "react";
import { useAuth } from "../../context/useAuth";
import { authHref } from "../../lib/authLinks";
import { analyzeCapture } from "../../services/analyzeApi";
import { clearPendingCapture, loadPendingCapture, savePendingCapture, type PendingCapture } from "../../lib/pendingCapture";

type Pending = PendingCapture;

const primaryButton =
  "inline-flex items-center justify-center rounded-md bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60";
const quietLink = "text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors";
const inputCls =
  "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none";

function formatSize(chars: number): string {
  const kb = chars / 1024;
  return kb < 1024 ? `${Math.max(1, Math.round(kb))} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

// Unlike the main analyzer, the address here is never fetched, so internal
// hosts such as "localhost:3000" or "intranet" are fine.
function pageAddress(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (!/^https?:$/.test(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) return null;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function displayAddress(url: string): string {
  try {
    const u = new URL(url);
    return u.host + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return url;
  }
}

export function CapturePage() {
  const { user, loading: authLoading } = useAuth();
  // A page already pasted survives the trip to the sign-in page and back.
  const [pending, setPending] = useState<Pending | null>(loadPendingCapture);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discard = () => {
    clearPendingCapture();
    setPending(null);
    setError(null);
  };

  const analyze = async () => {
    if (!pending || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await analyzeCapture({
        url: pending.url,
        html: pending.html,
        source: pending.source,
        headers: pending.headers,
        timings: pending.timings,
      });
      clearPendingCapture();
      if (result.reportId) {
        window.location.assign(`/report/${result.reportId}`);
        return;
      }
      setError("The page was analyzed but the report could not be opened. Look for it in your history.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
    setBusy(false);
  };

  return (
    <main className="flex-1 px-4 sm:px-6 py-12 sm:py-16">
      <div className="mx-auto max-w-xl">
        {pending && (
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">Analyze this page?</h1>
            <dl className="mt-6 border-t border-zinc-800">
              {pending.title && <Row label="Page">{pending.title}</Row>}
              <Row label="Address"><span className="break-all">{displayAddress(pending.url)}</span></Row>
              <Row label="Size">{formatSize(pending.html.length)}</Row>
              <Row label="Sent as">Page source you pasted</Row>
            </dl>
            <p className="mt-5 text-[13px] leading-relaxed text-zinc-500">
              The report is saved to your account and only you can open it. It counts as one of today&rsquo;s analyses.
            </p>

            {error && <p role="alert" className="mt-4 text-[13px] text-red-400">{error}</p>}

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
              {authLoading ? (
                <span className="text-sm text-zinc-500">Checking your account&hellip;</span>
              ) : user ? (
                <button type="button" onClick={analyze} disabled={busy} className={primaryButton}>
                  {busy ? "Analyzing…" : "Analyze this page"}
                </button>
              ) : (
                <a href={authHref("login", "/capture")} className={primaryButton}>Sign in to analyze</a>
              )}
              {!busy && (
                <button type="button" onClick={discard} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                  Discard
                </button>
              )}
            </div>
            {!authLoading && !user && (
              <p className="mt-4 text-[13px] leading-relaxed text-zinc-500">
                Pages behind a login are analyzed for signed-in accounts, so the report has an owner. A free account is enough:{" "}
                <a href={authHref("signup", "/capture")} className={quietLink}>create one</a>.
              </p>
            )}
          </div>
        )}

        {!pending && <PasteForm onReady={(next) => { savePendingCapture(next); setPending(next); }} />}
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[84px_1fr] items-baseline gap-x-4 border-b border-zinc-800 py-3">
      <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-zinc-500">{label}</dt>
      <dd className="min-w-0 text-[13px] text-zinc-200">{children}</dd>
    </div>
  );
}

function PasteForm({ onReady }: { onReady: (pending: Pending) => void }) {
  const [address, setAddress] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const url = pageAddress(address);
    if (!url) { setError("Enter the page's address, for example app.example.com/dashboard."); return; }
    if (source.trim() === "") { setError("Paste the page source first."); return; }
    setError(null);
    onReady({ url, title: "", html: source, source: "paste" });
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-100">Analyze a page behind a login</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-400">
        Paste the page&rsquo;s source and its address. You will see what you are sending before anything is analyzed.{" "}
        <a href="/behind-login" className={quietLink}>How this works</a>
      </p>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-4" noValidate>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-zinc-300">Page address</span>
          <input
            type="text"
            inputMode="url"
            autoComplete="off"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="app.example.com/dashboard"
            className={inputCls}
          />
        </label>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="capture-source" className="text-[13px] font-medium text-zinc-300">Page source</label>
          <textarea
            id="capture-source"
            aria-describedby="capture-source-hint"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            rows={8}
            spellCheck={false}
            placeholder="<!doctype html>&#10;<html>&hellip;"
            className={`${inputCls} font-mono text-[12px] leading-relaxed`}
          />
          <p id="capture-source-hint" className="text-[12px] leading-relaxed text-zinc-500">
            On the page, right-click and choose View Page Source, select everything, copy it and paste it here.
            For an app that builds its pages with JavaScript, copy the finished page instead: open developer tools,
            right-click the html element and choose Copy, then Copy outerHTML.
          </p>
        </div>
        {error && <p role="alert" className="text-[13px] text-red-400">{error}</p>}
        <div>
          <button type="submit" className={primaryButton}>Continue</button>
        </div>
      </form>
    </div>
  );
}
