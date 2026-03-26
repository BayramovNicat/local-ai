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
 * Search embeddings by cosine similarity against a query vector.
 * Returns top-K results enriched with chat metadata.
 */
export function searchEmbeddings(
  queryVector: number[],
  records: EmbeddingRecord[],
  history: ChatSession[],
  topK = 10,
): SearchResult[] {
  const chatMap = new Map(history.map((s) => [s.id, s]));

  const scored = records
    .map((rec) => {
      const session = chatMap.get(rec.chatId);
      if (!session) return null;

      const msg = session.messages.find((m) => m.id === rec.messageId);

      return {
        chatId: rec.chatId,
        chatTitle: session.title,
        messageId: rec.messageId,
        text: rec.text,
        score: cosineSimilarity(queryVector, rec.vector),
        role: (msg?.role ?? "user") as "user" | "assistant",
      };
    })
    .filter((r): r is SearchResult => r !== null);

  scored.sort((a, b) => b.score - a.score);

  // De-duplicate: keep only the best result per message
  const seen = new Set<string>();
  const deduped: SearchResult[] = [];
  for (const r of scored) {
    if (!seen.has(r.messageId)) {
      seen.add(r.messageId);
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
