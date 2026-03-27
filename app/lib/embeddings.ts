import type { EmbeddingRecord, SearchResult, ChatSession } from "@/app/types";

/**
 * Normalize a vector to unit length (L2 norm).
 */
export function normalizeVector(v: number[]): number[] {
  let mag = 0;
  for (let i = 0; i < v.length; i++) mag += v[i] * v[i];
  mag = Math.sqrt(mag);
  if (mag === 0) return v;
  return v.map((x) => x / mag);
}

/**
 * Cosine similarity between two vectors.
 * Assuming vectors are already normalized, this is just a dot product.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

/**
 * Keyword match score — fraction of query terms found in text.
 * Optimized to accept pre-lowercased query terms and pre-lowercased text.
 */
export function keywordScore(queryTerms: string[], lowerText: string): number {
  if (queryTerms.length === 0) return 0;

  let matched = 0;
  for (const term of queryTerms) {
    if (lowerText.includes(term)) matched++;
  }
  return matched / queryTerms.length;
}

/**
 * Combine semantic + keyword scores.
 */
export function hybridScore(
  queryTerms: string[],
  lowerText: string,
  queryVector: number[],
  docVector: number[],
): number {
  return cosineSimilarity(queryVector, docVector) * 0.5 + keywordScore(queryTerms, lowerText) * 0.5;
}

/**
 * Hybrid search: combines semantic similarity with keyword matching.
 * Returns top-K results enriched with chat metadata.
 * historyMetadata is a map of chatId -> title.
 */
export function searchEmbeddings(
  queryVector: number[],
  records: EmbeddingRecord[],
  historyMetadata: Map<string, string> | Record<string, string>,
  query: string,
  topK = 10,
): SearchResult[] {
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);

  const isMap = historyMetadata instanceof Map;
  const getTitle = (id: string) => (isMap ? historyMetadata.get(id) : historyMetadata[id]);

  const scored = records
    .map((rec) => {
      const chatTitle = getTitle(rec.chatId);
      if (!chatTitle) return null;

      const lowerText = rec.text.toLowerCase();
      const semantic = cosineSimilarity(queryVector, rec.vector);
      const keyword = keywordScore(queryTerms, lowerText);

      // Hybrid: semantic provides base relevance, keyword boosts exact matches
      const score = semantic * 0.5 + keyword * 0.5;
      if (score < 0.1) return null;

      return {
        chatId: rec.chatId,
        chatTitle,
        messageId: rec.messageId,
        ...(rec.documentId && { documentId: rec.documentId }),
        text: rec.text,
        score,
        // We now expect the role to be in the record or default to user
        role: (rec.documentId ? "document" : (rec.role ?? "user")) as
          | "user"
          | "assistant"
          | "document",
      };
    })
    .filter((r): r is SearchResult => r !== null);

  scored.sort((a, b) => b.score - a.score);

  // De-duplicate: best result per message, or per document chunk id
  const seen = new Set<string>();
  const deduped: SearchResult[] = [];
  for (const r of scored) {
    const dedupKey = r.documentId || r.messageId;
    if (!seen.has(dedupKey)) {
      seen.add(dedupKey);
      deduped.push(r);
    }
    if (deduped.length >= topK) break;
  }

  return deduped;
}

/**
 * Simple sliding window splitter: ensure chunks are at most maxLength
 * and have a consistent overlap.
 */
export function chunkText(text: string, maxLength = 512, overlap = 64): string[] {
  if (!text.trim()) return [];
  if (text.length <= maxLength) return [text.trim()];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxLength;

    // If we're not at the very end, try to find a natural break point (space or newline)
    if (end < text.length) {
      const lastSpace = text.lastIndexOf(" ", end);
      const lastNewline = text.lastIndexOf("\n", end);
      const breakPoint = Math.max(lastSpace, lastNewline);

      // Only break if it's not too far back (don't lose more than 20% of the chunk)
      if (breakPoint > start + maxLength * 0.8) {
        end = breakPoint;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);

    // Slide the window: move by (chunk size - overlap)
    // Ensure we always make progress even if overlap is large
    const nextStart = end - overlap;
    start = nextStart <= start ? end : nextStart;
  }

  return chunks;
}
