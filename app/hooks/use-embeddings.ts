"use client";

import { useState, useRef, useCallback } from "react";
import type { MLCEngineInterface } from "@mlc-ai/web-llm";
import type { ChatSession, Message, EmbeddingRecord, SearchResult } from "@/app/types";
import { EMBEDDING_MODEL } from "@/app/data/constants";
import {
  saveEmbeddings,
  loadAllEmbeddings,
  deleteEmbeddingsByChatId,
  getEmbeddedMessageIds,
} from "@/app/lib/db";
import { chunkText, searchEmbeddings } from "@/app/lib/embeddings";

export function useEmbeddings() {
  const [isEmbeddingReady, setIsEmbeddingReady] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const embeddingEngineRef = useRef<MLCEngineInterface | null>(null);
  const embeddingPromiseRef = useRef<Promise<MLCEngineInterface> | null>(null);
  const isInitializingRef = useRef(false);

  const getEmbeddingEngine = useCallback(async (): Promise<MLCEngineInterface> => {
    if (embeddingEngineRef.current) return embeddingEngineRef.current;
    if (embeddingPromiseRef.current) return embeddingPromiseRef.current;

    if (isInitializingRef.current) {
      // Wait for existing initialization
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          if (embeddingEngineRef.current) {
            clearInterval(interval);
            resolve(embeddingEngineRef.current);
          }
        }, 100);
      });
    }

    isInitializingRef.current = true;

    const promise = (async () => {
      const webllm = await import("@mlc-ai/web-llm");

      const worker = new Worker(
        new URL("../workers/embedding-engine.ts", import.meta.url),
        { type: "module" },
      );

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

    embeddingPromiseRef.current = promise;

    promise.catch((err) => {
      console.error("[Embedding] Failed to load embedding model:", err);
      isInitializingRef.current = false;
      embeddingPromiseRef.current = null;
    });

    return promise;
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

        // Batch embed — process in groups of 4 (model's max batch size)
        const batchSize = 4;
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
      } finally {
        setIsIndexing(false);
      }
    },
    [getEmbeddingEngine],
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
        const allEmbeddings = await loadAllEmbeddings();

        return searchEmbeddings(queryVector, allEmbeddings, history);
      } catch (err) {
        console.error("[Embedding] Search failed:", err);
        return [];
      } finally {
        setIsSearching(false);
      }
    },
    [getEmbeddingEngine],
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
    embedMessages,
    search,
    cleanupEmbeddings,
  };
}
