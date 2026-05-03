import { useState } from "react";
import type { ColorPalette } from "../../types/analysis";

function contrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

export function ColorPaletteCard({ colorPalette }: { colorPalette: ColorPalette }) {
  const [copied, setCopied] = useState<string | null>(null);

  function copyHex(hex: string) {
    navigator.clipboard.writeText(hex).catch(() => {});
    setCopied(hex);
    setTimeout(() => setCopied(null), 1500);
  }

  if (colorPalette.colors.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2">Color Palette</p>
        <p className="text-xs text-zinc-500">No brand colors detected in CSS or inline styles.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Color Palette</p>
        {colorPalette.themeColor && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border border-zinc-700" style={{ background: colorPalette.themeColor }} />
            <span className="text-[10px] text-zinc-500 font-mono">{colorPalette.themeColor}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {colorPalette.colors.map((entry) => (
          <button
            key={entry.hex}
            onClick={() => copyHex(entry.hex)}
            title={`Click to copy ${entry.hex}`}
            className="flex flex-col items-center gap-1 group"
          >
            <div
              className="w-10 h-10 rounded-lg border border-white/10 shadow-sm group-hover:scale-110 transition-transform flex items-center justify-center"
              style={{ background: entry.hex }}
            >
              {copied === entry.hex && (
                <span style={{ color: contrastColor(entry.hex), fontSize: 10 }}>✓</span>
              )}
            </div>
            <span className="text-[9px] text-zinc-500 font-mono">{entry.hex}</span>
          </button>
        ))}
      </div>

      <p className="text-[10px] text-zinc-600 mt-3">Click any swatch to copy hex · {colorPalette.colors.length} colors detected</p>
    </div>
  );
}
