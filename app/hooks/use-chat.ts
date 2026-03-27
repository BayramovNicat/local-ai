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
  getContext?: (
    query: string,
    chatId: string,
    history: ChatSession[],
  ) => Promise<{ docContext: string; convContext: string }>,
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [history, setHistory] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const scrollContainerRef = useRef<HTMLElement>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const activeChatIdRef = useRef(activeChatId);
  activeChatIdRef.current = activeChatId;
  const prevChatIdRef = useRef<string | null>(null);
  const isAtBottomRef = useRef(true);
  const isInteractingRef = useRef(false);
  const interactionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const forceScrollRef = useRef(false);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      isAtBottomRef.current =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        50;
    };

    const handleInteraction = () => {
      isInteractingRef.current = true;
      if (interactionTimerRef.current)
        clearTimeout(interactionTimerRef.current);
      interactionTimerRef.current = setTimeout(() => {
        isInteractingRef.current = false;
      }, 500);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    container.addEventListener("wheel", handleInteraction, { passive: true });
    container.addEventListener("touchstart", handleInteraction, {
      passive: true,
    });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      container.removeEventListener("wheel", handleInteraction);
      container.removeEventListener("touchstart", handleInteraction);
      if (interactionTimerRef.current)
        clearTimeout(interactionTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || messages.length === 0) return;

    const isChatSwitched = activeChatId !== prevChatIdRef.current;
    const shouldAutoScroll =
      isChatSwitched ||
      forceScrollRef.current ||
      (isAtBottomRef.current && !isInteractingRef.current);

    if (shouldAutoScroll) {
      setTimeout(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: isChatSwitched ? ("instant" as ScrollBehavior) : "smooth",
        });
        if (isAtBottomRef.current || isChatSwitched || forceScrollRef.current)
          forceScrollRef.current = false;
      }, 0);
    }
    prevChatIdRef.current = activeChatId;
  }, [messages, activeChatId]);

  const updateHistory = useCallback(
    (chatId: string, msgs: Message[], title?: string) => {
      setHistory((prev) => {
        const updated = prev.map((s) =>
          s.id === chatId
            ? { ...s, messages: msgs, ...(title && { title }) }
            : s,
        );
        const session = updated.find((s) => s.id === chatId);
        if (session)
          saveChatToDB(chatId, {
            title: session.title,
            messages: session.messages,
          }).catch(console.error);
        return updated;
      });
    },
    [],
  );

  useEffect(() => {
    loadAllChats()
      .then((chats) => {
        if (chats.length > 0) {
          chats.sort((a, b) => (b.id > a.id ? 1 : -1));
          setHistory(chats);
        }
        setIsHistoryLoaded(true);
      })
      .catch((err) => {
        console.error(err);
        setIsHistoryLoaded(true);
      });
  }, []);

  const createChat = useCallback(async (title?: string) => {
    const id = Date.now().toString();
    const newSession: ChatSession = {
      id,
      title: title
        ? title.length > 20
          ? title.slice(0, 20) + "..."
          : title
        : "New Chat",
      messages: [],
    };
    setHistory((prev) => [newSession, ...prev]);
    setActiveChatId(id);
    await saveChatToDB(id, { title: newSession.title, messages: [] }).catch(
      console.error,
    );
    return id;
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text && attachments.length === 0) return;

    const isFirstMessage = messages.length === 0;
    forceScrollRef.current = true;

    let currentChatId = activeChatId;
    if (!currentChatId) currentChatId = await createChat(text);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setAttachments([]);
    setIsStreaming(true);

    try {
      const engine = await waitForEngine();
      let docContext = "",
        convContext = "";
      if (getContext && currentChatId) {
        const result = await getContext(text, currentChatId, history);
        docContext = result.docContext;
        convContext = result.convContext;
      }

      let systemPrompt = "";
      if (docContext) systemPrompt += `### DOCUMENT CONTEXT\n${docContext}\n\n`;
      if (convContext)
        systemPrompt += `### PAST CONVERSATION MEMORIES\n${convContext}\n\n`;

      const engineMsgs = [];
      if (systemPrompt) {
        engineMsgs.push({
          role: "system" as const,
          content: `Use this context for a better response:\n\n${systemPrompt.trim()}`,
        });
      }
      engineMsgs.push(
        ...messages
          .concat(userMsg)
          .map((m) => ({ role: m.role, content: m.content })),
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
          const res = await engine.chat.completions.create({
            messages: [
              {
                role: "user",
                content: `User: ${text}\nAssistant: ${currentText}\n\nGenerate a 2-5 word concise title for this chat. Output ONLY the title text.`,
              },
            ],
            stream: false,
          });
          let title = res.choices[0]?.message.content?.trim() || "";
          const generic = [
            "ai assistant",
            "helpful assistant",
            "untitled",
            "chat with ai",
          ];
          if (
            !title ||
            generic.some((g) => title.toLowerCase().includes(g)) ||
            title.length > 50
          ) {
            title = text.length > 25 ? text.slice(0, 25) + "..." : text;
          }
          updateHistory(
            currentChatId,
            messagesRef.current,
            title.replace(/^["']|["']$/g, ""),
          );
        } catch (e) {
          console.error(e);
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
      updateHistory(currentChatId!, messagesRef.current);
    }
  }, [
    input,
    attachments,
    messages,
    activeChatId,
    waitForEngine,
    getContext,
    history,
    createChat,
    updateHistory,
  ]);

  const stopGenerating = useCallback(async () => {
    try {
      const engine = await waitForEngine();
      engine.interruptGenerate();
    } catch (err) {
      console.error(err);
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
      deleteChatFromDB(id).catch(console.error);
      if (activeChatId === id) {
        setMessages([]);
        setActiveChatId(null);
      }
    },
    [activeChatId],
  );

  const editMessage = useCallback((id: string) => {
    const found = messagesRef.current.find((m) => m.id === id);
    if (found) setInput(found.content);
  }, []);

  return {
    messages,
    input,
    setInput,
    attachments,
    setAttachments,
    history,
    activeChatId,
    scrollContainerRef,
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
