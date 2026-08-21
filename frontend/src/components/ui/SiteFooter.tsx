export function SiteFooter() {
  return (
    <footer className="px-4 sm:px-6 py-8 border-t border-zinc-900/80">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-600">
        <p>© {new Date().getFullYear()} Explain This Website</p>
        <div className="flex items-center gap-4">
          <a href="mailto:support@explainthewebsite.com" className="hover:text-zinc-400 transition-colors">Support</a>
          <a href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy</a>
          <a href="/terms" className="hover:text-zinc-400 transition-colors">Terms</a>
          <a href="/whats-new" className="hover:text-zinc-400 transition-colors">What&apos;s new</a>
          <a href="https://github.com/ahomsi0/explain-this-website#api-reference" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">API</a>
          <a href="https://github.com/ahomsi0/explain-this-website" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">GitHub</a>
        </div>
      </div>
    </footer>
  );
}
