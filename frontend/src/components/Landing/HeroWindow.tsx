// The landing page backdrop: a faint outline of a browser window around the
// hero, standing for the page a visitor is about to have explained.
//
// It reacts in three small ways. Its address bar shows whatever is typed in
// the URL field. The highlighted line follows the cursor along the outline
// and names the part of a page the analyzer reads there. A single scan line
// runs down the window when typing starts.
//
// It is decoration: hidden from assistive tech, never in the way of a click,
// and absent on phones, where there is no room around the hero.

import { useEffect, useRef, useState } from "react";
import { nearestBox } from "../../lib/nearestRect";

interface OutlineLine {
  side: "left" | "right";
  top: number;
  width: number;
  label: string;
}

// What an analysis reads off a page, laid out like the page itself.
const LINES: OutlineLine[] = [
  { side: "left", top: 174, width: 116, label: "Title" },
  { side: "left", top: 202, width: 80, label: "Meta description" },
  { side: "left", top: 230, width: 100, label: "Headings" },
  { side: "left", top: 258, width: 56, label: "Links" },
  { side: "left", top: 314, width: 92, label: "Call to action" },
  { side: "right", top: 174, width: 116, label: "Tech stack" },
  { side: "right", top: 202, width: 80, label: "Scripts" },
  { side: "right", top: 230, width: 100, label: "Images" },
  { side: "right", top: 258, width: 56, label: "Security headers" },
];

/** The line that is highlighted before the cursor has been near any of them. */
const RESTING_LINE = 4;
/** How close, in pixels, the cursor must be to a line to take the highlight. */
const REACH = 150;

export function HeroWindow({ address }: { address: string }) {
  const [active, setActive] = useState(RESTING_LINE);
  const [labelled, setLabelled] = useState(false);
  const [scans, setScans] = useState(0);
  const lineRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const shown = address.trim();

  // One scan each time the field goes from empty to having something in it.
  // Adjusted during render, not in an effect, so the scan line is in the
  // same paint as the first typed character.
  const [hadAddress, setHadAddress] = useState(false);
  const hasAddress = shown !== "";
  if (hasAddress !== hadAddress) {
    setHadAddress(hasAddress);
    if (hasAddress) setScans((n) => n + 1);
  }

  useEffect(() => {
    // Only where there is a real cursor; a finger has no hover.
    if (!window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) return;

    let frame = 0;
    let point: { x: number; y: number } | null = null;
    const pick = () => {
      frame = 0;
      if (!point) return;
      const boxes = lineRefs.current.map((el) => el?.getBoundingClientRect() ?? null);
      const index = nearestBox(boxes, point.x, point.y, REACH);
      if (index >= 0) setActive(index);
      setLabelled(index >= 0);
    };
    const onMove = (e: MouseEvent) => {
      point = { x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(pick);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="hero-window pointer-events-none absolute inset-x-0 top-9 hidden md:flex justify-center" aria-hidden="true">
      <div className="hero-window-frame relative h-[620px] w-[min(1240px,calc(100%-48px))] overflow-hidden rounded-t-[14px] border border-b-0">
        <div className="hero-window-bar flex h-10 items-center border-b px-5">
          <span className="flex gap-2">
            <span className="hero-window-dot h-[9px] w-[9px] rounded-full border" />
            <span className="hero-window-dot h-[9px] w-[9px] rounded-full border" />
            <span className="hero-window-dot h-[9px] w-[9px] rounded-full border" />
          </span>
          <span className="hero-window-address absolute left-1/2 flex h-[20px] w-[min(440px,42%)] -translate-x-1/2 items-center justify-center rounded-full border px-4">
            <span data-testid="hero-window-address" className="truncate font-mono text-[11px] leading-none">{shown}</span>
          </span>
        </div>

        {LINES.map((line, i) => {
          const isActive = i === active;
          return (
            <span
              key={`${line.side}-${line.top}`}
              ref={(el) => { lineRefs.current[i] = el; }}
              className={`hero-window-line absolute hidden xl:block ${isActive ? "is-active" : ""}`}
              style={{ top: line.top, width: line.width, [line.side]: 44 }}
            >
              <span
                className={`hero-window-label absolute top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.1em] ${
                  line.side === "left" ? "left-full ml-3" : "right-full mr-3"
                } ${isActive && labelled ? "opacity-100" : "opacity-0"}`}
              >
                {line.label}
              </span>
            </span>
          );
        })}

        {scans > 0 && <span key={scans} className="hero-window-scan absolute inset-x-0 top-10" />}
      </div>
    </div>
  );
}
