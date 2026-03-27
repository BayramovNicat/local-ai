export interface Attachment {
  id: string;
  type: "image";
  url: string; // ObjectURL for rendering
  name: string;
  blob?: Blob; // For persistence in IDB
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

export interface AccentPreset {
  name: string;
  hex: string;
}

export interface EmbeddingRecord {
  id: string;
  chatId: string;
  messageId: string;
  documentId?: string;
  role?: "user" | "assistant" | "document";
  text: string;
  vector: number[];
  timestamp: number;
}

export interface SearchResult {
  chatId: string;
  chatTitle: string;
  messageId: string;
  documentId?: string;
  text: string;
  score: number;
  role: "user" | "assistant" | "document";
}

export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  chatId: string;
  createdAt: number;
}
