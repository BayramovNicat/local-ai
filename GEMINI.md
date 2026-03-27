# local.ai

A private, browser-based AI assistant that leverages WebGPU and WebLLM for fully local inference. No data leaves the machine, and no API keys are required.

## Project Overview

- **Core Technology:** Built with **Next.js 16 (App Router)** and **React 19**.
- **LLM Runtime:** Uses `@mlc-ai/web-llm` to run models directly in the browser via WebGPU.
- **Embeddings & RAG:** Implements Retrieval-Augmented Generation using `snowflake-arctic-embed-m` for semantic search across documents (`.txt`, `.md`, `.pdf`) and past conversation history.
- **Storage:** All data (chats, message embeddings, and document metadata) is persisted locally in the browser using **IndexedDB**.
- **Styling:** Modern UI built with **Tailwind CSS 4** and **Lucide React** icons.

## Architecture

The application is structured into modular hooks and workers to ensure the main thread remains responsive during heavy AI workloads.

- `app/workers/`: Contains Web Workers for LLM inference and embedding generation.
- `app/hooks/`: Core logic encapsulation:
  - `use-engine.ts`: Manages the lifecycle of the WebLLM engine (loading, caching, progress).
  - `use-chat.ts`: Handles chat state, message streaming, and history management.
  - `use-embeddings.ts`: Manages semantic indexing and retrieval.
  - `use-rag.ts`: Handles document processing, chunking, and context injection.
- `app/lib/`: Low-level utilities for IndexedDB (`db.ts`), semantic search (`embeddings.ts`), and file parsing (`documents.ts`).
- `app/data/`: Centralized constants for available models and UI presets.

## Building and Running

### Commands

- `npm install`: Install project dependencies.
- `npm run dev`: Start the development server at `http://localhost:3000`.
- `npm run build`: Create an optimized production build.
- `npm run lint`: Run ESLint for code quality checks.

### Requirements

- **Browser:** A WebGPU-capable browser (Chrome 113+, Edge 113+).
- **Hardware:** Sufficient VRAM for the selected model (e.g., Llama 3.1 8B requires ~6GB+).

## Development Conventions

- **State Management:** Logic is strictly separated into custom React hooks. Avoid putting heavy business logic directly in components.
- **Performance:** Heavy computations (LLM inference, embedding generation) must run in Web Workers.
- **Type Safety:** Ensure all data structures (Messages, Attachments, Embeddings) adhere to interfaces defined in `app/types/index.ts`.
- **Persistence:** All user data should be saved to IndexedDB via `app/lib/db.ts`. Do not use `localStorage` for large datasets like embeddings.
- **Styling:** Adhere to the established Tailwind 4 patterns. Use the `ACCENT_PRESETS` in `app/data/constants.ts` for theme-related colors.

## Key Files

- `app/page.tsx`: The main entry point that orchestrates hooks.
- `app/workers/engine.ts`: The Web Worker for LLM inference.
- `app/lib/db.ts`: The IndexedDB abstraction layer.
- `app/data/constants.ts`: Configuration for models and UI presets.
