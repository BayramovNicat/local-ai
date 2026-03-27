import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";
import { loadAllEmbeddings, loadDocEmbeddingsByChatId, loadConvEmbeddingsExcludingChat } from "../lib/db";
import { searchEmbeddings, hybridScore } from "../lib/embeddings";
import { RAG_SCORE_THRESHOLD_DOCS, MAX_CONTEXT_CHARS, RAG_SCORE_THRESHOLD_CONV } from "../data/constants";
import type { ChatSession } from "../types";

const handler = new WebWorkerMLCEngineHandler();

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  // Intercept custom vector operations
  if (type === "custom-search") {
    const { queryVector, history, query, topK } = payload;
    try {
      const allEmbeddings = await loadAllEmbeddings();
      const results = searchEmbeddings(queryVector, allEmbeddings, history, query, topK);
      self.postMessage({ type: "custom-search-results", payload: results, id: e.data.id });
    } catch (err) {
      self.postMessage({ type: "custom-search-error", payload: String(err), id: e.data.id });
    }
    return;
  }

  if (type === "custom-rag-context") {
    const { query, queryVector, chatId, history, maxContextChars } = payload;
    const limit = maxContextChars || MAX_CONTEXT_CHARS;
    try {
      const [docPool, convPool] = await Promise.all([
        loadDocEmbeddingsByChatId(chatId),
        loadConvEmbeddingsExcludingChat(chatId),
      ]);

      // Document Context
      const scoredDocs = docPool
        .map((rec) => ({
          text: rec.text,
          score: hybridScore(query, rec.text, queryVector, rec.vector),
        }))
        .sort((a, b) => b.score - a.score);

      let docContext = "";
      for (const chunk of scoredDocs) {
        if (chunk.score < RAG_SCORE_THRESHOLD_DOCS) break;
        if (docContext.length + chunk.text.length + 2 > limit) break;
        docContext += chunk.text + "\n\n";
      }

      // Conversation Context
      const chatMap = new Map(history.map((s: ChatSession) => [s.id, s.title]));
      const scoredConvs = convPool
        .map((rec) => ({
          text: rec.text,
          chatTitle: chatMap.get(rec.chatId) || "Other Chat",
          score: hybridScore(query, rec.text, queryVector, rec.vector),
        }))
        .sort((a, b) => b.score - a.score);

      let convContext = "";
      const MAX_CONV_CHARS = 1000;
      for (const chunk of scoredConvs) {
        if (chunk.score < RAG_SCORE_THRESHOLD_CONV) break;
        const entry = `[From: ${chunk.chatTitle}] ${chunk.text}\n\n`;
        if (convContext.length + entry.length > MAX_CONV_CHARS) break;
        convContext += entry;
      }

      self.postMessage({
        type: "custom-rag-context-results",
        payload: { docContext: docContext.trim(), convContext: convContext.trim() },
        id: e.data.id
      });
    } catch (err) {
      self.postMessage({ type: "custom-rag-context-error", payload: String(err), id: e.data.id });
    }
    return;
  }

  // Fallback to default WebLLM handler
  handler.onmessage(e);
};
