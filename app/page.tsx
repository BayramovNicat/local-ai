"use client";

import { useState, useEffect, useRef } from "react";
import type { Message, Attachment, ChatSession } from "@/app/types";
import {
  ACCENT_PRESETS,
  AVAILABLE_MODELS,
} from "@/app/data/constants";
import { Sidebar } from "@/app/components/sidebar/sidebar";
import { Header } from "@/app/components/header/header";
import { ChatMessage } from "@/app/components/chat/chat-message";
import { EmptyState } from "@/app/components/chat/empty-state";
import { MessageInput } from "@/app/components/chat/message-input";
import { DownloadOverlay } from "@/app/components/chat/download-overlay";
import { CreateMLCEngine, MLCEngine, hasModelInCache } from "@mlc-ai/web-llm";

// Native IndexedDB wrappers to replace idb-keyval
function saveToDB(key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("keyval-store");
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("keyval")) db.createObjectStore("keyval");
    };
    request.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      try {
        const tx = db.transaction("keyval", "readwrite");
        const store = tx.objectStore("keyval");
        const putReq = store.put(value, key);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      } catch (err) {
        reject(err);
      }
    };
    request.onerror = () => reject(request.error); 
  });
}

function loadFromDB<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("keyval-store");
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("keyval")) db.createObjectStore("keyval");
    };
    request.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("keyval")) {
        return resolve(undefined);
      }
      try {
        const tx = db.transaction("keyval", "readonly");
        const store = tx.objectStore("keyval");
        const getReq = store.get(key);
        getReq.onsuccess = () => resolve(getReq.result);
        getReq.onerror = () => reject(getReq.error);
      } catch (err) {
        reject(err);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0]);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(true);
  const [isCached, setIsCached] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadProgressText, setDownloadProgressText] = useState("");
  const [history, setHistory] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const [accentColor, setAccentColor] = useState(ACCENT_PRESETS[0].hex);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MLCEngine | null>(null);

  useEffect(() => {
    let active = true;

    async function loadEngine() {
      setIsDownloading(true);
      setDownloadProgress(0);
      setDownloadProgressText("Initializing engine...");
      
      try {
        const cached = await hasModelInCache(selectedModel);
        if (active) setIsCached(cached);

        const engine = await CreateMLCEngine(selectedModel, {
          initProgressCallback: (report) => {
            if (active) {
              setDownloadProgress(Math.round(report.progress * 100));
              setDownloadProgressText(report.text);
            }
          }
        });
        
        if (active) {
          engineRef.current = engine;
          setIsDownloading(false);
        }
      } catch (err) {
        if (active) {
          console.error(err);
          setDownloadProgressText("Error loading model. See console.");
        }
      }
    }

    loadEngine();

    return () => {
      active = false;
    };
  }, [selectedModel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (activeChatId && messages.length > 0) {
      setHistory((prev) =>
        prev.map((session) =>
          session.id === activeChatId ? { ...session, messages } : session
        )
      );
    }
  }, [messages, activeChatId]);

  useEffect(() => {
    loadFromDB<ChatSession[]>('chat-history')
      .then((val) => {
        if (val && Array.isArray(val) && val.length > 0) {
          setHistory(val);
        }
        setIsHistoryLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load history:", err);
        setIsHistoryLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (isHistoryLoaded) {
      saveToDB('chat-history', history).catch(err => console.error("Failed to save history:", err));
    }
  }, [history, isHistoryLoaded]);

  function handleModelSelect(model: string) {
    if (model !== selectedModel) {
      setSelectedModel(model);
      setIsModelDropdownOpen(false);
      setIsDownloading(true);
      setDownloadProgress(0);
      setDownloadProgressText("Initializing engine...");
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text && attachments.length === 0) return;

    const isFirstMessage = messages.length === 0 && !activeChatId;

    let currentChatId = activeChatId;
    if (!currentChatId) {
      currentChatId = Date.now().toString();
      setActiveChatId(currentChatId);
      const tempTitle = text.length > 20 ? text.slice(0, 20) + "..." : text;
      setHistory((prev) => [
        { id: currentChatId!, title: tempTitle, messages: [] },
        ...prev,
      ]);
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

    if (!engineRef.current) return;

    const assistantId = (Date.now() + 1).toString();
    const initAssistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, initAssistantMsg]);

    try {
      const engineMsgs = messages.concat(userMsg).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const chunks = await engineRef.current.chat.completions.create({
        messages: engineMsgs,
        stream: true,
      });

      let currentText = "";
      for await (const chunk of chunks) {
        currentText += chunk.choices[0]?.delta.content || "";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: currentText } : m
          )
        );
      }

      if (isFirstMessage) {
        try {
          const titleResponse = await engineRef.current.chat.completions.create({
            messages: [
              { role: "user", content: text },
              { role: "assistant", content: currentText },
              { role: "user", content: "Generate a short 2-5 word title summarizing this conversation. Reply ONLY with the title itself. No quotation marks, no punctuation, no prefix." }
            ],
            stream: false,
          });
          
          let generatedTitle = titleResponse.choices[0]?.message.content?.trim() || "New Chat";
          generatedTitle = generatedTitle.replace(/^["']|["']$/g, ''); // Remove quotes if LLM added them
          
          setHistory((prev) => 
            prev.map(s => s.id === currentChatId ? { ...s, title: generatedTitle } : s)
          );
        } catch (titleErr) {
          console.error("Title generation failed:", titleErr);
        }
      }

    } catch (err) {
      console.error(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: "Error generating response." } : m
        )
      );
    }
  }

  return (
    <>
      {isDownloading && (
        <DownloadOverlay
          modelName={selectedModel}
          progress={downloadProgress}
          progressText={downloadProgressText}
          isCached={isCached}
          accent={accentColor}
        />
      )}

      <div
        className="flex h-screen overflow-hidden bg-[#0a0a0a]"
        style={{ "--accent": accentColor } as React.CSSProperties}
      >
        <Sidebar
          isOpen={isSidebarOpen}
          accent={accentColor}
          history={history}
          activeChatId={activeChatId}
          onNewChat={() => {
            setMessages([]);
            setActiveChatId(null);
          }}
          onSelectChat={(id) => {
            const session = history.find((s) => s.id === id);
            if (session) {
              setMessages(session.messages);
              setActiveChatId(id);
            }
          }}
          onDeleteChat={(id) => {
            setHistory((prev) => prev.filter((s) => s.id !== id));
            if (activeChatId === id) {
              setMessages([]);
              setActiveChatId(null);
            }
          }}
          onClose={() => setIsSidebarOpen(false)}
        />

        <div className="flex-1 relative min-w-0">
          <Header
            accent={accentColor}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isColorPickerOpen={isColorPickerOpen}
            onToggleColorPicker={() => setIsColorPickerOpen(!isColorPickerOpen)}
            onSelectColor={(hex) => {
              setAccentColor(hex);
              setIsColorPickerOpen(false);
            }}
            accentPresets={ACCENT_PRESETS}
            isModelDropdownOpen={isModelDropdownOpen}
            onToggleModelDropdown={() =>
              setIsModelDropdownOpen(!isModelDropdownOpen)
            }
            models={AVAILABLE_MODELS}
            selectedModel={selectedModel}
            onSelectModel={handleModelSelect}
          />

          <main className="absolute inset-0 overflow-y-auto px-3 sm:px-4 md:px-6 pt-16 pb-28 space-y-6">
            {messages.length === 0 ? (
              <EmptyState accent={accentColor} />
            ) : (
              messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  accent={accentColor}
                  onEdit={(id) => {
                    const found = messages.find((m) => m.id === id);
                    if (found) setInput(found.content);
                  }}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </main>

          <MessageInput
            input={input}
            setInput={setInput}
            attachments={attachments}
            setAttachments={setAttachments}
            accent={accentColor}
            onSend={handleSend}
          />
        </div>
      </div>
    </>
  );
}
