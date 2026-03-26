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
