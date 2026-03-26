"use client";

import { useState, useEffect, useCallback } from "react";
import { ACCENT_PRESETS, AVAILABLE_MODELS } from "@/app/data/constants";
import { useEngine } from "@/app/hooks/use-engine";
import { usePreferences } from "@/app/hooks/use-preferences";
import { useChat } from "@/app/hooks/use-chat";
import { useEmbeddings } from "@/app/hooks/use-embeddings";
import { Sidebar } from "@/app/components/sidebar/sidebar";
import { Header } from "@/app/components/header/header";
import { ChatMessage } from "@/app/components/chat/chat-message";
import { EmptyState } from "@/app/components/chat/empty-state";
import { MessageInput } from "@/app/components/chat/message-input";
import { LoadingBanner } from "@/app/components/chat/loading-banner";
import { SearchModal } from "@/app/components/search/search-modal";

export default function Home() {
  const {
    selectedModel,
    setSelectedModel,
    accentColor,
    setAccentColor,
    isSidebarOpen,
    setIsSidebarOpen,
  } = usePreferences();

  const { waitForEngine, isLoading, isCached, downloadProgress, downloadProgressText } =
    useEngine(selectedModel);

  const {
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
    deleteChat: deleteChatOriginal,
    editMessage,
    isStreaming,
    stopGenerating,
  } = useChat(waitForEngine);

  const {
    isEmbeddingReady,
    isIndexing,
    isSearching,
    initEmbeddingEngine,
    embedMessages,
    search,
    cleanupEmbeddings,
  } = useEmbeddings();

  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Auto-embed messages after streaming completes
  useEffect(() => {
    if (!isStreaming && messages.length > 0 && activeChatId) {
      embedMessages(messages, activeChatId);
    }
    // Only run when streaming stops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming]);

  // Cmd/Ctrl+K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => {
          if (!prev) initEmbeddingEngine();
          return !prev;
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleDeleteChat = useCallback(
    (id: string) => {
      deleteChatOriginal(id);
      cleanupEmbeddings(id);
    },
    [deleteChatOriginal, cleanupEmbeddings],
  );

  const handleSearchSelect = useCallback(
    (chatId: string) => {
      selectChat(chatId);
      setIsSearchOpen(false);
    },
    [selectChat],
  );

  const handleSearch = useCallback(
    (query: string) => search(query, history),
    [search, history],
  );

  function handleModelSelect(model: string) {
    if (model !== selectedModel) {
      setSelectedModel(model);
      setIsModelDropdownOpen(false);
    }
  }

  return (
    <div
      className="flex h-screen overflow-hidden bg-[#0a0a0a]"
      style={{ "--accent": accentColor } as React.CSSProperties}
    >
      <Sidebar
        isOpen={isSidebarOpen}
        accent={accentColor}
        history={history}
        activeChatId={activeChatId}
        onNewChat={newChat}
        onSelectChat={selectChat}
        onDeleteChat={handleDeleteChat}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 relative min-w-0">
        <Header
          accent={accentColor}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenSearch={() => {
            initEmbeddingEngine();
            setIsSearchOpen(true);
          }}
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
          {isLoading && (
            <LoadingBanner
              modelName={selectedModel}
              progress={downloadProgress}
              progressText={downloadProgressText}
              isCached={isCached}
              accent={accentColor}
            />
          )}
          {messages.length === 0 && !isLoading ? (
            <EmptyState accent={accentColor} />
          ) : (
            messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                accent={accentColor}
                onEdit={editMessage}
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
          isStreaming={isStreaming}
          onSend={handleSend}
          onStop={stopGenerating}
        />
      </div>

      <SearchModal
        isOpen={isSearchOpen}
        accent={accentColor}
        isSearching={isSearching}
        isIndexing={isIndexing}
        isEmbeddingReady={isEmbeddingReady}
        onSearch={handleSearch}
        onSelectResult={handleSearchSelect}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
}
