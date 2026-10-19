/** Rendered for any path the router doesn't know. Vercel serves the
 *  prerendered copy (dist/404.html) with a real 404 status. */
export function NotFoundPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-20">
      <div className="text-center max-w-md">
        <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-600 mb-3">404</p>
        <h1 className="text-2xl font-semibold text-zinc-100 mb-2">Page not found</h1>
        <p className="text-sm text-zinc-500 leading-relaxed mb-6">
          The page you’re looking for doesn’t exist or has moved.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
          <a href="/" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors">Analyze a website</a>
          <a href="/guides" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors">Fix guides</a>
          <a href="/compare" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors">Compare sites</a>
        </div>
      </div>
    </main>
  );
}
