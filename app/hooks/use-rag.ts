"use client";

import { useState, useCallback } from "react";
import type { Document as DocType, EmbeddingRecord, ChatSession } from "@/app/types";
import { EMBEDDING_MODEL, MAX_CONTEXT_CHARS } from "@/app/data/constants";
import {
  saveDocument,
  getDocumentsByChatId,
  deleteDocument as deleteDocFromDB,
  deleteDocumentsByChatId,
  saveEmbeddings,
  loadAllEmbeddings,
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
   * Retrieve relevant context for a query from document and conversation embeddings.
   */
  const getContext = useCallback(
    async (
      query: string,
      chatId: string,
      history: ChatSession[],
    ): Promise<{ docContext: string; convContext: string }> => {
      try {
        const engine = await getEmbeddingEngine();
        const response = await engine.embeddings.create({
          input: [query],
          model: EMBEDDING_MODEL,
        });
        const queryVector = response.data[0].embedding;

        // Load all embeddings
        const allEmbeddings = await loadAllEmbeddings();
        
        // 1. Document Context (current chat only)
        const docPool = allEmbeddings.filter(
          (e) => e.chatId === chatId && e.documentId
        );
        const scoredDocs = docPool
          .map((rec) => ({
            text: rec.text,
            score: cosineSimilarity(queryVector, rec.vector),
          }))
          .sort((a, b) => b.score - a.score);

        let docContext = "";
        for (const chunk of scoredDocs) {
          if (chunk.score < 0.3) break;
          if (docContext.length + chunk.text.length > MAX_CONTEXT_CHARS) break;
          docContext += chunk.text + "\n\n";
        }

        // 2. Conversation Context (other chats)
        const chatMap = new Map(history.map(s => [s.id, s.title]));
        const convPool = allEmbeddings.filter(
          (e) => e.chatId !== chatId && !e.documentId
        );
        const scoredConvs = convPool
          .map((rec) => ({
            text: rec.text,
            chatTitle: chatMap.get(rec.chatId) || "Other Chat",
            score: cosineSimilarity(queryVector, rec.vector),
          }))
          .sort((a, b) => b.score - a.score);

        let convContext = "";
        const MAX_CONV_CHARS = 1000; // slightly smaller limit for conversations
        for (const chunk of scoredConvs) {
          if (chunk.score < 0.4) break; // stricter threshold for cross-chat context
          if (convContext.length + chunk.text.length > MAX_CONV_CHARS) break;
          convContext += `[From: ${chunk.chatTitle}] ${chunk.text}\n\n`;
        }

        return {
          docContext: docContext.trim(),
          convContext: convContext.trim(),
        };
      } catch (err) {
        console.error("[RAG] Failed to get context:", err);
        return { docContext: "", convContext: "" };
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
