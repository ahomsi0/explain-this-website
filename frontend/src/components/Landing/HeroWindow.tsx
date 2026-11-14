// The landing page backdrop: a faint outline of a browser window around the
// hero, standing for the page a visitor is about to have explained.
//
// Two things about it are alive. Its address bar types example addresses by
// itself, and shows the visitor's own text as soon as they type in the URL
// field. And its three window controls work: red closes it, yellow minimizes
// it, green makes it fill the page.
//
// It is decoration. Everything here is hidden from assistive tech and out of
// the tab order, and it is absent on phones, where there is no room around
// the hero.

import { useEffect, useState } from "react";

/** Addresses the bar types while the URL field is empty: the reasons people use the site. */
const EXAMPLES = ["your-site.com", "a-competitor.com", "a-clients-site.com", "that-new-startup.io"];

const TYPE_MS = 70;
const ERASE_MS = 35;
const HOLD_MS = 1800;
const GAP_MS = 400;

// The page outline: one line per thing an analysis reads, with one picked out
// the way the logo picks out a line of text.
const LINES: { side: "left" | "right"; top: number; width: number; accent?: boolean }[] = [
  { side: "left", top: 174, width: 116 },
  { side: "left", top: 202, width: 80 },
  { side: "left", top: 230, width: 100 },
  { side: "left", top: 258, width: 56 },
  { side: "left", top: 314, width: 92, accent: true },
  { side: "right", top: 174, width: 116 },
  { side: "right", top: 202, width: 80 },
  { side: "right", top: 230, width: 100 },
  { side: "right", top: 258, width: 56 },
];

type WindowState = "open" | "minimized" | "full" | "closed";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

/**
 * The example address being typed, one character at a time: type it, hold,
 * erase it, move to the next. Stands still on the first example when the
 * visitor has asked for reduced motion, and stops while `paused`.
 */
function useTypedExample(paused: boolean): string {
  const [still] = useState(prefersReducedMotion);
  const [step, setStep] = useState({ example: 0, length: 0, erasing: false });

  useEffect(() => {
    if (paused || still) return;
    const word = EXAMPLES[step.example];
    let delay = step.erasing ? ERASE_MS : TYPE_MS;
    let next = step;
    if (!step.erasing && step.length < word.length) {
      next = { ...step, length: step.length + 1 };
    } else if (!step.erasing) {
      next = { ...step, erasing: true };
      delay = HOLD_MS;
    } else if (step.length > 0) {
      next = { ...step, length: step.length - 1 };
    } else {
      next = { example: (step.example + 1) % EXAMPLES.length, length: 0, erasing: false };
      delay = GAP_MS;
    }
    const timer = window.setTimeout(() => setStep(next), delay);
    return () => window.clearTimeout(timer);
  }, [paused, still, step]);

  return still ? EXAMPLES[0] : EXAMPLES[step.example].slice(0, step.length);
}

const frameWidth: Record<WindowState, string> = {
  open: "w-[min(1240px,calc(100%-48px))]",
  full: "w-[calc(100%-16px)]",
  minimized: "w-[min(1240px,calc(100%-48px))]",
  closed: "w-[min(1240px,calc(100%-48px))]",
};

export function HeroWindow({ address }: { address: string }) {
  const [state, setState] = useState<WindowState>("open");
  const typedByVisitor = address.trim();
  const example = useTypedExample(typedByVisitor !== "" || state === "closed");
  const shown = typedByVisitor || example;
  const closed = state === "closed";
  const minimized = state === "minimized";

  const toggle = (target: WindowState) => setState((current) => (current === target ? "open" : target));

  return (
    <>
      <div className="hero-window pointer-events-none absolute inset-x-0 top-9 hidden md:flex justify-center" aria-hidden="true" data-state={state}>
        <div
          className={`hero-window-frame relative overflow-hidden border ${frameWidth[state]} ${
            minimized ? "h-10 rounded-[14px]" : "h-[620px] rounded-t-[14px] border-b-0"
          } ${closed ? "scale-[0.985] opacity-0" : "opacity-100"}`}
        >
          <div className={`hero-window-bar flex h-10 items-center px-5 ${minimized ? "" : "border-b"}`}>
            <span className="hero-window-address absolute left-1/2 flex h-[22px] w-[min(440px,42%)] -translate-x-1/2 items-center justify-center rounded-full border px-4">
              <span data-testid="hero-window-address" className="truncate font-mono text-[11px] leading-none">{shown}</span>
              {typedByVisitor === "" && <span className="hero-window-caret ml-px" />}
            </span>
          </div>

          {!minimized &&
            LINES.map((line) => (
              <span
                key={`${line.side}-${line.top}`}
                className={`hero-window-line absolute hidden xl:block ${line.accent ? "is-accent" : ""}`}
                style={{ top: line.top, width: line.width, [line.side]: 44 }}
              />
            ))}
        </div>
      </div>

      {/* The controls sit in their own layer above the page content, which
          would otherwise swallow the clicks. Only the controls take clicks. */}
      <div className="pointer-events-none absolute inset-x-0 top-9 z-20 hidden md:flex justify-center" aria-hidden="true">
        <div className={`hero-window-controls flex h-10 items-center px-5 ${frameWidth[state]}`}>
          {closed ? (
            <button type="button" tabIndex={-1} onClick={() => setState("open")} className="hero-window-reopen pointer-events-auto font-mono text-[11px] tracking-[0.06em] transition-colors">
              Reopen window
            </button>
          ) : (
            <span className="flex gap-2">
              <button type="button" tabIndex={-1} title="Close" data-control="close" onClick={() => setState("closed")} className="hero-window-dot is-close pointer-events-auto" />
              <button type="button" tabIndex={-1} title="Minimize" data-control="minimize" onClick={() => toggle("minimized")} className="hero-window-dot is-minimize pointer-events-auto" />
              <button type="button" tabIndex={-1} title="Zoom" data-control="zoom" onClick={() => toggle("full")} className="hero-window-dot is-zoom pointer-events-auto" />
            </span>
          )}
        </div>
      </div>
    </>
  );
}
