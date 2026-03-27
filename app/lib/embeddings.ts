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
export function keywordScore(queryOrTerms: string | string[], text: string): number {
  const queryTerms = Array.isArray(queryOrTerms) 
    ? queryOrTerms 
    : queryOrTerms
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
  queryOrTerms: string | string[],
  text: string,
  queryVector: number[],
  docVector: number[],
): number {
  return (
    cosineSimilarity(queryVector, docVector) * 0.5 +
    keywordScore(queryOrTerms, text) * 0.5
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
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);

  const scored = records
    .map((rec) => {
      const session = chatMap.get(rec.chatId);
      if (!session) return null;

      const semantic = cosineSimilarity(queryVector, rec.vector);
      const keyword = keywordScore(queryTerms, rec.text);

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
 * Recursive character splitter: attempts to split text at natural boundaries
 * (paragraphs, sentences, words) to keep chunks semantically coherent.
 */
export function chunkText(
  text: string,
  maxLength = 512,
  overlap = 64,
): string[] {
  const separators = ["\n\n", "\n", ". ", "? ", "! ", " ", ""];

  function splitRecursive(input: string): string[] {
    const trimmed = input.trim();
    if (!trimmed) return [];
    if (trimmed.length <= maxLength) return [trimmed];

    // Find the best separator
    let separator = separators[separators.length - 1];
    for (const s of separators) {
      if (trimmed.includes(s)) {
        separator = s;
        break;
      }
    }

    const parts = trimmed.split(separator);
    const result: string[] = [];
    let currentChunk = "";

    for (const part of parts) {
      const partWithSeparator = currentChunk ? separator + part : part;
      if ((currentChunk + partWithSeparator).length <= maxLength) {
        currentChunk += partWithSeparator;
      } else {
        if (currentChunk) result.push(currentChunk);
        
        // If the part itself is too long, recurse further
        if (part.length > maxLength) {
          result.push(...splitRecursive(part));
        } else {
          currentChunk = part;
        }
      }
    }
    if (currentChunk) result.push(currentChunk);
    return result;
  }

  const initialChunks = splitRecursive(text);
  
  // Apply overlap
  if (overlap <= 0 || initialChunks.length <= 1) return initialChunks;

  const overlapped: string[] = [];
  for (let i = 0; i < initialChunks.length; i++) {
    let chunk = initialChunks[i];
    if (i > 0) {
      const prev = initialChunks[i - 1];
      // Take the last 'overlap' characters from previous chunk
      const overlapText = prev.slice(-overlap);
      // Ensure we don't exceed maxLength by prepending overlap
      // We take only as much as fits within maxLength
      const availableSpace = maxLength - chunk.length;
      if (availableSpace > 0) {
        const actualOverlap = overlapText.slice(-availableSpace);
        chunk = actualOverlap + chunk;
      }
    }
    overlapped.push(chunk);
  }

  return overlapped;
}
