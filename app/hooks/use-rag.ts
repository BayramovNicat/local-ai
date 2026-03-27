"use client";

import {
  EMBEDDING_MODEL,
  MAX_CONTEXT_CHARS,
  EMBEDDING_BATCH_SIZE,
  RAG_SCORE_THRESHOLD_DOCS,
  RAG_SCORE_THRESHOLD_CONV,
  MODEL_CONFIGS,
} from "@/app/data/constants";
import {
  deleteDocument as deleteDocFromDB,
  deleteDocumentsByChatId,
  deleteEmbeddingsByDocumentId,
  getDocumentsByChatId,
  loadConvEmbeddingsExcludingChat,
  loadDocEmbeddingsByChatId,
  saveDocument,
  saveEmbeddings,
  isQuotaExceededError,
} from "@/app/lib/db";
import { extractText } from "@/app/lib/documents";
import { chunkText, hybridScore } from "@/app/lib/embeddings";
import type {
  ChatSession,
  Document as DocType,
  EmbeddingRecord,
} from "@/app/types";
import type { MLCEngineInterface } from "@mlc-ai/web-llm";
import { useCallback, useState } from "react";
import { useToast } from "@/app/components/ui/toast";

export function useRag(
  getEmbeddingEngine: () => Promise<MLCEngineInterface>,
  getEmbeddingEngineIfReady: () => MLCEngineInterface | null,
  initEmbeddingEngine: () => void,
  callWorker: (type: string, payload: any) => Promise<any>,
  selectedModel: string,
) {
  const { error: errorToast } = useToast();
  const [documents, setDocuments] = useState<DocType[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  /**
   * Load documents for a chat from IndexedDB.
   */
  const loadDocuments = useCallback(async (chatId: string) => {
    if (!chatId) {
      setDocuments([]);
      return;
    }

    try {
      const docs = await getDocumentsByChatId(chatId);
      setDocuments(docs);
    } catch (err) {
      console.error("[RAG] Failed to load documents:", err);
      setDocuments([]);
    }
  }, []);

  /**
   * Upload a file: extract text → chunk → embed → save to IndexedDB.
   */
  const uploadDocument = useCallback(
    async (file: File, chatId: string) => {
      try {
        setIsUploading(true);
        initEmbeddingEngine();

        // Extract text
        const text = await extractText(file);
        if (!text.trim()) {
          console.warn("[RAG] No text extracted from file:", file.name);
          return;
        }

        // Save document record
        const docId = `doc_${Date.now()}`;
        const doc: DocType = {
          id: docId,
          name: file.name,
          type: file.name.split(".").pop()?.toLowerCase() || "txt",
          size: file.size,
          chatId,
          createdAt: Date.now(),
        };
        await saveDocument(doc);

        // Chunk text
        const chunks = chunkText(text, 512, 64);

        // Embed chunks
        const engine = await getEmbeddingEngine();
        const batchSize = EMBEDDING_BATCH_SIZE;
        const records: EmbeddingRecord[] = [];

        for (let i = 0; i < chunks.length; i += batchSize) {
          const batch = chunks.slice(i, i + batchSize);

          const response = await engine.embeddings.create({
            input: batch,
            model: EMBEDDING_MODEL,
          });

          for (let j = 0; j < batch.length; j++) {
            records.push({
              id: `${docId}_chunk${i + j}`,
              chatId,
              messageId: "",
              documentId: docId,
              text: batch[j],
              vector: response.data[j].embedding,
              timestamp: Date.now(),
            });
          }
        }

        await saveEmbeddings(records);

        // Update local state
        setDocuments((prev) => [...prev, doc]);
        console.log(
          `[RAG] Indexed "${file.name}": ${chunks.length} chunks, ${records.length} embeddings`,
        );
      } catch (err) {
        console.error("[RAG] Failed to upload document:", err);
        if (isQuotaExceededError(err)) {
          errorToast("Storage quota exceeded. Please delete some chats.");
        } else {
          errorToast(`Failed to process document: ${file.name}`);
        }
      } finally {
        setIsUploading(false);
      }
    },
    [getEmbeddingEngine, initEmbeddingEngine, errorToast],
  );

  /**
   * Retrieve relevant context for a query from document and conversation embeddings.
   */
  const getContext = useCallback(
    async (
      query: string,
      chatId: string,
      history: ChatSession[],
    ): Promise<{ docContext: string; convContext: string }> => {
      const empty = { docContext: "", convContext: "" };
      try {
        // Skip if embedding engine isn't loaded yet — don't block the first message
        const engine = getEmbeddingEngineIfReady();
        if (!engine) return empty;
        const response = await engine.embeddings.create({
          input: [query],
          model: EMBEDDING_MODEL,
        });
        const queryVector = response.data[0].embedding;

        // Get model-specific context limits
        const config = MODEL_CONFIGS[selectedModel] || MODEL_CONFIGS.default;

        // Delegate context retrieval and scoring to worker
        return await callWorker("custom-rag-context", {
          query,
          queryVector,
          chatId,
          history,
          maxContextChars: config.maxContextChars,
        });
      } catch (err) {
        console.error("[RAG] Failed to get context:", err);
        errorToast("Failed to retrieve context from documents.");
        return { docContext: "", convContext: "" };
      }
    },
    [getEmbeddingEngineIfReady, callWorker, errorToast, selectedModel],
  );

  /**
   * Delete a document and its embeddings.
   */
  const removeDocument = useCallback(async (docId: string) => {
    try {
      await deleteEmbeddingsByDocumentId(docId);
      await deleteDocFromDB(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      console.error("[RAG] Failed to remove document:", err);
      errorToast("Failed to remove document.");
    }
  }, [errorToast]);

  /**
   * Cleanup all documents for a chat.
   */
  const cleanupDocuments = useCallback(async (chatId: string) => {
    try {
      await deleteDocumentsByChatId(chatId);
      setDocuments([]);
    } catch (err) {
      console.error("[RAG] Failed to cleanup documents:", err);
      errorToast("Failed to cleanup documents.");
    }
  }, [errorToast]);

  return {
    documents,
    isUploading,
    loadDocuments,
    uploadDocument,
    getContext,
    removeDocument,
    cleanupDocuments,
  };
}
