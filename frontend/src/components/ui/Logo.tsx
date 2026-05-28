// Logo mark for "Explain This Website"
// A browser window with a magnifying glass overlaid — "looking inside a website"
//
// Sharpened pass: taller chrome bar, uniform brighter dots, fewer/bolder
// content lines, larger lens with a dark separator ring + a tiny highlight,
// thicker handle. Stays readable at favicon sizes (16/20/24).

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer rounded tile */}
      <rect width="32" height="32" rx="8" fill="#7c3aed" />

      {/* Browser window body */}
      <rect x="5" y="7" width="22" height="18" rx="2.5" fill="#1e1b4b" />

      {/* Browser chrome bar — taller, brighter mid-violet */}
      <rect x="5" y="7" width="22" height="6" rx="2.5" fill="#5b21b6" />

      {/* Window dots — uniform light violet, slightly larger */}
      <circle cx="9.5"  cy="10" r="1.15" fill="#a78bfa" />
      <circle cx="13"   cy="10" r="1.15" fill="#a78bfa" />
      <circle cx="16.5" cy="10" r="1.15" fill="#a78bfa" />

      {/* Page content lines — fewer, bolder, light accent */}
      <rect x="8" y="16.5" width="11" height="2" rx="1" fill="#a78bfa" opacity="0.85" />
      <rect x="8" y="20"   width="7"  height="2" rx="1" fill="#a78bfa" opacity="0.55" />

      {/* Magnifying glass — bigger lens, dark separator for clarity */}
      <circle cx="21" cy="21" r="5.2" fill="#7c3aed" stroke="#1e1b4b" strokeWidth="0.6" />
      <circle cx="21" cy="21" r="3.3" fill="none" stroke="#fff" strokeWidth="1.9" />
      {/* Glass highlight — premium polish */}
      <circle cx="19.7" cy="19.7" r="0.7" fill="#fff" opacity="0.85" />

      {/* Handle — thicker, slightly longer */}
      <line x1="23.7" y1="23.7" x2="26.5" y2="26.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function LogoWordmark({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="text-sm font-semibold text-zinc-100 tracking-tight">
        Explain This Website
      </span>
    </div>
  );
}
