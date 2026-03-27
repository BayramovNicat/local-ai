import type { EmbeddingRecord, SearchResult, ChatSession } from "@/app/types";

/**
 * Cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Keyword match score — fraction of query terms found in text.
 */
export function keywordScore(query: string, text: string): number {
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);
  if (queryTerms.length === 0) return 0;

  const lowerText = text.toLowerCase();
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
  query: string,
  text: string,
  queryVector: number[],
  docVector: number[],
): number {
  return (
    cosineSimilarity(queryVector, docVector) * 0.5 +
    keywordScore(query, text) * 0.5
  );
}

/**
 * Hybrid search: combines semantic similarity with keyword matching.
 * Returns top-K results enriched with chat metadata.
 */
export function searchEmbeddings(
  queryVector: number[],
  records: EmbeddingRecord[],
  history: ChatSession[],
  query: string,
  topK = 10,
): SearchResult[] {
  const chatMap = new Map(history.map((s) => [s.id, s]));

  const scored = records
    .map((rec) => {
      const session = chatMap.get(rec.chatId);
      if (!session) return null;

      const semantic = cosineSimilarity(queryVector, rec.vector);
      const keyword = keywordScore(query, rec.text);

      // Hybrid: semantic provides base relevance, keyword boosts exact matches
      const score = semantic * 0.5 + keyword * 0.5;
      if (score < 0.1) return null;

      const isDocument = !!rec.documentId;
      const msg = isDocument
        ? undefined
        : session.messages.find((m) => m.id === rec.messageId);

      return {
        chatId: rec.chatId,
        chatTitle: session.title,
        messageId: rec.messageId,
        ...(rec.documentId && { documentId: rec.documentId }),
        text: rec.text,
        score,
        role: (isDocument ? "document" : (msg?.role ?? "user")) as
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
 * Split long text into overlapping chunks for embedding.
 * Each chunk is at most `maxLength` characters with `overlap` character overlap.
 */
export function chunkText(
  text: string,
  maxLength = 512,
  overlap = 64,
): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return [trimmed];

  const chunks: string[] = [];
  let start = 0;
  while (start < trimmed.length) {
    chunks.push(trimmed.slice(start, start + maxLength));
    start += maxLength - overlap;
  }
  return chunks;
}
