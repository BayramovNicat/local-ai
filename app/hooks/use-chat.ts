"use client";

import {
  deleteChat as deleteChatFromDB,
  loadAllChats,
  saveChat as saveChatToDB,
} from "@/app/lib/db";
import type { Attachment, ChatSession, Message } from "@/app/types";
import type { MLCEngineInterface } from "@mlc-ai/web-llm";
import { useCallback, useEffect, useRef, useState } from "react";

export function useChat(
  waitForEngine: () => Promise<MLCEngineInterface>,
  getContext?: (query: string, chatId: string) => Promise<string>,
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [history, setHistory] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const activeChatIdRef = useRef(activeChatId);
  activeChatIdRef.current = activeChatId;

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Persist a single chat session to IndexedDB
  const persistChat = useCallback((chatId: string, msgs: Message[]) => {
    setHistory((prev) => {
      const session = prev.find((s) => s.id === chatId);
      if (session) {
        const updated = { ...session, messages: msgs };
        saveChatToDB(updated).catch((err) =>
          console.error("Failed to save chat:", err),
        );
      }
      return prev;
    });
  }, []);

  // Sync messages to history whenever messages change
  const syncHistoryWithMessages = useCallback(() => {
    const chatId = activeChatIdRef.current;
    const msgs = messagesRef.current;
    if (chatId && msgs.length > 0) {
      setHistory((prev) =>
        prev.map((s) => (s.id === chatId ? { ...s, messages: msgs } : s)),
      );
      persistChat(chatId, msgs);
    }
  }, [persistChat]);

  // Load history from IndexedDB
  useEffect(() => {
    loadAllChats()
      .then((chats) => {
        if (chats.length > 0) {
          // Sort by id (timestamp) descending so newest first
          chats.sort((a, b) => (b.id > a.id ? 1 : -1));
          setHistory(chats);
        }
        setIsHistoryLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load history:", err);
        setIsHistoryLoaded(true);
      });
  }, []);

  const createChat = useCallback(async (title?: string) => {
    const id = Date.now().toString();
    const chatTitle = title
      ? title.length > 20
        ? title.slice(0, 20) + "..."
        : title
      : "New Chat";

    const newSession: ChatSession = {
      id,
      title: chatTitle,
      messages: [],
    };

    setHistory((prev) => [newSession, ...prev]);
    setActiveChatId(id);

    try {
      await saveChatToDB(newSession);
    } catch (err) {
      console.error("Failed to save new chat:", err);
    }

    return id;
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text && attachments.length === 0) return;

    const isFirstMessage = messages.length === 0;

    let currentChatId = activeChatId;
    if (!currentChatId) {
      currentChatId = await createChat(text);
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAttachments([]);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    setIsStreaming(true);

    try {
      const engine = await waitForEngine();

      // Retrieve RAG context if documents are attached
      let ragContext = "";
      if (getContext && currentChatId) {
        ragContext = await getContext(text, currentChatId);
      }

      const engineMsgs: Array<{
        role: "system" | "user" | "assistant";
        content: string;
      }> = [];

      // Inject RAG context as system message
      if (ragContext) {
        engineMsgs.push({
          role: "system" as const,
          content: `Use the following document context to answer the user's question. If the context is not relevant, ignore it and answer normally.\n\n${ragContext}`,
        });
      }

      engineMsgs.push(
        ...messages.concat(userMsg).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      );

      const chunks = await engine.chat.completions.create({
        messages: engineMsgs,
        stream: true,
      });

      let currentText = "";
      for await (const chunk of chunks) {
        currentText += chunk.choices[0]?.delta.content || "";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: currentText } : m,
          ),
        );
      }

      if (isFirstMessage) {
        try {
          const titleResponse = await engine.chat.completions.create({
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant that generates short, concise titles for chat conversations.",
              },
              { role: "user", content: text },
              { role: "assistant", content: currentText },
              {
                role: "user",
                content:
                  "Generate a 2-5 word title for this conversation. Output ONLY the title, no extra words, symbols, or phrases like 'Title:' or 'The title is:'. Avoid generic terms like 'AI Assistant' or 'Helpful Chat'.",
              },
            ],
            stream: false,
          });

          let generatedTitle =
            titleResponse.choices[0]?.message.content?.trim() || "";

          // Filter out generic AI-generated filler titles
          const genericTerms = ["ai assistant", "helpful assistant", "untitled chat", "chat with ai", "the title is"];
          const lowerTitle = generatedTitle.toLowerCase();
          const isGeneric = !generatedTitle || genericTerms.some(term => lowerTitle.includes(term)) || generatedTitle.length > 50;

          if (isGeneric) {
            generatedTitle = text.length > 25 ? text.slice(0, 25) + "..." : text;
          }

          generatedTitle = generatedTitle.replace(/^["']|["']$/g, "");

          setHistory((prev) => {
            const updated = prev.map((s) =>
              s.id === currentChatId ? { ...s, title: generatedTitle } : s,
            );
            const session = updated.find((s) => s.id === currentChatId);
            if (session) {
              saveChatToDB(session).catch((err) =>
                console.error("Failed to save title:", err),
              );
            }
            return updated;
          });
        } catch (titleErr) {
          console.error("Title generation failed:", titleErr);
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Error generating response." }
            : m,
        ),
      );
    } finally {
      setIsStreaming(false);
      syncHistoryWithMessages();
    }
  }, [
    input,
    attachments,
    messages,
    activeChatId,
    waitForEngine,
    getContext,
    createChat,
    syncHistoryWithMessages,
  ]);

  const stopGenerating = useCallback(async () => {
    try {
      const engine = await waitForEngine();
      engine.interruptGenerate();
    } catch (err) {
      console.error("Failed to stop generation:", err);
    }
  }, [waitForEngine]);

  const newChat = useCallback(() => {
    setMessages([]);
    setAttachments([]);
    setActiveChatId(null);
  }, []);

  const selectChat = useCallback(
    (id: string) => {
      const session = history.find((s) => s.id === id);
      if (session) {
        setMessages(session.messages);
        setActiveChatId(id);
      }
    },
    [history],
  );

  const deleteChat = useCallback(
    (id: string) => {
      setHistory((prev) => prev.filter((s) => s.id !== id));
      deleteChatFromDB(id).catch((err) =>
        console.error("Failed to delete chat:", err),
      );
      if (activeChatId === id) {
        setMessages([]);
        setActiveChatId(null);
      }
    },
    [activeChatId],
  );

  const editMessage = useCallback(
    (id: string) => {
      const found = messages.find((m) => m.id === id);
      if (found) setInput(found.content);
    },
    [messages],
  );

  return {
    messages,
    input,
    setInput,
    attachments,
    setAttachments,
    history,
    activeChatId,
    messagesEndRef,
    handleSend,
    newChat,
    createChat,
    selectChat,
    deleteChat,
    editMessage,
    isStreaming,
    isHistoryLoaded,
    stopGenerating,
  };
}
