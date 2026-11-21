// Where a page from behind a login is handed over, in one of two ways.
//
// The Chrome extension: the visitor clicks "Explain this page" on the page
// itself, this tab opens, and the extension passes the page in. That click is
// the go-ahead, so a signed-in visitor goes straight to the report.
//
// Pasting: the visitor pastes the page's source and address, checks what they
// are about to send, and nothing reaches the API until they press the button.

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "../../context/useAuth";
import { authHref } from "../../lib/authLinks";
import { analyzeCapture } from "../../services/analyzeApi";
import { CAPTURE_REQUEST_MESSAGE, openedByExtension, readExtensionCapture } from "../../lib/extensionHandover";
import { clearPendingCapture, loadPendingCapture, savePendingCapture, type PendingCapture } from "../../lib/pendingCapture";
import { IconBadge, IconList, Panel, PanelTitle, inputCls, linkCls, primaryBtn } from "../ui/Panel";

type Pending = PendingCapture;

// The extension answers in well under a second. Past this, it is not there.
const WAIT_FOR_EXTENSION_MS = 4000;

const primaryButton = primaryBtn;
const quietLink = linkCls;

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
  const [fromExtension] = useState(() => openedByExtension(window.location.search));
  // A page already handed over survives the trip to the sign-in page and back.
  // A tab the extension just opened waits for the new page instead.
  const [pending, setPending] = useState<Pending | null>(() => (fromExtension ? null : loadPendingCapture()));
  const [waiting, setWaiting] = useState(fromExtension);
  const [missed, setMissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the extension has just handed a page over: the click in the
  // extension was the go-ahead, so the analysis starts without a second one.
  const startWhenReady = useRef(false);

  // Ask the extension for the page, and take its answer.
  useEffect(() => {
    if (!fromExtension) return;
    // Drop "?from=extension" so a refresh does not ask a second time.
    window.history.replaceState({}, "", window.location.pathname);

    let settled = false;
    let giveUp = 0;
    const settle = (capture: Pending | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(giveUp);
      if (capture) {
        savePendingCapture(capture);
        startWhenReady.current = true;
        setPending(capture);
      } else {
        setPending(loadPendingCapture());
        setMissed(true);
      }
      setWaiting(false);
    };

    const onMessage = (event: MessageEvent) => {
      // Only this tab's own extension script may hand a page over.
      if (event.source !== window || event.origin !== window.location.origin) return;
      const capture = readExtensionCapture(event.data);
      if (capture !== undefined) settle(capture);
    };
    window.addEventListener("message", onMessage);
    giveUp = window.setTimeout(() => settle(null), WAIT_FOR_EXTENSION_MS);
    window.postMessage({ type: CAPTURE_REQUEST_MESSAGE }, window.location.origin);

    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(giveUp);
    };
  }, [fromExtension]);

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

  // A page fresh from the extension is analyzed as soon as the account is
  // known. A signed-out visitor gets the confirm step and its sign-in link.
  useEffect(() => {
    if (!startWhenReady.current || !pending || authLoading || !user) return;
    startWhenReady.current = false;
    void analyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, authLoading, user]);

  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className={`mx-auto ${pending || waiting ? "max-w-xl" : "max-w-6xl"}`}>
        {waiting && (
          <Panel className="flex items-center gap-4">
            <span className="w-5 h-5 shrink-0 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" aria-hidden="true" />
            <p role="status" className="text-sm text-zinc-300">Getting the page from the extension&hellip;</p>
          </Panel>
        )}

        {pending && (
          <Panel className="shadow-xl shadow-black/20">
            <div className="flex items-center gap-3">
              <IconBadge icon={busy ? "clock" : "file"} />
              <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100">{busy ? "Analyzing this page" : "Analyze this page?"}</h1>
            </div>
            <dl className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/40 px-4">
              {pending.title && <Row label="Page">{pending.title}</Row>}
              <Row label="Address"><span className="break-all">{displayAddress(pending.url)}</span></Row>
              <Row label="Size">{formatSize(pending.html.length)}</Row>
              <Row label="Sent as">{pending.source === "paste" ? "Page source you pasted" : "The page as your browser shows it"}</Row>
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
          </Panel>
        )}

        {!pending && !waiting && (
          <>
            {missed && (
              <p role="alert" className="mb-8 rounded-md border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3 text-[13px] leading-relaxed text-amber-200/90">
                Nothing arrived from the extension. Go back to the page and click Explain this page again, or paste the page below.
              </p>
            )}
            <PasteForm onReady={(next) => { savePendingCapture(next); setPending(next); }} />
          </>
        )}
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[84px_1fr] items-baseline gap-x-4 border-b border-zinc-800 last:border-b-0 py-3">
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
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
      <Panel className="shadow-xl shadow-black/20">
        <div className="flex items-center gap-3">
          <IconBadge icon="lock" />
          <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100">Analyze a page behind a login</h1>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Paste the page&rsquo;s source and its address. You will see what you are sending before anything is analyzed.{" "}
          <a href="/behind-login" className={quietLink}>How this works</a>
        </p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-4" noValidate>
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
              rows={10}
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
      </Panel>

      <aside className="flex flex-col gap-6">
        <Panel>
          <PanelTitle>What happens next</PanelTitle>
          <ol className="mt-4 flex flex-col gap-3">
            {["You check the address and size of what you are sending.", "You confirm, and the page is analyzed.", "The report opens, saved to your account."].map((t, i) => (
              <li key={t} className="flex gap-3 text-[13px] leading-relaxed text-zinc-400">
                <span className="flex w-5 h-5 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-semibold text-zinc-300">{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
        </Panel>
        <Panel>
          <PanelTitle>What you send</PanelTitle>
          <IconList items={["The page's HTML and its address. No password, cookies or session.", "Only you can open the report. It has no public link.", "The HTML is discarded once it has been analyzed."]} icon="lock" tone="emerald" />
        </Panel>
      </aside>
    </div>
  );
}
