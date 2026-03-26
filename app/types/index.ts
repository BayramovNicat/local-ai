export interface Attachment {
  id: string;
  type: "image";
  url: string;
  name: string;
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
  text: string;
  vector: number[];
  timestamp: number;
}

export interface SearchResult {
  chatId: string;
  chatTitle: string;
  messageId: string;
  text: string;
  score: number;
  role: "user" | "assistant";
}

export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  chatId: string;
  createdAt: number;
}
