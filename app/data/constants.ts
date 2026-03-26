import type { AccentPreset } from "@/app/types";

export const ACCENT_PRESETS: AccentPreset[] = [
  { name: "Neon Green", hex: "#22C55E" },
  { name: "Electric Blue", hex: "#00D4FF" },
  { name: "Purple", hex: "#A855F7" },
  { name: "Hot Pink", hex: "#FF2D78" },
  { name: "Amber", hex: "#FBBF24" },
  { name: "Coral", hex: "#FF6B6B" },
  { name: "Cyan", hex: "#22D3EE" },
  { name: "Mint", hex: "#34D399" },
  { name: "Ice Blue", hex: "#60A5FA" },
  { name: "Orange", hex: "#FB923C" },
  { name: "Rose", hex: "#F43F5E" },
  { name: "Lime", hex: "#84CC16" },
];

export const AVAILABLE_MODELS = [
  "Llama-3.2-1B-Instruct-q4f16_1-MLC",
  "Llama-3.1-8B-Instruct-q4f32_1-MLC",
  "Phi-3.5-mini-instruct-q4f16_1-MLC",
  "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
  "Qwen2.5-7B-Instruct-q4f16_1-MLC",
];
