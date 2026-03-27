import type { AccentPreset } from '@/app/types';

/**
 * Predefined accent colors for the UI theme.
 */
export const ACCENT_PRESETS: AccentPreset[] = [
  { name: 'Neon Green', hex: '#22C55E' },
  { name: 'Electric Blue', hex: '#00D4FF' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Hot Pink', hex: '#FF2D78' },
  { name: 'Amber', hex: '#FBBF24' },
  { name: 'Coral', hex: '#FF6B6B' },
  { name: 'Cyan', hex: '#22D3EE' },
  { name: 'Mint', hex: '#34D399' },
  { name: 'Ice Blue', hex: '#60A5FA' },
  { name: 'Orange', hex: '#FB923C' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Lime', hex: '#84CC16' },
];

/**
 * List of available WebLLM models supported by the application.
 */
export const AVAILABLE_MODELS = [
  'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
  'Qwen2.5-7B-Instruct-q4f16_1-MLC',
  'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  'Llama-3.1-8B-Instruct-q4f32_1-MLC',
  'Phi-3.5-mini-instruct-q4f16_1-MLC',
];

/**
 * The default model used for generating text embeddings.
 */
export const EMBEDDING_MODEL = 'snowflake-arctic-embed-m-q0f32-MLC-b4';

/**
 * Model-specific configurations including context limits.
 */
export const MODEL_CONFIGS: Record<string, { maxContextChars: number }> = {
  'Qwen2.5-1.5B-Instruct-q4f16_1-MLC': { maxContextChars: 2000 },
  'Qwen2.5-7B-Instruct-q4f16_1-MLC': { maxContextChars: 8000 },
  'Llama-3.2-1B-Instruct-q4f16_1-MLC': { maxContextChars: 2000 },
  'Llama-3.1-8B-Instruct-q4f32_1-MLC': { maxContextChars: 12000 },
  'Phi-3.5-mini-instruct-q4f16_1-MLC': { maxContextChars: 8000 },
  default: { maxContextChars: 1500 },
};

/**
 * Maximum number of characters allowed in the RAG context sent to the LLM.
 * @deprecated Use MODEL_CONFIGS for dynamic context limits.
 */
export const MAX_CONTEXT_CHARS = 1500;

/**
 * Comma-separated list of file extensions supported for document processing.
 */
export const SUPPORTED_DOC_TYPES = '.txt,.md,.pdf';

/**
 * Threshold for document retrieval. Lower (0.2) because document chunks
 * are usually more structured and relevant to the user's specific upload intent.
 */
export const RAG_SCORE_THRESHOLD_DOCS = 0.2;

/**
 * Threshold for conversation memory retrieval. Higher (0.3) to prevent
 * "chatty" or loosely related past messages from distracting the model.
 */
export const RAG_SCORE_THRESHOLD_CONV = 0.3;

/**
 * Time in milliseconds to wait before triggering a search after input changes.
 */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Number of chunks to embed in a single batch.
 * Aligned with the embedding model's optimal processing size.
 */
export const EMBEDDING_BATCH_SIZE = 4;

/**
 * Scroll distance from top (in pixels) that triggers loading more messages.
 */
export const SCROLL_THRESHOLD_TOP = 200;

/**
 * Scroll distance from bottom (in pixels) that triggers loading more chat history.
 */
export const SCROLL_THRESHOLD_BOTTOM = 200;

/**
 * Number of messages to render initially in the chat window.
 */
export const INITIAL_VISIBLE_MESSAGES = 30;

/**
 * Number of additional messages to load when scrolling to the top.
 */
export const LOAD_MORE_MESSAGES_INCREMENT = 30;

/**
 * Number of chat sessions to render initially in the sidebar.
 */
export const INITIAL_VISIBLE_CHATS = 40;

/**
 * Number of additional chat sessions to load when scrolling the sidebar.
 */
export const LOAD_MORE_CHATS_INCREMENT = 40;
