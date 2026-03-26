"use client";

import { useState, useCallback } from "react";
import type { Document as DocType, EmbeddingRecord } from "@/app/types";
import { EMBEDDING_MODEL, MAX_CONTEXT_CHARS } from "@/app/data/constants";
import {
  saveDocument,
  getDocumentsByChatId,
  deleteDocument as deleteDocFromDB,
  deleteDocumentsByChatId,
  saveEmbeddings,
  loadEmbeddingsByChatId,
  deleteEmbeddingsByDocumentId,
} from "@/app/lib/db";
import { extractText } from "@/app/lib/documents";
import { chunkText, cosineSimilarity } from "@/app/lib/embeddings";
import type { MLCEngineInterface } from "@mlc-ai/web-llm";

export function useRag(
  getEmbeddingEngine: () => Promise<MLCEngineInterface>,
  initEmbeddingEngine: () => void,
) {
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
        const batchSize = 4;
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
      } finally {
        setIsUploading(false);
      }
    },
    [getEmbeddingEngine, initEmbeddingEngine],
  );

  /**
   * Retrieve relevant context for a query from document embeddings.
   */
  const getContext = useCallback(
    async (query: string, chatId: string): Promise<string> => {
      try {
        // Load all embeddings for this chat that belong to documents
        const allEmbeddings = await loadEmbeddingsByChatId(chatId);
        const docEmbeddings = allEmbeddings.filter((e) => e.documentId);

        if (docEmbeddings.length === 0) return "";

        // Embed the query
        const engine = await getEmbeddingEngine();
        const response = await engine.embeddings.create({
          input: [query],
          model: EMBEDDING_MODEL,
        });
        const queryVector = response.data[0].embedding;

        // Score and rank
        const scored = docEmbeddings
          .map((rec) => ({
            text: rec.text,
            score: cosineSimilarity(queryVector, rec.vector),
          }))
          .sort((a, b) => b.score - a.score);

        // Take top chunks until we hit MAX_CONTEXT_CHARS
        let context = "";
        for (const chunk of scored) {
          if (chunk.score < 0.3) break; // minimum relevance threshold
          if (context.length + chunk.text.length > MAX_CONTEXT_CHARS) break;
          context += chunk.text + "\n\n";
        }

        return context.trim();
      } catch (err) {
        console.error("[RAG] Failed to get context:", err);
        return "";
      }
    },
    [getEmbeddingEngine],
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
    }
  }, []);

  /**
   * Cleanup all documents for a chat.
   */
  const cleanupDocuments = useCallback(async (chatId: string) => {
    try {
      await deleteDocumentsByChatId(chatId);
      setDocuments([]);
    } catch (err) {
      console.error("[RAG] Failed to cleanup documents:", err);
    }
  }, []);

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
