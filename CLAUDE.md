@AGENTS.md

# Project: local.ai

A fully client-side AI chat app — no backend, no API keys. LLMs run in-browser via WebGPU using @mlc-ai/web-llm.

## Tech Stack

- Next.js 16.2.1 (App Router), React 19, Tailwind CSS 4
- @mlc-ai/web-llm for both LLM inference and embeddings (separate Web Workers)
- IndexedDB for all persistence (chats, embeddings, documents)
- pdfjs-dist for PDF text extraction

## Architecture Overview

### Hooks (all in `app/hooks/`)

- **use-engine.ts** — Manages the main LLM engine lifecycle. Downloads and initializes the selected model in a Web Worker. Exposes `waitForEngine()` for async access.
- **use-chat.ts** — Core chat logic: message state, streaming responses, chat CRUD, auto-titling, scroll management. Uses `waitForEngine` for inference and optional `getContext` for RAG.
- **use-embeddings.ts** — Manages the embedding model (`snowflake-arctic-embed-m`) in a separate Web Worker. Three access tiers: `getEmbeddingEngine` (async, triggers download), `getEmbeddingEngineIfReady` (sync, returns null if not loaded), `initEmbeddingEngine` (fire-and-forget). Handles message embedding and semantic search.
- **use-rag.ts** — RAG pipeline: document upload (extract → chunk → embed → store), context retrieval with dual context (document chunks from current chat + conversation memories from other chats). Uses `getEmbeddingEngineIfReady` to avoid blocking on model download.
- **use-preferences.ts** — Persists model selection, accent color, sidebar state to localStorage.

### Libraries (all in `app/lib/`)

- **db.ts** — IndexedDB wrapper with 3 stores:
  - `chats`: Out-of-line keys (key passed separately from value). `saveChat(id, {title, messages})`.
  - `embeddings`: In-line keys (`keyPath: "id"`), indexed by chatId/messageId/documentId. Module-level in-memory cache (`_embeddingsCache`, `_embeddedMsgIds`) avoids repeated full-table reads. Cache is updated incrementally on writes, invalidated on deletes.
  - `documents`: In-line keys, indexed by chatId.
- **embeddings.ts** — Pure functions: `cosineSimilarity`, `searchEmbeddings` (with dedup by `documentId || messageId`), `chunkText` (512 chars, 64 overlap).
- **documents.ts** — Text extraction from .txt, .md (FileReader), .pdf (pdfjs-dist).

### Key Design Decisions

- **Non-blocking embedding**: `getContext` uses sync `getEmbeddingEngineIfReady()` — returns empty context if engine isn't loaded yet, never blocks the first message.
- **Embedding dedup**: Document chunks use `documentId` as dedup key, messages use `messageId`. Documents get `"document"` role in search results.
- **Embed skip logic**: `page.tsx` tracks `lastEmbedRef` to skip redundant `embedMessages` calls when chatId and message count haven't changed.
- **Polling safety**: `getEmbeddingEngine` has a 60s timeout on the polling branch to prevent memory leaks if init fails.
- **DB Version**: Currently at 4. Migration at v4 recreates chats store without keyPath (out-of-line keys).

### Data Flow

1. User sends message → `use-chat.handleSend`
2. `getContext` retrieves relevant doc chunks (current chat) + conversation memories (other chats) via cosine similarity
3. Context injected as system message → LLM streams response
4. After streaming ends → `embedMessages` indexes new messages (skips already-embedded ones via `getEmbeddedMessageIds` cache)
5. On first message → auto-generates chat title via separate LLM call

### Component Structure

- `page.tsx` — Orchestrator, wires all hooks together
- `components/chat/` — ChatMessage, MessageInput, EmptyState, LoadingBanner, CodeBlock, DocumentPanel
- `components/header/` — Header, ModelSelector, ColorPicker
- `components/search/` — SearchModal (semantic search with keyboard navigation)
- `components/sidebar/` — Sidebar (chat history)

## Conventions

- All hooks are in `app/hooks/`, all utility functions in `app/lib/`
- Types are centralized in `app/types/index.ts`
- Constants (models, presets, config) in `app/data/constants.ts`
- Web Workers in `app/workers/` (engine.ts for LLM, embedding-engine.ts for embeddings)
- No backend routes — everything runs client-side
