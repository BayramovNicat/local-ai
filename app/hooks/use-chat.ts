"use client";

import {
  deleteChat as deleteChatFromDB,
  loadAllChats,
  saveChat as saveChatToDB,
} from "@/app/lib/db";
import type { Attachment, ChatSession, Message } from "@/app/types";
import type { MLCEngineInterface } from "@mlc-ai/web-llm";
import { useCallback, useEffect, useRef, useState } from "react";

export function useChat(waitForEngine: () => Promise<MLCEngineInterface>) {
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

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text && attachments.length === 0) return;

    const isFirstMessage = messages.length === 0 && !activeChatId;

    let currentChatId = activeChatId;
    if (!currentChatId) {
      currentChatId = Date.now().toString();
      setActiveChatId(currentChatId);
      const tempTitle = text.length > 20 ? text.slice(0, 20) + "..." : text;
      const newSession: ChatSession = {
        id: currentChatId,
        title: tempTitle,
        messages: [],
      };
      setHistory((prev) => [newSession, ...prev]);
      // Persist the new session immediately
      saveChatToDB(newSession).catch((err) =>
        console.error("Failed to save new chat:", err),
      );
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

      const engineMsgs = messages.concat(userMsg).map((m) => ({
        role: m.role,
        content: m.content,
      }));

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
              { role: "user", content: text },
              { role: "assistant", content: currentText },
              {
                role: "user",
                content:
                  "Generate a short 2-5 word title summarizing this conversation. Reply ONLY with the title itself. No quotation marks, no punctuation, no prefix.",
              },
            ],
            stream: false,
          });

          let generatedTitle =
            titleResponse.choices[0]?.message.content?.trim() || "New Chat";
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
    selectChat,
    deleteChat,
    editMessage,
    isStreaming,
    isHistoryLoaded,
    stopGenerating,
  };
}
