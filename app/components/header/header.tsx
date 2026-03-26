"use client";

import { useRef, useCallback } from "react";
import { Menu, X, Search, Palette } from "lucide-react";
import { Tooltip } from "../ui/tooltip";
import type { AccentPreset } from "@/app/types";
import { useClickOutside } from "@/app/hooks/use-click-outside";
import { ColorPicker } from "./color-picker";
import { ModelSelector } from "./model-selector";

export function Header({
  accent,
  isSidebarOpen,
  onToggleSidebar,
  onOpenSearch,
  isColorPickerOpen,
  onToggleColorPicker,
  onSelectColor,
  accentPresets,
  isModelDropdownOpen,
  onToggleModelDropdown,
  models,
  selectedModel,
  onSelectModel,
}: {
  accent: string;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  isColorPickerOpen: boolean;
  onToggleColorPicker: () => void;
  onSelectColor: (hex: string) => void;
  accentPresets: AccentPreset[];
  isModelDropdownOpen: boolean;
  onToggleModelDropdown: () => void;
  models: string[];
  selectedModel: string;
  onSelectModel: (model: string) => void;
}) {
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  const closeColorPicker = useCallback(() => {
    if (isColorPickerOpen) onToggleColorPicker();
  }, [isColorPickerOpen, onToggleColorPicker]);

  const closeModelDropdown = useCallback(() => {
    if (isModelDropdownOpen) onToggleModelDropdown();
  }, [isModelDropdownOpen, onToggleModelDropdown]);

  useClickOutside(
    [colorPickerRef, modelDropdownRef],
    [closeColorPicker, closeModelDropdown],
  );

  return (
    <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 sm:px-4 py-3 bg-[#0a0a0a]/40 backdrop-blur-md z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors cursor-pointer"
        >
          {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <h1 className="text-base font-semibold text-white tracking-tight">
          local<span style={{ color: accent }}>.ai</span>
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <Tooltip content="Search" shortcut="⌘K" position="bottom" className="inline-block">
          <button
            onClick={onOpenSearch}
            className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors cursor-pointer"
          >
            <Search size={18} />
          </button>
        </Tooltip>
        <div className="relative" ref={colorPickerRef}>
          <Tooltip content="Theme" position="bottom" className="inline-block">
            <button
              onClick={onToggleColorPicker}
              className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors cursor-pointer"
            >
              <Palette size={18} />
            </button>
          </Tooltip>
          <ColorPicker
            isOpen={isColorPickerOpen}
            accent={accent}
            presets={accentPresets}
            onSelect={onSelectColor}
          />
        </div>
        <div className="relative" ref={modelDropdownRef}>
          <ModelSelector
            isOpen={isModelDropdownOpen}
            models={models}
            selected={selectedModel}
            accent={accent}
            onToggle={onToggleModelDropdown}
            onSelect={onSelectModel}
          />
        </div>
      </div>
    </header>
  );
}
