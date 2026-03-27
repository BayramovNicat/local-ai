import type { ChatSession, EmbeddingRecord, Document, Attachment } from '@/app/types';
import { normalizeVector } from './embeddings';

const DB_NAME = 'local-ai';
const STORE_CHATS = 'chats';
const STORE_EMBEDDINGS = 'embeddings';
const STORE_DOCUMENTS = 'documents';
const DB_VERSION = 4;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      const oldVersion = e.oldVersion;

      if (!db.objectStoreNames.contains(STORE_CHATS)) {
        db.createObjectStore(STORE_CHATS);
      }

      if (!db.objectStoreNames.contains(STORE_EMBEDDINGS)) {
        const store = db.createObjectStore(STORE_EMBEDDINGS, {
          keyPath: 'id',
        });
        store.createIndex('chatId', 'chatId', { unique: false });
        store.createIndex('messageId', 'messageId', { unique: false });
        store.createIndex('documentId', 'documentId', { unique: false });
      } else if (oldVersion < 3) {
        // Add documentId index to existing embeddings store
        const tx = (e.target as IDBOpenDBRequest).transaction!;
        const store = tx.objectStore(STORE_EMBEDDINGS);
        if (!store.indexNames.contains('documentId')) {
          store.createIndex('documentId', 'documentId', { unique: false });
        }
      }

      if (!db.objectStoreNames.contains(STORE_DOCUMENTS)) {
        const store = db.createObjectStore(STORE_DOCUMENTS, {
          keyPath: 'id',
        });
        store.createIndex('chatId', 'chatId', { unique: false });
      }
    };
    request.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Check if an error is a QuotaExceededError.
 */
export function isQuotaExceededError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
}

/**
 * Get estimated storage usage and quota.
 */
export async function getStorageUsage(): Promise<{ usage: number; quota: number } | null> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage ?? 0,
      quota: estimate.quota ?? 0,
    };
  }
  return null;
}

// ── Chat CRUD ──────────────────────────────────────────────

/**
 * ObjectURLs are transient and should not be persisted.
 * We store the Blob instead and recreate the URL on load.
 */
function prepareChatForSave(chat: Omit<ChatSession, 'id'>): Omit<ChatSession, 'id'> {
  return {
    ...chat,
    messages: chat.messages.map((msg) => ({
      ...msg,
      attachments: msg.attachments?.map((att) => ({
        ...att,
        url: '', // Don't persist transient blob: URLs
      })),
    })),
  };
}

export function restoreChatFromSave(chat: ChatSession, oldChat?: ChatSession): ChatSession {
  return {
    ...chat,
    messages: chat.messages.map((msg) => {
      const oldMsg = oldChat?.messages.find((m) => m.id === msg.id);
      return {
        ...msg,
        attachments: msg.attachments?.map((att) => {
          // If already has blob URL, keep it
          if (att.url.startsWith('blob:')) return att;

          const oldAtt = oldMsg?.attachments?.find((a) => a.id === att.id);
          // If we already have a valid Blob URL for this attachment in old state, REUSE it!
          if (oldAtt && oldAtt.url.startsWith('blob:')) {
            return { ...att, url: oldAtt.url };
          }
          // Only create if we have a blob and no URL
          return {
            ...att,
            url: att.blob ? URL.createObjectURL(att.blob) : att.url,
          };
        }),
      };
    }),
  };
}

export async function saveChat(id: string, data: Omit<ChatSession, 'id'>): Promise<void> {
  const db = await openDB();
  const preparedData = prepareChatForSave(data);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHATS, 'readwrite');
    const req = tx.objectStore(STORE_CHATS).put(preparedData, id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function loadAllChats(restoreUrls = false): Promise<ChatSession[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHATS, 'readonly');
    const store = tx.objectStore(STORE_CHATS);
    const keysReq = store.getAllKeys();
    const valsReq = store.getAll();
    tx.oncomplete = () => {
      const keys = keysReq.result as string[];
      const vals = valsReq.result as Omit<ChatSession, 'id'>[];
      const chats = keys.map((id, i) => ({ id, ...vals[i] }));
      resolve(restoreUrls ? chats.map((c) => restoreChatFromSave(c)) : (chats as ChatSession[]));
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Revoke ObjectURLs for a single list of attachments.
 */
export function revokeAttachmentUrls(attachments: Attachment[]) {
  for (const att of attachments) {
    if (att.url.startsWith('blob:')) {
      URL.revokeObjectURL(att.url);
    }
  }
}

/**
 * Revoke ObjectURLs to prevent memory leaks.
 */
export function revokeChatUrls(chats: ChatSession[]) {
  for (const chat of chats) {
    for (const msg of chat.messages) {
      if (msg.attachments) {
        for (const att of msg.attachments) {
          if (att.url.startsWith('blob:')) {
            URL.revokeObjectURL(att.url);
          }
        }
      }
    }
  }
}

export async function deleteChat(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHATS, 'readwrite');
    const req = tx.objectStore(STORE_CHATS).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Embedding CRUD ─────────────────────────────────────────

// In-memory cache — avoids repeated full-table reads
let _embeddingsCache: Map<string, EmbeddingRecord> | null = null;
let _embeddedMsgIds: Set<string> | null = null;

export function invalidateEmbeddingsCache() {
  _embeddingsCache = null;
  _embeddedMsgIds = null;
}

export async function saveEmbeddings(records: EmbeddingRecord[]): Promise<void> {
  if (records.length === 0) return;
  const db = await openDB();

  // Normalize vectors for faster dot-product search
  const normalizedRecords = records.map((r) => ({
    ...r,
    vector: normalizeVector(r.vector),
  }));

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EMBEDDINGS, 'readwrite');
    const store = tx.objectStore(STORE_EMBEDDINGS);
    for (const rec of normalizedRecords) {
      store.put(rec);
    }
    tx.oncomplete = () => {
      // Update cache incrementally — O(n) for batch size, not full cache
      if (_embeddingsCache) {
        for (const rec of normalizedRecords) {
          _embeddingsCache.set(rec.id, rec);
        }
      }
      if (_embeddedMsgIds) {
        for (const rec of normalizedRecords) {
          if (rec.messageId) _embeddedMsgIds.add(rec.messageId);
        }
      }
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAllEmbeddings(): Promise<EmbeddingRecord[]> {
  if (_embeddingsCache) return Array.from(_embeddingsCache.values());
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EMBEDDINGS, 'readonly');
    const req = tx.objectStore(STORE_EMBEDDINGS).getAll();
    req.onsuccess = () => {
      const records: EmbeddingRecord[] = req.result ?? [];
      _embeddingsCache = new Map(records.map((r) => [r.id, r]));
      resolve(records);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteEmbeddingsByChatId(chatId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EMBEDDINGS, 'readwrite');
    const store = tx.objectStore(STORE_EMBEDDINGS);
    const index = store.index('chatId');
    const req = index.openCursor(IDBKeyRange.only(chatId));
    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => {
      invalidateEmbeddingsCache();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteEmbeddingsByDocumentId(documentId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EMBEDDINGS, 'readwrite');
    const store = tx.objectStore(STORE_EMBEDDINGS);
    const index = store.index('documentId');
    const req = index.openCursor(IDBKeyRange.only(documentId));
    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => {
      invalidateEmbeddingsCache();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Load document embeddings for a specific chat (uses chatId index).
 * We ALWAYS use IndexedDB index here because it's O(log N) vs O(N) cache filtering.
 */
export async function loadDocEmbeddingsByChatId(chatId: string): Promise<EmbeddingRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EMBEDDINGS, 'readonly');
    const index = tx.objectStore(STORE_EMBEDDINGS).index('chatId');
    const req = index.getAll(IDBKeyRange.only(chatId));
    req.onsuccess = () => {
      resolve((req.result ?? []).filter((r: EmbeddingRecord) => r.documentId));
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Load message embeddings from all chats except the given one (for conversation memory).
 * Uses two index range queries to skip the excluded chatId entirely.
 * ALWAYS uses IndexedDB indexes for better scaling.
 */
export async function loadConvEmbeddingsExcludingChat(
  excludeChatId: string,
): Promise<EmbeddingRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EMBEDDINGS, 'readonly');
    const index = tx.objectStore(STORE_EMBEDDINGS).index('chatId');

    // Two ranges: everything before and after the excluded chatId
    const ranges = [
      IDBKeyRange.upperBound(excludeChatId, true),
      IDBKeyRange.lowerBound(excludeChatId, true),
    ];

    const results: EmbeddingRecord[] = [];
    let completed = 0;

    for (const range of ranges) {
      const req = index.getAll(range);
      req.onsuccess = () => {
        const batch = (req.result ?? []).filter((r: EmbeddingRecord) => !r.documentId);
        results.push(...batch);
        completed++;
        if (completed === ranges.length) {
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    }
  });
}

export async function getEmbeddedMessageIds(): Promise<Set<string>> {
  if (_embeddedMsgIds) return _embeddedMsgIds;

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EMBEDDINGS, 'readonly');
    const index = tx.objectStore(STORE_EMBEDDINGS).index('messageId');
    const results = new Set<string>();

    // openKeyCursor only retrieves keys, much faster than loading full objects (vectors)
    const req = index.openKeyCursor();
    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursor | null>).result;
      if (cursor) {
        if (cursor.key) results.add(cursor.key as string);
        cursor.continue();
      }
    };

    tx.oncomplete = () => {
      _embeddedMsgIds = results;
      resolve(results);
    };
    tx.onerror = () => reject(tx.error);
  });
}

// ── Document CRUD ──────────────────────────────────────────

export async function saveDocument(doc: Document): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
    const req = tx.objectStore(STORE_DOCUMENTS).put(doc);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getDocumentsByChatId(chatId: string): Promise<Document[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCUMENTS, 'readonly');
    const store = tx.objectStore(STORE_DOCUMENTS);
    const index = store.index('chatId');
    const req = index.getAll(IDBKeyRange.only(chatId));
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
    const req = tx.objectStore(STORE_DOCUMENTS).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteDocumentsByChatId(chatId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
    const store = tx.objectStore(STORE_DOCUMENTS);
    const index = store.index('chatId');
    const req = index.openCursor(IDBKeyRange.only(chatId));
    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
