import { IconBadge, Panel } from "./Panel";
import { Icon, type IconName } from "./icons";

const WAYS_ON: { href: string; icon: IconName; title: string; text: string }[] = [
  { href: "/", icon: "search", title: "Analyze a website", text: "Paste any URL and get it explained in plain English." },
  { href: "/guides", icon: "book", title: "Fix guides", text: "Step-by-step repairs for what an audit finds." },
  { href: "/compare", icon: "scale", title: "Compare sites", text: "Put your site next to a competitor's." },
];

/** Rendered for any path the router doesn't know. Vercel serves the
 *  prerendered copy (dist/404.html) with a real 404 status. */
export function NotFoundPage() {
  return (
    <main className="flex-1 flex items-center px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div className="w-full max-w-3xl mx-auto">
        <Panel className="text-center !p-8 sm:!p-12">
          <div className="flex justify-center"><IconBadge icon="compass" size="lg" /></div>
          <p className="mt-6 text-[12px] font-semibold tracking-[0.2em] text-violet-300">ERROR 404</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">Page not found</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-400">
            The page you’re looking for doesn’t exist or has moved.
          </p>
        </Panel>

        <h2 className="sr-only">Where to go instead</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-3">
          {WAYS_ON.map((w) => (
            <li key={w.href}>
              <a
                href={w.href}
                className="group flex h-full flex-col rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 hover:border-zinc-700 hover:bg-zinc-900/70 transition-colors"
              >
                <IconBadge icon={w.icon} />
                <span className="mt-4 flex items-center justify-between gap-2 text-[14px] font-semibold text-zinc-100">
                  {w.title}
                  <Icon name="arrowRight" className="w-4 h-4 text-zinc-500 group-hover:translate-x-0.5 group-hover:text-violet-300 transition-all" />
                </span>
                <span className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">{w.text}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
