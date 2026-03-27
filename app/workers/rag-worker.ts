import { RAG_SCORE_THRESHOLD_CONV, RAG_SCORE_THRESHOLD_DOCS } from '../data/constants';
import {
  invalidateEmbeddingsCache,
  loadAllEmbeddings,
  loadConvEmbeddingsExcludingChat,
  loadDocEmbeddingsByChatId,
} from '../lib/db';
import { hybridScore, searchEmbeddings } from '../lib/embeddings';

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  // Intercept custom vector operations
  if (type === 'invalidate-cache') {
    invalidateEmbeddingsCache();
    self.postMessage({ type: 'invalidate-cache-results', id: e.data.id });
    return;
  }

  if (type === 'custom-search') {
    const { queryVector, historyMetadata, query, topK } = payload;
    try {
      const allEmbeddings = await loadAllEmbeddings();
      const results = searchEmbeddings(queryVector, allEmbeddings, historyMetadata, query, topK);
      self.postMessage({ type: 'custom-search-results', payload: results, id: e.data.id });
    } catch (err) {
      self.postMessage({ type: 'custom-search-error', payload: String(err), id: e.data.id });
    }
    return;
  }
  if (type === 'custom-rag-context') {
    const { query, queryVector, chatId, historyMetadata, maxContextChars } = payload;
    const limit = maxContextChars;

    // Pre-calculate query terms for hybrid scoring
    const queryTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t: string) => t.length > 1);

    try {
      const [docPool, convPool] = await Promise.all([
        loadDocEmbeddingsByChatId(chatId),
        loadConvEmbeddingsExcludingChat(chatId),
      ]);

      // Document Context
      const scoredDocs = docPool
        .map((rec) => {
          const lowerText = rec.text.toLowerCase();
          return {
            text: rec.text,
            score: hybridScore(queryTerms, lowerText, queryVector, rec.vector),
          };
        })
        .sort((a, b) => b.score - a.score);

      let docContext = '';
      for (const chunk of scoredDocs) {
        if (chunk.score < RAG_SCORE_THRESHOLD_DOCS) break;
        if (docContext.length + chunk.text.length + 2 > limit) break;
        docContext += chunk.text + '\n\n';
      }

      // Conversation Context
      const scoredConvs = convPool
        .map((rec) => {
          const lowerText = rec.text.toLowerCase();
          return {
            text: rec.text,
            chatTitle: historyMetadata[rec.chatId] || 'Other Chat',
            score: hybridScore(queryTerms, lowerText, queryVector, rec.vector),
          };
        })
        .sort((a, b) => b.score - a.score);

      let convContext = '';
      const MAX_CONV_CHARS = 1000;
      for (const chunk of scoredConvs) {
        if (chunk.score < RAG_SCORE_THRESHOLD_CONV) break;
        const entry = `[From: ${chunk.chatTitle}] ${chunk.text}\n\n`;
        if (convContext.length + entry.length > MAX_CONV_CHARS) break;
        convContext += entry;
      }

      self.postMessage({
        type: 'custom-rag-context-results',
        payload: { docContext: docContext.trim(), convContext: convContext.trim() },
        id: e.data.id,
      });
    } catch (err) {
      self.postMessage({ type: 'custom-rag-context-error', payload: String(err), id: e.data.id });
    }
    return;
  }
};
