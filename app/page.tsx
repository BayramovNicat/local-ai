"use client";

import { useState, useEffect, useRef } from "react";
import type { Message, Attachment } from "@/app/types";
import {
  ACCENT_PRESETS,
  MOCK_MODELS,
  MOCK_HISTORY,
  MOCK_MESSAGES,
} from "@/app/data/constants";
import { Sidebar } from "@/app/components/sidebar/sidebar";
import { Header } from "@/app/components/header/header";
import { ChatMessage } from "@/app/components/chat/chat-message";
import { EmptyState } from "@/app/components/chat/empty-state";
import { MessageInput } from "@/app/components/chat/message-input";
import { DownloadOverlay } from "@/app/components/chat/download-overlay";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState(MOCK_MODELS[0]);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [history, setHistory] = useState(MOCK_HISTORY);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [accentColor, setAccentColor] = useState(ACCENT_PRESETS[0].hex);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDownloading) return;

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 8) + 2;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(() => setIsDownloading(false), 400);
      }
      setDownloadProgress(progress);
    }, 100);

    return () => clearInterval(interval);
  }, [isDownloading, selectedModel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleModelSelect(model: string) {
    if (model !== selectedModel) {
      setSelectedModel(model);
      setIsModelDropdownOpen(false);
      setIsDownloading(true);
      setDownloadProgress(0);
    }
  }

  function handleSend() {
    const text = input.trim();
    if (!text && attachments.length === 0) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    const attachmentNote =
      attachments.length > 0
        ? `\n\n*${attachments.length} image(s) attached.*`
        : "";
    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: `I received your message: *"${text || "(no text)"}"*${attachmentNote}\n\nThis is a **mock response** from \`${selectedModel}\`. In a real setup, the model would generate a response locally on your machine.`,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setAttachments([]);
  }

  return (
    <>
      {isDownloading && (
        <DownloadOverlay
          modelName={selectedModel}
          progress={downloadProgress}
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
          activeChat={activeChat}
          onNewChat={() => {
            setMessages([]);
            setActiveChat(null);
          }}
          onSelectChat={setActiveChat}
          onDeleteChat={(i) =>
            setHistory((prev) => prev.filter((_, idx) => idx !== i))
          }
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
            models={MOCK_MODELS}
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
