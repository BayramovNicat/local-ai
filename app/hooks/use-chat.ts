'use client';

import {
  deleteChat as deleteChatFromDB,
  loadAllChats,
  saveChat as saveChatToDB,
  isQuotaExceededError,
  revokeChatUrls,
  restoreChatFromSave,
} from '@/app/lib/db';
import type { Attachment, ChatSession, Message } from '@/app/types';
import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/app/components/ui/toast';

export function useChat(
  waitForEngine: () => Promise<MLCEngineInterface>,
  getContext?: (
    query: string,
    chatId: string,
    history: ChatSession[],
  ) => Promise<{ docContext: string; convContext: string }>,
) {
  const { error: errorToast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
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
  const historyRef = useRef(history);
  historyRef.current = history;
  const prevChatIdRef = useRef<string | null>(null);
  const isAtBottomRef = useRef(true);
  const isInteractingRef = useRef(false);
  const interactionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const forceScrollRef = useRef(false);

  // Cleanup URLs on final unmount
  useEffect(() => {
    return () => {
      revokeChatUrls(historyRef.current);
    };
  }, []);

  // Tab Synchronization
  useEffect(() => {
    const channel = new BroadcastChannel('local-ai-sync');

    const handler = (event: MessageEvent) => {
      const { type, payload } = event.data;

      if (type === 'chat-update') {
        const { chatId, messages: rawMessages, title } = payload;

        setHistory((prev) => {
          const oldSession = prev.find((s) => s.id === chatId);
          // Recreate ObjectURLs for attachments if they exist, but REUSE old ones if possible
          const restored = restoreChatFromSave(
            { id: chatId, title: title || '', messages: rawMessages },
            oldSession,
          );
          const messages = restored.messages;

          if (oldSession) {
            const newHistory = prev.map((s) =>
              s.id === chatId ? { ...s, messages, ...(title && { title }) } : s,
            );

            if (activeChatIdRef.current === chatId) {
              setMessages(messages);
            }
            return newHistory;
          } else {
            const newHistory = [{ id: chatId, title: title || 'New Chat', messages }, ...prev];
            if (activeChatIdRef.current === chatId) {
              setMessages(messages);
            }
            return newHistory;
          }
        });
      } else if (type === 'chat-delete') {
        const { chatId } = payload;
        setHistory((prev) => prev.filter((s) => s.id !== chatId));
        if (activeChatIdRef.current === chatId) {
          setMessages([]);
          setActiveChatId(null);
        }
      }
    };

    channel.addEventListener('message', handler);
    return () => {
      channel.removeEventListener('message', handler);
      channel.close();
    };
  }, []);

  const broadcastUpdate = useCallback((chatId: string, messages: Message[], title?: string) => {
    const channel = new BroadcastChannel('local-ai-sync');
    channel.postMessage({ type: 'chat-update', payload: { chatId, messages, title } });
    channel.close();
  }, []);

  const broadcastDelete = useCallback((chatId: string) => {
    const channel = new BroadcastChannel('local-ai-sync');
    channel.postMessage({ type: 'chat-delete', payload: { chatId } });
    channel.close();
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      isAtBottomRef.current =
        container.scrollHeight - container.scrollTop - container.clientHeight < 50;
    };

    const handleInteraction = () => {
      isInteractingRef.current = true;
      if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
      interactionTimerRef.current = setTimeout(() => {
        isInteractingRef.current = false;
      }, 500);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('wheel', handleInteraction, { passive: true });
    container.addEventListener('touchstart', handleInteraction, {
      passive: true,
    });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleInteraction);
      container.removeEventListener('touchstart', handleInteraction);
      if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
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
          behavior: isChatSwitched ? ('instant' as ScrollBehavior) : 'smooth',
        });
        if (isAtBottomRef.current || isChatSwitched || forceScrollRef.current)
          forceScrollRef.current = false;
      }, 0);
    }
    prevChatIdRef.current = activeChatId;
  }, [messages, activeChatId]);

  const updateHistory = useCallback(
    (chatId: string, msgs: Message[], title?: string) => {
      let updatedSession: ChatSession | undefined;

      setHistory((prev) => {
        const session = prev.find((s) => s.id === chatId);
        if (!session) return prev;

        updatedSession = { ...session, messages: msgs, ...(title && { title }) };
        return prev.map((s) => (s.id === chatId ? updatedSession! : s));
      });

      // Move side effects OUT of the state updater
      if (updatedSession) {
        const session = updatedSession;
        saveChatToDB(chatId, {
          title: session.title,
          messages: session.messages,
        }).catch((err) => {
          console.error(err);
          if (isQuotaExceededError(err)) {
            errorToast('Storage quota exceeded. Please delete some chats.');
          } else {
            errorToast('Failed to save chat to database.');
          }
        });
        broadcastUpdate(chatId, session.messages, session.title);
      }
    },
    [broadcastUpdate, errorToast],
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

  const createChat = useCallback(
    async (title?: string) => {
      const id = crypto.randomUUID();
      const newSession: ChatSession = {
        id,
        title: title ? (title.length > 20 ? title.slice(0, 20) + '...' : title) : 'New Chat',
        messages: [],
      };
      setHistory((prev) => [newSession, ...prev]);
      setActiveChatId(id);
      await saveChatToDB(id, { title: newSession.title, messages: [] }).catch((err) => {
        console.error(err);
        if (isQuotaExceededError(err)) {
          errorToast('Storage quota exceeded. Please delete some chats.');
        } else {
          errorToast('Failed to save new chat to database.');
        }
      });
      broadcastUpdate(id, [], newSession.title);
      return id;
    },
    [errorToast, broadcastUpdate],
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text && attachments.length === 0) return;

    // Use current state via Ref to avoid stale closure issues
    const currentMessages = messagesRef.current;
    const isFirstMessage = currentMessages.length === 0;
    forceScrollRef.current = true;

    let currentChatId = activeChatIdRef.current;
    if (!currentChatId) currentChatId = await createChat(text);

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setAttachments([]);
    setIsStreaming(true);

    try {
      const engine = await waitForEngine();
      let docContext = '',
        convContext = '';
      if (getContext && currentChatId) {
        const result = await getContext(text, currentChatId, historyRef.current);
        docContext = result.docContext;
        convContext = result.convContext;
      }

      let systemPrompt = '';
      if (docContext) systemPrompt += `### DOCUMENT CONTEXT\n${docContext}\n\n`;
      if (convContext) systemPrompt += `### PAST CONVERSATION MEMORIES\n${convContext}\n\n`;

      const engineMsgs = [];
      if (systemPrompt) {
        engineMsgs.push({
          role: 'system' as const,
          content: `Use this context for a better response:\n\n${systemPrompt.trim()}`,
        });
      }
      const MAX_HISTORY_MSGS = 15;
      const MAX_HISTORY_CHARS = 4000;
      let totalChars = 0;
      const historyToKeep = [];

      // Always include userMsg
      totalChars += userMsg.content.length;

      // Iterate backwards through previous messages
      for (let i = currentMessages.length - 1; i >= 0; i--) {
        const msg = currentMessages[i];
        if (historyToKeep.length >= MAX_HISTORY_MSGS) break;
        if (totalChars + msg.content.length > MAX_HISTORY_CHARS) break;

        historyToKeep.unshift(msg);
        totalChars += msg.content.length;
      }

      engineMsgs.push(
        ...historyToKeep.concat(userMsg).map((m) => ({ role: m.role, content: m.content })),
      );

      const chunks = await engine.chat.completions.create({
        messages: engineMsgs,
        stream: true,
      });

      let currentText = '';
      let lastUpdateTime = Date.now();
      const UPDATE_INTERVAL = 50; // ms

      for await (const chunk of chunks) {
        currentText += chunk.choices[0]?.delta.content || '';

        const now = Date.now();
        if (now - lastUpdateTime > UPDATE_INTERVAL) {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: currentText } : m)),
          );
          lastUpdateTime = now;
        }
      }

      // Final update to ensure we have the complete message
      // Re-calculate using latest state to be safe (messagesRef.current might have changed during generation)
      const finalMessages = messagesRef.current.map((m) =>
        m.id === assistantId ? { ...m, content: currentText } : m,
      );
      setMessages(finalMessages);

      if (isFirstMessage) {
        try {
          const res = await engine.chat.completions.create({
            messages: [
              {
                role: 'user',
                content: `User: ${text}\nAssistant: ${currentText}\n\nGenerate a 2-5 word concise title for this chat. Output ONLY the title text.`,
              },
            ],
            stream: false,
          });
          let title = res.choices[0]?.message.content?.trim() || '';
          const generic = ['ai assistant', 'helpful assistant', 'untitled', 'chat with ai'];
          if (!title || generic.some((g) => title.toLowerCase().includes(g)) || title.length > 50) {
            title = text.length > 25 ? text.slice(0, 25) + '...' : text;
          }
          updateHistory(currentChatId, finalMessages, title.replace(/^["']|["']$/g, ''));
        } catch (e) {
          console.error(e);
          updateHistory(currentChatId, finalMessages);
        }
      } else if (currentChatId) {
        updateHistory(currentChatId, finalMessages);
      }
    } catch (err) {
      console.error(err);
      errorToast('Failed to generate response. Please check WebGPU support.');
      const errorMessages = messagesRef.current.map((m) =>
        m.id === assistantId ? { ...m, content: 'Error generating response.' } : m,
      );
      setMessages(errorMessages);
      if (currentChatId) {
        updateHistory(currentChatId, errorMessages);
      }
    } finally {
      setIsStreaming(false);
    }
  }, [input, attachments, waitForEngine, getContext, createChat, updateHistory, errorToast]);

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
    setAttachments((prev) => {
      prev.forEach((a) => URL.revokeObjectURL(a.url));
      return [];
    });
    setActiveChatId(null);
  }, []);

  const selectChat = useCallback((id: string) => {
    const session = historyRef.current.find((s) => s.id === id);
    if (session) {
      const restored = restoreChatFromSave(session);
      setMessages(restored.messages);
      setActiveChatId(id);
      setHistory((prev) => prev.map((s) => (s.id === id ? restored : s)));
    }
  }, []);

  const deleteChat = useCallback(
    (id: string) => {
      const chat = historyRef.current.find((s) => s.id === id);
      if (chat) revokeChatUrls([chat]);

      setHistory((prev) => prev.filter((s) => s.id !== id));
      deleteChatFromDB(id).catch((err) => {
        console.error(err);
        errorToast('Failed to delete chat from database.');
      });
      broadcastDelete(id);
      if (activeChatIdRef.current === id) {
        setMessages([]);
        setActiveChatId(null);
      }
    },
    [broadcastDelete, errorToast],
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const att = prev.find((a) => a.id === id);
      if (att) URL.revokeObjectURL(att.url);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

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
    removeAttachment,
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
