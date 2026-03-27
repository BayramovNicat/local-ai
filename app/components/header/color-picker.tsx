'use client';

import type { AccentPreset } from '@/app/types';

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
        <div className="absolute top-full right-0 z-40 mt-2 w-48 space-y-2 rounded-xl border border-neutral-800/50 bg-[#0a0a0a] p-2 shadow-2xl shadow-black/50">
          <div className="grid grid-cols-4 gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset.hex}
                onClick={() => onSelect(preset.hex)}
                className="h-8 w-8 cursor-pointer rounded-lg border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: preset.hex,
                  borderColor: accent === preset.hex ? '#ffffff' : 'transparent',
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
              className="h-8 w-8 cursor-pointer rounded bg-transparent"
              aria-label="Pick custom accent color"
            />
            <span className="font-mono text-xs text-neutral-400">{accent}</span>
          </div>
        </div>
      )}
    </>
  );
}
