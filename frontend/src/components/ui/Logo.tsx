// Logo mark for "Explain This Website"
// A browser window with a magnifying glass overlaid — "looking inside a website"

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer rounded square background */}
      <rect width="32" height="32" rx="8" fill="#7c3aed" />

      {/* Browser chrome bar */}
      <rect x="5" y="7" width="22" height="18" rx="2.5" fill="#1e1b4b" />
      <rect x="5" y="7" width="22" height="5.5" rx="2.5" fill="#4c1d95" />

      {/* Browser dots */}
      <circle cx="9"  cy="9.75" r="1" fill="#7c3aed" opacity="0.8" />
      <circle cx="12.5" cy="9.75" r="1" fill="#7c3aed" opacity="0.5" />
      <circle cx="16" cy="9.75" r="1" fill="#7c3aed" opacity="0.3" />

      {/* Page content lines */}
      <rect x="8"  y="15.5" width="10" height="1.5" rx="0.75" fill="#4c1d95" opacity="0.8" />
      <rect x="8"  y="18.5" width="7"  height="1.5" rx="0.75" fill="#4c1d95" opacity="0.6" />
      <rect x="8"  y="21.5" width="8"  height="1.5" rx="0.75" fill="#4c1d95" opacity="0.4" />

      {/* Magnifying glass — overlapping bottom-right */}
      <circle cx="20.5" cy="20.5" r="4.5" fill="#7c3aed" />
      <circle cx="20.5" cy="20.5" r="3"   fill="none" stroke="white" strokeWidth="1.5" />
      <line   x1="22.6" y1="22.6" x2="25" y2="25"    stroke="white" strokeWidth="1.8" strokeLinecap="round" />
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
