"use client";

import { useState, useRef, useCallback } from "react";
import { useToast } from "@/app/components/ui/toast";
import type { MLCEngineInterface } from "@mlc-ai/web-llm";
import type { ChatSession, Message, EmbeddingRecord, SearchResult } from "@/app/types";
import { EMBEDDING_MODEL, EMBEDDING_BATCH_SIZE } from "@/app/data/constants";
import {
  saveEmbeddings,
  deleteEmbeddingsByChatId,
  getEmbeddedMessageIds,
  isQuotaExceededError,
} from "@/app/lib/db";
import { chunkText } from "@/app/lib/embeddings";

export function useEmbeddings() {
  const { error: errorToast } = useToast();
  const [isEmbeddingReady, setIsEmbeddingReady] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const embeddingEngineRef = useRef<MLCEngineInterface | null>(null);
  const embeddingPromiseRef = useRef<Promise<MLCEngineInterface> | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const getEmbeddingEngine = useCallback(async (): Promise<MLCEngineInterface> => {
    if (embeddingEngineRef.current) return embeddingEngineRef.current;
    if (embeddingPromiseRef.current) return embeddingPromiseRef.current;

    const promise = (async () => {
      const webllm = await import("@mlc-ai/web-llm");

      const worker = new Worker(
        new URL("../workers/embedding-engine.ts", import.meta.url),
        { type: "module" },
      );
      workerRef.current = worker;

      const engine = await webllm.CreateWebWorkerMLCEngine(
        worker,
        EMBEDDING_MODEL,
        {
          initProgressCallback: (report) => {
            console.log(`[Embedding] ${report.text}`);
          },
        },
      );

      embeddingEngineRef.current = engine;
      setIsEmbeddingReady(true);
      return engine;
    })();

    // Set promise ref immediately so concurrent callers share the same promise
    embeddingPromiseRef.current = promise;

    promise.catch((err) => {
      console.error("[Embedding] Failed to load embedding model:", err);
      errorToast("Failed to load embedding model.");
      embeddingPromiseRef.current = null;
    });

    return promise;
  }, [errorToast]);

  const callWorker = useCallback(async (type: string, payload: unknown): Promise<unknown> => {
    if (!workerRef.current) throw new Error("Worker not initialized");
    const id = Math.random().toString(36).substring(7);
    return new Promise((resolve, reject) => {
      const handler = (e: MessageEvent) => {
        if (e.data.id === id) {
          workerRef.current?.removeEventListener("message", handler);
          if (e.data.type.endsWith("-error")) {
            reject(new Error(e.data.payload));
          } else {
            resolve(e.data.payload);
          }
        }
      };
      workerRef.current?.addEventListener("message", handler);
      workerRef.current?.postMessage({ type, payload, id });
    });
  }, []);

  /**
   * Returns the engine if already loaded, or null. Never triggers download.
   */
  const getEmbeddingEngineIfReady = useCallback((): MLCEngineInterface | null => {
    return embeddingEngineRef.current;
  }, []);

  /**
   * Trigger engine loading — call when search modal opens.
   */
  const initEmbeddingEngine = useCallback(() => {
    getEmbeddingEngine();
  }, [getEmbeddingEngine]);

  /**
   * Embed un-indexed messages from a chat and save vectors to IndexedDB.
   */
  const embedMessages = useCallback(
    async (messages: Message[], chatId: string) => {
      if (messages.length === 0) return;

      try {
        setIsIndexing(true);
        const engine = await getEmbeddingEngine();
        const alreadyEmbedded = await getEmbeddedMessageIds();

        const toEmbed: { message: Message; chunk: string; chunkIdx: number }[] = [];
        for (const msg of messages) {
          if (alreadyEmbedded.has(msg.id)) continue;
          if (!msg.content.trim()) continue;

          const chunks = chunkText(msg.content);
          chunks.forEach((chunk, idx) => {
            toEmbed.push({ message: msg, chunk, chunkIdx: idx });
          });
        }

        if (toEmbed.length === 0) return;

        // Batch embed — process in groups of EMBEDDING_BATCH_SIZE (model's max batch size)
        const batchSize = EMBEDDING_BATCH_SIZE;
        const records: EmbeddingRecord[] = [];

        for (let i = 0; i < toEmbed.length; i += batchSize) {
          const batch = toEmbed.slice(i, i + batchSize);
          const texts = batch.map((b) => b.chunk);

          const response = await engine.embeddings.create({
            input: texts,
            model: EMBEDDING_MODEL,
          });

          for (let j = 0; j < batch.length; j++) {
            const { message, chunk, chunkIdx } = batch[j];
            records.push({
              id: `${message.id}_chunk${chunkIdx}`,
              chatId,
              messageId: message.id,
              text: chunk,
              vector: response.data[j].embedding,
              timestamp: Date.now(),
            });
          }
        }

        await saveEmbeddings(records);
      } catch (err) {
        console.error("[Embedding] Failed to embed messages:", err);
        if (isQuotaExceededError(err)) {
          errorToast("Storage quota exceeded. Please delete some chats.");
        } else {
          errorToast("Failed to index messages for search.");
        }
      } finally {
        setIsIndexing(false);
      }
    },
    [getEmbeddingEngine, errorToast],
  );

  /**
   * Semantic search over all embedded messages.
   */
  const search = useCallback(
    async (query: string, history: ChatSession[]): Promise<SearchResult[]> => {
      if (!query.trim()) return [];

      try {
        setIsSearching(true);
        const engine = await getEmbeddingEngine();

        const response = await engine.embeddings.create({
          input: [query],
          model: EMBEDDING_MODEL,
        });

        const queryVector = response.data[0].embedding;

        // Perform search in worker
        return (await callWorker("custom-search", {
          queryVector,
          history,
          query,
          topK: 10
        })) as SearchResult[];
      } catch (err) {
        console.error("[Embedding] Search failed:", err);
        errorToast("Search failed. Please try again.");
        return [];
      } finally {
        setIsSearching(false);
      }
    },
    [getEmbeddingEngine, callWorker, errorToast],
  );

  /**
   * Delete embeddings when a chat is deleted.
   */
  const cleanupEmbeddings = useCallback(async (chatId: string) => {
    try {
      await deleteEmbeddingsByChatId(chatId);
    } catch (err) {
      console.error("[Embedding] Failed to cleanup embeddings:", err);
    }
  }, []);

  return {
    isEmbeddingReady,
    isIndexing,
    isSearching,
    initEmbeddingEngine,
    getEmbeddingEngine,
    getEmbeddingEngineIfReady,
    embedMessages,
    search,
    cleanupEmbeddings,
    callWorker,
  };
}
