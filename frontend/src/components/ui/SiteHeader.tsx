import { useAuth } from "../../context/useAuth";
import { useTheme } from "../../context/useTheme";
import { LogoWordmark } from "./Logo";
import { UserMenu } from "../auth/UserMenu";

// Universal top bar for every pre-analysis page (landing, legal, pricing,
// changelog). Owns nothing modal-related: sign-in/history triggers are passed
// in by the app shell, which renders the modals globally.
export function SiteHeader({
  onSignIn,
  onShowHistory,
}: {
  onSignIn: () => void;
  onShowHistory: () => void;
}) {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <header className="fixed inset-x-0 top-0 z-40 backdrop-blur-md bg-zinc-950/40 border-b border-zinc-900/80 px-4 sm:px-6 h-14 flex items-center justify-between">
      <a href="/" aria-label="Explain This Website home">
        <LogoWordmark size={20} />
      </a>
      <div className="flex items-center gap-2">
        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-1 mr-1">
          <a
            href="/guides"
            className="px-2.5 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
          >
            Guides
          </a>
          <a
            href="/compare"
            className="px-2.5 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
          >
            Compare
          </a>
        </nav>
        <div className="hidden sm:block w-px h-4 bg-zinc-800" aria-hidden="true" />
        <button
          onClick={toggle}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          className="flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 transition-colors"
        >
          {theme === "dark" ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
        {user ? (
          <>
            <button
              onClick={onShowHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              History
            </button>
            <UserMenu />
          </>
        ) : (
          <button
            onClick={onSignIn}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 transition-colors"
          >
            Sign in
          </button>
        )}
        {!user && (
          <a
            href="/go-pro"
            className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors"
          >
            Get Pro
          </a>
        )}
      </div>
    </header>
  );
}
