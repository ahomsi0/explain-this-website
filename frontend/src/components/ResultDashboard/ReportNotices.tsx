// Strips under the report header that say what kind of report this is, when
// that changes how it should be read.

const strip = "flex flex-wrap items-center gap-x-2 gap-y-1 border-b px-4 py-2 sm:px-6";

/** The report is of a page the visitor's own browser sent, and is theirs alone. */
export function CaptureNotice({ source }: { source: "browser" | "paste" }) {
  return (
    <div className={`${strip} border-zinc-800`}>
      <span className="font-mono text-[10.5px] tracking-[0.08em] text-violet-400">PRIVATE</span>
      <p className="text-xs text-zinc-400">
        {source === "browser" ? "Captured from your browser." : "Analyzed from page source you pasted."}{" "}
        Only you can open this report.
      </p>
      <a href="/behind-login" className="text-xs text-zinc-400 underline underline-offset-2 hover:text-zinc-200 transition-colors">
        How this works
      </a>
    </div>
  );
}

/**
 * The analyzer asked for one page and got a sign-in form. Without this the
 * report reads as an audit of the page the visitor wanted, which it is not.
 */
export function LoginWallNotice() {
  return (
    <div className={`${strip} border-amber-500/20 bg-amber-500/[0.07]`}>
      <p className="text-xs text-amber-200/90">
        This looks like a sign-in page, so the report describes the login screen and not what is behind it.
      </p>
      <a
        href="/behind-login"
        className="text-xs font-semibold text-amber-300 underline underline-offset-2 hover:text-amber-100 transition-colors"
      >
        Analyze the page behind the login
      </a>
    </div>
  );
}
