import { LogoMark } from "../ui/Logo";

export function Header() {
  return (
    <header className="hero-bg text-center pt-24 pb-16 px-6">
      {/* Logo mark */}
      <div className="inline-flex mb-7">
        <LogoMark size={64} />
      </div>

      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
        <span className="gradient-text">Explain This Website</span>
      </h1>

      <p className="mt-5 text-base sm:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
        Paste any URL and get an instant report on its{" "}
        <span className="text-slate-200 font-medium">tech stack</span>,{" "}
        <span className="text-slate-200 font-medium">SEO health</span>, and{" "}
        <span className="text-slate-200 font-medium">conversion opportunities</span>.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
        {[
          { label: "Tech Detection",  color: "border-violet-700/50 text-violet-300 bg-violet-950/40" },
          { label: "SEO Audit",       color: "border-blue-700/50   text-blue-300   bg-blue-950/40"   },
          { label: "UX Analysis",     color: "border-emerald-700/50 text-emerald-300 bg-emerald-950/40" },
          { label: "Recommendations", color: "border-amber-700/50  text-amber-300  bg-amber-950/40"  },
        ].map((f) => (
          <span key={f.label} className={`text-xs font-medium px-3 py-1 rounded-full border ${f.color}`}>
            {f.label}
          </span>
        ))}
      </div>

      <div className="glow-divider mt-14 max-w-lg mx-auto" />
    </header>
  );
}
