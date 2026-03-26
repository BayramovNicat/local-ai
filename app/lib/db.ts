import type { ChatSession, EmbeddingRecord, Document } from "@/app/types";

const DB_NAME = "local-ai";
const STORE_CHATS = "chats";
const STORE_EMBEDDINGS = "embeddings";
const STORE_DOCUMENTS = "documents";
const DB_VERSION = 4;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      const oldVersion = e.oldVersion;

      if (oldVersion < 4 && db.objectStoreNames.contains(STORE_CHATS)) {
        db.deleteObjectStore(STORE_CHATS);
      }
      if (!db.objectStoreNames.contains(STORE_CHATS)) {
        db.createObjectStore(STORE_CHATS);
      }

      if (!db.objectStoreNames.contains(STORE_EMBEDDINGS)) {
        const store = db.createObjectStore(STORE_EMBEDDINGS, {
          keyPath: "id",
        });
        store.createIndex("chatId", "chatId", { unique: false });
        store.createIndex("messageId", "messageId", { unique: false });
        store.createIndex("documentId", "documentId", { unique: false });
      } else if (oldVersion < 3) {
        // Add documentId index to existing embeddings store
        const tx = (e.target as IDBOpenDBRequest).transaction!;
        const store = tx.objectStore(STORE_EMBEDDINGS);
        if (!store.indexNames.contains("documentId")) {
          store.createIndex("documentId", "documentId", { unique: false });
        }
      }

      if (!db.objectStoreNames.contains(STORE_DOCUMENTS)) {
        const store = db.createObjectStore(STORE_DOCUMENTS, {
          keyPath: "id",
        });
        store.createIndex("chatId", "chatId", { unique: false });
      }
    };
    request.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    request.onerror = () => reject(request.error);
  });
}

// ── Chat CRUD ──────────────────────────────────────────────

export async function saveChat(
  id: string,
  data: Omit<ChatSession, "id">,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHATS, "readwrite");
    const req = tx.objectStore(STORE_CHATS).put(data, id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function loadAllChats(): Promise<ChatSession[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHATS, "readonly");
    const store = tx.objectStore(STORE_CHATS);
    const keysReq = store.getAllKeys();
    const valsReq = store.getAll();
    tx.oncomplete = () => {
      const keys = keysReq.result as string[];
      const vals = valsReq.result as Omit<ChatSession, "id">[];
      resolve(keys.map((id, i) => ({ id, ...vals[i] })));
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteChat(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHATS, "readwrite");
    const req = tx.objectStore(STORE_CHATS).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Embedding CRUD ─────────────────────────────────────────

// In-memory cache — avoids repeated full-table reads
let _embeddingsCache: EmbeddingRecord[] | null = null;
let _embeddedMsgIds: Set<string> | null = null;

function invalidateEmbeddingsCache() {
  _embeddingsCache = null;
  _embeddedMsgIds = null;
}

export async function saveEmbeddings(
  records: EmbeddingRecord[],
): Promise<void> {
  if (records.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EMBEDDINGS, "readwrite");
    const store = tx.objectStore(STORE_EMBEDDINGS);
    for (const rec of records) {
      store.put(rec);
    }
    tx.oncomplete = () => {
      // Update cache incrementally instead of invalidating
      if (_embeddingsCache) {
        const newIds = new Set(records.map((r) => r.id));
        _embeddingsCache = [
          ..._embeddingsCache.filter((r) => !newIds.has(r.id)),
          ...records,
        ];
      }
      if (_embeddedMsgIds) {
        for (const rec of records) {
          if (rec.messageId) _embeddedMsgIds.add(rec.messageId);
        }
      }
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAllEmbeddings(): Promise<EmbeddingRecord[]> {
  if (_embeddingsCache) return _embeddingsCache;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EMBEDDINGS, "readonly");
    const req = tx.objectStore(STORE_EMBEDDINGS).getAll();
    req.onsuccess = () => {
      _embeddingsCache = req.result ?? [];
      resolve(_embeddingsCache);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteEmbeddingsByChatId(
  chatId: string,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EMBEDDINGS, "readwrite");
    const store = tx.objectStore(STORE_EMBEDDINGS);
    const index = store.index("chatId");
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

export async function deleteEmbeddingsByDocumentId(
  documentId: string,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EMBEDDINGS, "readwrite");
    const store = tx.objectStore(STORE_EMBEDDINGS);
    const index = store.index("documentId");
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

export async function getEmbeddedMessageIds(): Promise<Set<string>> {
  if (_embeddedMsgIds) return _embeddedMsgIds;
  const all = await loadAllEmbeddings();
  _embeddedMsgIds = new Set<string>();
  for (const rec of all) {
    if (rec.messageId) _embeddedMsgIds.add(rec.messageId);
  }
  return _embeddedMsgIds;
}

// ── Document CRUD ──────────────────────────────────────────

export async function saveDocument(doc: Document): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCUMENTS, "readwrite");
    const req = tx.objectStore(STORE_DOCUMENTS).put(doc);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getDocumentsByChatId(
  chatId: string,
): Promise<Document[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCUMENTS, "readonly");
    const store = tx.objectStore(STORE_DOCUMENTS);
    const index = store.index("chatId");
    const req = index.getAll(IDBKeyRange.only(chatId));
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCUMENTS, "readwrite");
    const req = tx.objectStore(STORE_DOCUMENTS).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteDocumentsByChatId(
  chatId: string,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCUMENTS, "readwrite");
    const store = tx.objectStore(STORE_DOCUMENTS);
    const index = store.index("chatId");
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
