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
  "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
  "Qwen2.5-7B-Instruct-q4f16_1-MLC",
  "Llama-3.2-1B-Instruct-q4f16_1-MLC",
  "Llama-3.1-8B-Instruct-q4f32_1-MLC",
  "Phi-3.5-mini-instruct-q4f16_1-MLC",
];

export const EMBEDDING_MODEL = "snowflake-arctic-embed-m-q0f32-MLC-b4";

// RAG & Search
export const MAX_CONTEXT_CHARS = 1500;
export const SUPPORTED_DOC_TYPES = ".txt,.md,.pdf";
export const RAG_SCORE_THRESHOLD_DOCS = 0.2;
export const RAG_SCORE_THRESHOLD_CONV = 0.3;
export const SEARCH_DEBOUNCE_MS = 300;
export const EMBEDDING_BATCH_SIZE = 4;

// UI & Performance
export const SCROLL_THRESHOLD_TOP = 200;
export const SCROLL_THRESHOLD_BOTTOM = 200;
export const INITIAL_VISIBLE_MESSAGES = 30;
export const LOAD_MORE_MESSAGES_INCREMENT = 30;
export const INITIAL_VISIBLE_CHATS = 40;
export const LOAD_MORE_CHATS_INCREMENT = 40;
