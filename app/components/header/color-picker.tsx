"use client";

import type { AccentPreset } from "@/app/types";

export function ColorPicker({
  isOpen,
  accent,
  presets,
  onSelect,
}: {
  isOpen: boolean;
  accent: string;
  presets: AccentPreset[];
  onSelect: (hex: string) => void;
}) {
  return (
    <>
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-[#0a0a0a] shadow-2xl shadow-black/50 z-40 border border-neutral-800/50 p-2 space-y-2">
          <div className="grid grid-cols-4 gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset.hex}
                onClick={() => onSelect(preset.hex)}
                className="w-8 h-8 rounded-lg cursor-pointer transition-transform hover:scale-110 border-2"
                style={{
                  backgroundColor: preset.hex,
                  borderColor: accent === preset.hex ? "#ffffff" : "transparent",
                }}
                title={preset.name}
                aria-label={`Select ${preset.name} color`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="color"
              value={accent}
              onChange={(e) => onSelect(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer bg-transparent"
              aria-label="Pick custom accent color"
            />
            <span className="text-xs text-neutral-400 font-mono">{accent}</span>
          </div>
        </div>
      )}
    </>
  );
}
