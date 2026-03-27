'use client';

import { useToast } from '@/app/components/ui/toast';
import {
  deleteChat as deleteChatFromDB,
  loadAllChats,
  restoreChatFromSave,
  revokeChatUrls,
  saveChat as saveChatToDB,
} from '@/app/lib/db';
import type { Attachment, ChatSession, Message } from '@/app/types';
import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import { useCallback, useEffect, useRef, useState } from 'react';

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
  const tabIdRef = useRef<string>('');

  useEffect(() => {
    tabIdRef.current = crypto.randomUUID();
  }, []);

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
      const { type, payload, senderId } = event.data;

      // Ignore messages from self
      if (senderId === tabIdRef.current) return;

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
    channel.postMessage({
      type: 'chat-update',
      payload: { chatId, messages, title },
      senderId: tabIdRef.current,
    });
    channel.close();
  }, []);

  const broadcastDelete = useCallback((chatId: string) => {
    const channel = new BroadcastChannel('local-ai-sync');
    channel.postMessage({
      type: 'chat-delete',
      payload: { chatId },
      senderId: tabIdRef.current,
    });
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
      let finalTitleToSave = title || 'New Chat';

      setHistory((prev) => {
        const session = prev.find((s) => s.id === chatId);
        if (!session) return prev;

        // If no title provided, use the existing one from state
        if (!title) finalTitleToSave = session.title;

        return prev.map((s) =>
          s.id === chatId ? { ...s, messages: msgs, ...(title && { title }) } : s,
        );
      });

      saveChatToDB(chatId, {
        title: finalTitleToSave,
        messages: msgs,
      }).catch((err) => {
        console.error(err);
      });
      broadcastUpdate(chatId, msgs, finalTitleToSave);
    },
    [broadcastUpdate],
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
      const initialTitle = title
        ? title.length > 25
          ? title.slice(0, 25) + '...'
          : title
        : 'New Chat';
      const newSession: ChatSession = {
        id,
        title: initialTitle,
        messages: [],
      };

      setHistory((prev) => [newSession, ...prev]);
      setActiveChatId(id);
      activeChatIdRef.current = id;

      saveChatToDB(id, { title: initialTitle, messages: [] }).catch(console.error);
      broadcastUpdate(id, [], initialTitle);
      return { id, title: initialTitle };
    },
    [broadcastUpdate],
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text && attachments.length === 0) return;

    const startMessages = messagesRef.current;
    const isFirstMessage = startMessages.length === 0;
    forceScrollRef.current = true;

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

    let activeMessages = [...startMessages, userMsg, assistantMsg];

    setMessages(activeMessages);
    setInput('');
    setAttachments([]);
    setIsStreaming(true);

    let currentChatId = activeChatIdRef.current;
    let currentTitle = 'New Chat';

    if (!currentChatId) {
      const result = await createChat(text);
      currentChatId = result.id;
      currentTitle = result.title;
    } else {
      const session = historyRef.current.find((s) => s.id === currentChatId);
      currentTitle = session?.title || 'New Chat';
    }

    if (currentChatId) {
      saveChatToDB(currentChatId, {
        title: currentTitle,
        messages: [...startMessages, userMsg],
      }).catch(console.error);
    }

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

      totalChars += userMsg.content.length;

      for (let i = startMessages.length - 1; i >= 0; i--) {
        const msg = startMessages[i];
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
      let lastSaveTime = Date.now();
      const UPDATE_INTERVAL = 50;
      const SAVE_INTERVAL = 2000;

      for await (const chunk of chunks) {
        currentText += chunk.choices[0]?.delta.content || '';

        const now = Date.now();
        if (now - lastUpdateTime > UPDATE_INTERVAL) {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: currentText } : m)),
          );
          lastUpdateTime = now;
        }

        if (now - lastSaveTime > SAVE_INTERVAL && currentChatId) {
          activeMessages = activeMessages.map((m) =>
            m.id === assistantId ? { ...m, content: currentText } : m,
          );
          saveChatToDB(currentChatId, { title: currentTitle, messages: activeMessages }).catch(
            console.error,
          );
          lastSaveTime = now;
        }
      }

      activeMessages = activeMessages.map((m) =>
        m.id === assistantId ? { ...m, content: currentText } : m,
      );
      setMessages(activeMessages);

      if (isFirstMessage) {
        try {
          const res = await engine.chat.completions.create({
            messages: [
              {
                role: 'user',
                content: `User: ${text}\nAssistant: ${currentText}\n\nGenerate a 2-5 word concise title for this chat based on the exchange. Output ONLY the title text. No quotes.`,
              },
            ],
            stream: false,
          });
          let aiTitle = res.choices[0]?.message.content?.trim() || '';
          aiTitle = aiTitle.replace(/^["']|["']$/g, '');
          const generic = ['ai assistant', 'helpful assistant', 'untitled'];
          if (!aiTitle || generic.some((g) => aiTitle.toLowerCase() === g) || aiTitle.length > 60) {
            aiTitle = currentTitle;
          }
          console.log(`[Title Gen] Original: "${currentTitle}" -> AI: "${aiTitle}"`);
          updateHistory(currentChatId!, activeMessages, aiTitle);
        } catch (e) {
          console.error('[Title Generation Failed]', e);
          updateHistory(currentChatId!, activeMessages);
        }
      } else if (currentChatId) {
        updateHistory(currentChatId, activeMessages);
      }
    } catch (err) {
      console.error(err);
      errorToast('Failed to generate response. Please check WebGPU support.');
      const errorMessages = activeMessages.map((m) =>
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
    activeChatIdRef.current = null;
  }, []);

  const selectChat = useCallback((id: string) => {
    const session = historyRef.current.find((s) => s.id === id);
    if (session) {
      const restored = restoreChatFromSave(session);
      setMessages(restored.messages);
      setActiveChatId(id);
      activeChatIdRef.current = id;
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
        activeChatIdRef.current = null;
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
    isStreaming,
    isHistoryLoaded,
    stopGenerating,
  };
}
