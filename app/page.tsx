'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ACCENT_PRESETS, AVAILABLE_MODELS } from '@/app/data/constants';
import { useEngine } from '@/app/hooks/use-engine';
import { usePreferences } from '@/app/hooks/use-preferences';
import { useChat } from '@/app/hooks/use-chat';
import { useEmbeddings } from '@/app/hooks/use-embeddings';
import { useRag } from '@/app/hooks/use-rag';
import { Sidebar } from '@/app/components/sidebar/sidebar';
import { Header } from '@/app/components/header/header';
import { MessageList } from '@/app/components/chat/message-list';
import { EmptyState } from '@/app/components/chat/empty-state';
import { MessageInput } from '@/app/components/chat/message-input';
import { LoadingBanner } from '@/app/components/chat/loading-banner';
import { SearchModal } from '@/app/components/search/search-modal';
import { processFiles } from '@/app/hooks/use-file-handler';
import { SUPPORTED_DOC_TYPES } from '@/app/data/constants';

export default function Home() {
  const {
    selectedModel,
    setSelectedModel,
    accentColor,
    setAccentColor,
    isSidebarOpen,
    setIsSidebarOpen,
  } = usePreferences();

  const {
    waitForEngine,
    isLoading,
    isCached,
    downloadProgress,
    downloadProgressText,
    error: engineError,
  } = useEngine(selectedModel);

  const {
    isEmbeddingReady,
    isIndexing,
    isSearching,
    initEmbeddingEngine,
    getEmbeddingEngine,
    getEmbeddingEngineIfReady,
    embedMessages,
    search,
    cleanupEmbeddings,
    callWorker,
    saveEmbeddingsWithSync,
  } = useEmbeddings();

  const {
    documents,
    isUploading,
    loadDocuments,
    uploadDocument,
    getContext,
    removeDocument,
    cleanupDocuments,
  } = useRag(
    getEmbeddingEngine,
    getEmbeddingEngineIfReady,
    initEmbeddingEngine,
    callWorker,
    selectedModel,
    saveEmbeddingsWithSync,
  );

  const {
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
    selectChat,
    deleteChat: deleteChatOriginal,
    createChat,
    removeAttachment,
    isStreaming,
    stopGenerating,
  } = useChat(waitForEngine, getContext);

  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Advanced Animation Logic
  const [[prevChatId, prevMsgCount], setPrev] = useState([activeChatId, messages.length]);

  const isFirstMsg = prevMsgCount === 0 && messages.length > 0;

  if (prevChatId !== activeChatId || prevMsgCount !== messages.length) {
    setPrev([activeChatId, messages.length]);
  }

  // Load documents when active chat changes
  useEffect(() => {
    loadDocuments(activeChatId || '');
  }, [activeChatId, loadDocuments]);

  // Auto-embed messages after streaming completes
  const lastEmbedRef = useRef({ chatId: '', count: 0 });
  useEffect(() => {
    if (!isStreaming && messages.length > 0 && activeChatId) {
      const last = lastEmbedRef.current;
      if (last.chatId === activeChatId && last.count === messages.length) return;
      lastEmbedRef.current = { chatId: activeChatId, count: messages.length };
      embedMessages(messages, activeChatId);
    }
  }, [isStreaming, messages, activeChatId, embedMessages]);

  // Global Shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;
      const key = e.key.toLowerCase();

      if (isMod && isShift) {
        switch (key) {
          case 'k':
            e.preventDefault();
            initEmbeddingEngine();
            setIsSearchOpen((prev) => !prev);
            break;
          case 'o':
            e.preventDefault();
            newChat();
            break;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [newChat, initEmbeddingEngine]);

  const handleDeleteChat = useCallback(
    (id: string) => {
      deleteChatOriginal(id);
      cleanupEmbeddings(id);
      cleanupDocuments(id);
    },
    [deleteChatOriginal, cleanupEmbeddings, cleanupDocuments],
  );

  const handleSearchSelect = useCallback(
    (chatId: string) => {
      selectChat(chatId);
      setIsSearchOpen(false);
    },
    [selectChat],
  );

  const handleSearch = useCallback((query: string) => search(query, history), [search, history]);

  const handleUpload = useCallback(
    async (files: File[]) => {
      let chatId = activeChatId;
      if (!chatId) {
        const result = await createChat();
        chatId = result.id;
      }

      const imageFiles: File[] = [];
      const docFiles: File[] = [];

      const docExts = SUPPORTED_DOC_TYPES.split(',').map((ext) => ext.trim().toLowerCase());

      for (const file of files) {
        const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
        if (file.type.startsWith('image/')) {
          imageFiles.push(file);
        } else if (docExts.includes(ext)) {
          docFiles.push(file);
        }
      }

      // Handle images
      if (imageFiles.length > 0) {
        const newAtts = await processFiles(imageFiles);
        setAttachments((prev) => [...prev, ...newAtts]);
      }

      // Handle documents (sequential upload for safety)
      for (const doc of docFiles) {
        await uploadDocument(doc, chatId);
      }
    },
    [activeChatId, createChat, uploadDocument, setAttachments],
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
      style={{ '--accent': accentColor } as React.CSSProperties}
    >
      <Sidebar
        isOpen={isSidebarOpen}
        history={history}
        activeChatId={activeChatId}
        onNewChat={newChat}
        onSelectChat={selectChat}
        onDeleteChat={handleDeleteChat}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="relative min-w-0 flex-1">
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
          onToggleModelDropdown={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
          models={AVAILABLE_MODELS}
          selectedModel={selectedModel}
          onSelectModel={handleModelSelect}
        />

        <main
          ref={scrollContainerRef as React.RefObject<HTMLElement>}
          className={`absolute inset-0 overflow-y-auto pt-16 pb-28 ${messages.length === 0 ? 'flex items-center justify-center' : ''}`}
        >
          <div
            className={`mx-auto max-w-4xl px-4 sm:px-6 md:px-8 ${messages.length === 0 ? '' : 'space-y-6'}`}
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            aria-atomic="false"
          >
            {isLoading && (
              <LoadingBanner
                modelName={selectedModel}
                progress={downloadProgress}
                progressText={downloadProgressText}
                isCached={isCached}
                accent={accentColor}
                error={engineError}
              />
            )}
            {messages.length === 0 && !isLoading ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <EmptyState accent={accentColor} />
              </div>
            ) : (
              <>
                <MessageList messages={messages} scrollContainerRef={scrollContainerRef} />
                {isStreaming &&
                  messages.length > 0 &&
                  messages[messages.length - 1].role === 'assistant' &&
                  !messages[messages.length - 1].content && (
                    <div className="animate-in fade-in flex justify-start duration-300">
                      <div className="flex items-center gap-2 rounded-2xl bg-neutral-900/50 px-4 py-3 text-xs text-neutral-400 italic">
                        <span>AI is thinking</span>
                        <div className="flex gap-1">
                          <span className="h-1 w-1 animate-bounce rounded-full bg-neutral-500 [animation-delay:-0.3s]"></span>
                          <span className="h-1 w-1 animate-bounce rounded-full bg-neutral-500 [animation-delay:-0.15s]"></span>
                          <span className="h-1 w-1 animate-bounce rounded-full bg-neutral-500"></span>
                        </div>
                      </div>
                    </div>
                  )}
              </>
            )}
          </div>
        </main>

        <div
          className={`absolute right-0 left-0 z-20 ${
            messages.length > 0
              ? `${isFirstMsg ? 'transition-all duration-300 ease-in-out' : ''} bottom-0`
              : 'top-1/2 translate-y-24'
          } pointer-events-auto`}
        >
          <MessageInput
            input={input}
            setInput={setInput}
            attachments={attachments}
            onRemoveAttachment={removeAttachment}
            accent={accentColor}
            isStreaming={isStreaming}
            onSend={handleSend}
            onStop={stopGenerating}
            onUpload={handleUpload}
            documents={documents}
            isUploading={isUploading}
            onRemoveDocument={removeDocument}
            activeChatId={activeChatId}
            isCentered={messages.length === 0 && !isLoading}
          />
        </div>
      </div>
      <SearchModal
        key={isSearchOpen ? 'open' : 'closed'}
        isOpen={isSearchOpen}
        accent={accentColor}
        isSearching={isSearching}
        isIndexing={isIndexing}
        isEmbeddingReady={isEmbeddingReady}
        onSearch={handleSearch}
        onSelectResult={handleSearchSelect}
        onClose={() => setIsSearchOpen(false)}
      />{' '}
    </div>
  );
}
