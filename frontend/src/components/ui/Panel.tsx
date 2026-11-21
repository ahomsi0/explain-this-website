// Building blocks for the "app-like panels" pages (compare, guides, status,
// history and friends). Every page uses these, so a change here restyles all
// of them at once. Colours stick to the zinc and accent classes the light
// theme remaps in index.css.

import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import { splitLead } from "./splitLead";

export type Tone = "violet" | "emerald" | "amber" | "red" | "blue" | "zinc";

const BADGE: Record<Tone, string> = {
  violet: "bg-violet-500/10 text-violet-300",
  emerald: "bg-emerald-500/10 text-emerald-300",
  amber: "bg-amber-500/10 text-amber-300",
  red: "bg-red-500/10 text-red-300",
  blue: "bg-blue-500/10 text-blue-300",
  zinc: "bg-zinc-800 text-zinc-300",
};

const CHIP: Record<Tone, string> = {
  violet: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  amber: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  red: "border-red-500/25 bg-red-500/10 text-red-300",
  blue: "border-blue-500/25 bg-blue-500/10 text-blue-300",
  zinc: "border-zinc-700 bg-zinc-900/60 text-zinc-400",
};

export const linkCls = "text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors";
export const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60";
export const secondaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-900/60";
export const inputCls =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-violet-500/60 disabled:opacity-50";

/** The page body: same width as the guides, with the site's side padding. */
export function PageMain({ children, width = "max-w-6xl" }: { children: ReactNode; width?: string }) {
  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className={`${width} mx-auto`}>{children}</div>
    </main>
  );
}

/** A bordered card. `pad` is off for panels that hold their own rows. */
export function Panel({ children, className = "", pad = true }: { children: ReactNode; className?: string; pad?: boolean }) {
  return <div className={`rounded-2xl border border-zinc-800 bg-zinc-900/40 ${pad ? "p-5 sm:p-6" : ""} ${className}`}>{children}</div>;
}

/** Panel heading. `as` keeps the page's heading levels in order. */
export function PanelTitle({ children, as: Tag = "h2", className = "" }: { children: ReactNode; as?: "h2" | "h3"; className?: string }) {
  return <Tag className={`text-[15px] font-semibold text-zinc-100 ${className}`}>{children}</Tag>;
}

export function IconBadge({ icon, tone = "violet", size = "md" }: { icon: IconName; tone?: Tone; size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "w-12 h-12 rounded-xl" : size === "sm" ? "w-7 h-7 rounded-md" : "w-9 h-9 rounded-lg";
  const glyph = size === "lg" ? "w-5 h-5" : size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${box} ${BADGE[tone]}`}>
      <Icon name={icon} className={glyph} />
    </span>
  );
}

export function Chip({ children, tone = "zinc", className = "" }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none ${CHIP[tone]} ${className}`}>
      {children}
    </span>
  );
}

/**
 * Page header. With `aside`, the title sits left and the aside (usually a
 * form or a summary panel) right, stacking on phones.
 */
export function PageHero({ eyebrow, title, intro, children, aside }: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
  aside?: ReactNode;
}) {
  const text = (
    <div className="min-w-0">
      {eyebrow && <Chip tone="violet" className="text-[12px] px-3">{eyebrow}</Chip>}
      <h1 className={`${eyebrow ? "mt-5" : ""} text-3xl sm:text-[44px] font-bold tracking-tight leading-[1.1] text-zinc-100`}>{title}</h1>
      {intro && <p className="mt-4 max-w-xl text-[15px] sm:text-base leading-relaxed text-zinc-400">{intro}</p>}
      {children}
    </div>
  );
  if (!aside) return text;
  return (
    <div className="grid gap-8 lg:gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-center">
      {text}
      <div className="min-w-0">{aside}</div>
    </div>
  );
}

/** Ticked one-liners under a hero. */
export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-zinc-400">
      {items.map((t) => (
        <li key={t} className="flex items-center gap-1.5">
          <Icon name="check" className="w-3.5 h-3.5 text-emerald-400" />
          {t}
        </li>
      ))}
    </ul>
  );
}

/** A small grey heading above a group of panels. */
export function SectionLabel({ children, id }: { children: ReactNode; id?: string }) {
  return <h2 id={id} className="mb-4 text-[13px] font-semibold text-zinc-400">{children}</h2>;
}

/** Numbered steps with round counters. */
export function StepList({ items }: { items: string[] }) {
  return (
    <ol className="mt-4 flex flex-col">
      {items.map((text, i) => {
        const { lead, rest } = splitLead(text);
        return (
          <li key={text} className="flex gap-3 py-3 border-t border-zinc-800 first:border-t-0 first:pt-0">
            <span className="flex w-6 h-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-semibold tabular-nums text-zinc-300">{i + 1}</span>
            <p className="min-w-0 text-[13.5px] leading-relaxed text-zinc-400">
              {lead ? <><span className="font-medium text-zinc-100">{lead}.</span> {rest}</> : rest}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

/** A plain list inside a panel, each item with a small icon. */
export function IconList({ items, icon = "check", tone = "emerald" }: { items: string[]; icon?: IconName; tone?: Tone }) {
  const color = { violet: "text-violet-300", emerald: "text-emerald-400", amber: "text-amber-400", red: "text-red-400", blue: "text-blue-400", zinc: "text-zinc-500" }[tone];
  return (
    <ul className="mt-4 flex flex-col gap-2.5">
      {items.map((t) => {
        const { lead, rest } = splitLead(t);
        return (
          <li key={t} className="flex gap-2.5 text-[13.5px] leading-relaxed text-zinc-400">
            <Icon name={icon} className={`mt-[3px] w-3.5 h-3.5 shrink-0 ${color}`} />
            <span>{lead ? <><span className="font-medium text-zinc-200">{lead}.</span> {rest}</> : t}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Questions and answers as a two-column grid of cards. */
export function FaqGrid({ items, headingLevel = "h3" }: { items: { q: string; a: string }[]; headingLevel?: "h3" | "h4" }) {
  const H = headingLevel;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((f) => (
        <Panel key={f.q} className="!p-5">
          <H className="text-[14px] font-medium text-zinc-100">{f.q}</H>
          <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">{f.a}</p>
        </Panel>
      ))}
    </div>
  );
}

/** A tinted call-out panel for a single important note. */
export function Callout({ tone = "amber", icon = "alert", title, children }: { tone?: Tone; icon?: IconName; title: ReactNode; children?: ReactNode }) {
  const wrap = {
    amber: "border-amber-500/20 bg-amber-500/5",
    emerald: "border-emerald-500/20 bg-emerald-500/10",
    red: "border-red-500/25 bg-red-500/10",
    violet: "border-violet-500/25 bg-violet-500/10",
    blue: "border-blue-500/25 bg-blue-500/10",
    zinc: "border-zinc-800 bg-zinc-900/40",
  }[tone];
  return (
    <div className={`rounded-2xl border p-5 sm:p-6 flex gap-4 ${wrap}`}>
      <IconBadge icon={icon} tone={tone} size="sm" />
      <div className="min-w-0">
        <div className="text-[14px] font-semibold text-zinc-100">{title}</div>
        {children && <div className="mt-1 text-[13.5px] leading-relaxed text-zinc-400">{children}</div>}
      </div>
    </div>
  );
}
