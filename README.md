# local.ai

A private AI chat assistant that runs entirely in your browser. No servers, no API keys, no data leaves your machine.

Built with Next.js 16, React 19, and [WebLLM](https://github.com/mlc-ai/web-llm) for in-browser LLM inference via WebGPU.

## Features

- **Fully local inference** — LLMs run directly in your browser via WebGPU, no backend required
- **Multiple models** — Switch between Llama 3.2 1B, Llama 3.1 8B, Phi-3.5 Mini, Qwen 2.5 1.5B/7B
- **RAG (Retrieval-Augmented Generation)** — Upload `.txt`, `.md`, `.pdf` documents for context-aware responses
- **Cross-chat memory** — Semantic search across past conversations provides long-term context
- **Semantic search** — Find messages by meaning, not just keywords (`Cmd+Shift+K`)
- **Chat management** — Create, switch, delete conversations with auto-generated titles
- **Customizable UI** — 12 accent color presets, collapsible sidebar
- **Markdown rendering** — Code blocks with syntax highlighting, GFM support
- **Image attachments** — Attach images to messages

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). A WebGPU-capable browser is required (Chrome 113+, Edge 113+).

On first use, the selected model will be downloaded and cached in the browser. Subsequent loads are instant.

## Architecture

```
app/
├── page.tsx                          # Main page, wires all hooks together
├── layout.tsx                        # Root layout (Plus Jakarta Sans + Fira Code)
├── globals.css                       # Tailwind + custom styles
├── components/
│   ├── chat/                         # Chat UI (messages, input, empty state, loading)
│   ├── header/                       # Header bar (model selector, color picker)
│   ├── search/                       # Semantic search modal
│   ├── sidebar/                      # Chat history sidebar
│   └── ui/                           # Shared UI (copy button, tooltip)
├── hooks/
│   ├── use-engine.ts                 # LLM engine lifecycle (download, init, WebWorker)
│   ├── use-chat.ts                   # Chat state, message handling, streaming
│   ├── use-embeddings.ts             # Embedding model lifecycle, message indexing, search
│   ├── use-rag.ts                    # Document upload, chunking, context retrieval
│   ├── use-preferences.ts           # Persisted user preferences (model, accent, sidebar)
│   ├── use-file-handler.ts          # Image file processing
│   └── use-click-outside.ts         # Click-outside detection
├── lib/
│   ├── db.ts                         # IndexedDB wrapper (chats, embeddings, documents)
│   ├── embeddings.ts                 # Cosine similarity, search ranking, text chunking
│   └── documents.ts                  # Text extraction (plain text, PDF)
├── data/
│   └── constants.ts                  # Models, accent presets, embedding config
├── types/
│   └── index.ts                      # TypeScript interfaces
└── workers/
    ├── engine.ts                     # LLM inference Web Worker
    └── embedding-engine.ts           # Embedding model Web Worker
```

### How RAG Works

1. **Document upload** — Files are extracted, chunked (512 chars, 64 overlap), embedded via `snowflake-arctic-embed-s`, and stored in IndexedDB
2. **Message embedding** — Chat messages are automatically embedded after each exchange
3. **Context retrieval** — On each message, relevant document chunks (current chat) and conversation memories (other chats) are retrieved via cosine similarity and injected as system context
4. **Non-blocking** — The embedding engine loads lazily; first messages are never blocked waiting for it

### Data Storage

All data lives in IndexedDB (`local-ai` database):
- **chats** — Out-of-line keys, stores `{title, messages}`
- **embeddings** — In-line keys with indexes on `chatId`, `messageId`, `documentId`. In-memory cache avoids repeated DB reads
- **documents** — Document metadata indexed by `chatId`

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd+Shift+K` | Open semantic search |
| `Cmd+Shift+O` | New chat |

## Tech Stack

- **Framework**: Next.js 16.2.1 (App Router)
- **UI**: React 19, Tailwind CSS 4, Lucide icons
- **LLM Runtime**: @mlc-ai/web-llm (WebGPU)
- **Embedding Model**: snowflake-arctic-embed-s-q0f32-MLC-b4
- **Markdown**: react-markdown + remark-gfm
- **PDF Parsing**: pdfjs-dist
- **Storage**: IndexedDB (no external database)

## License

Private project.
