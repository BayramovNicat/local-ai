import type { ChatSession, EmbeddingRecord } from "@/app/types";

const DB_NAME = "local-ai";
const STORE_CHATS = "chats";
const STORE_EMBEDDINGS = "embeddings";
const DB_VERSION = 2;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_CHATS)) {
        db.createObjectStore(STORE_CHATS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_EMBEDDINGS)) {
        const store = db.createObjectStore(STORE_EMBEDDINGS, {
          keyPath: "id",
        });
        store.createIndex("chatId", "chatId", { unique: false });
        store.createIndex("messageId", "messageId", { unique: false });
      }
    };
    request.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    request.onerror = () => reject(request.error);
  });
}

// ── Chat CRUD ──────────────────────────────────────────────

export async function saveChat(session: ChatSession): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHATS, "readwrite");
    const req = tx.objectStore(STORE_CHATS).put(session);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function loadAllChats(): Promise<ChatSession[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHATS, "readonly");
    const req = tx.objectStore(STORE_CHATS).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
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
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAllEmbeddings(): Promise<EmbeddingRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EMBEDDINGS, "readonly");
    const req = tx.objectStore(STORE_EMBEDDINGS).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
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
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getEmbeddedMessageIds(): Promise<Set<string>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EMBEDDINGS, "readonly");
    const store = tx.objectStore(STORE_EMBEDDINGS);
    const index = store.index("messageId");
    const req = index.getAllKeys();
    req.onsuccess = () => resolve(new Set(req.result as string[]));
    req.onerror = () => reject(req.error);
  });
}
