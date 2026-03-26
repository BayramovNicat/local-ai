"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  MessageSquare,
  Send,
  ChevronDown,
  Plus,
  Menu,
  X,
  Bot,
  Trash2,
  Palette,
  Copy,
  Check,
  Pencil,
  Paperclip,
  ImageIcon,
  X as XIcon,
} from "lucide-react";

const accentPresets = [
  { name: "Neon Green", hex: "#22C55E" },
  { name: "Electric Blue", hex: "#00D4FF" },
  { name: "Purple", hex: "#A855F7" },
  { name: "Hot Pink", hex: "#FF2D78" },
  { name: "Amber", hex: "#FBBF24" },
  { name: "Coral", hex: "#FF6B6B" },
  { name: "Cyan", hex: "#22D3EE" },
  { name: "Mint", hex: "#34D399" },
  { name: "Ice Blue", hex: "#60A5FA" },
  { name: "Orange", hex: "#FB923C" },
  { name: "Rose", hex: "#F43F5E" },
  { name: "Lime", hex: "#84CC16" },
];

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockModels = ["TinyLlama 1.1B", "Qwen 2.5 7B", "Phi-3 Mini"];

const mockHistory = [
  "Explain quantum computing",
  "Python sorting algorithms",
  "How does TCP/IP work?",
  "Write a React hook",
  "Database indexing strategies",
];

const mockMessages: Message[] = [
  {
    id: "1",
    role: "user",
    content: "Can you show me how to write a binary search in Python?",
  },
  {
    id: "2",
    role: "assistant",
    content: `Sure! Here's a clean implementation of **binary search** in Python:

\`\`\`python
def binary_search(arr: list[int], target: int) -> int:
    low, high = 0, len(arr) - 1

    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1

    return -1  # not found
\`\`\`

### Key Points

- **Time complexity**: \`O(log n)\` — much faster than linear search
- **Space complexity**: \`O(1)\` for the iterative version
- The input array **must be sorted**

### When to use it

1. Searching in a **sorted array** or list
2. Finding boundaries (e.g., first/last occurrence)
3. Problems involving **monotonic functions**

> Binary search is one of the most fundamental algorithms — make sure you can write it from memory!`,
  },
  {
    id: "3",
    role: "user",
    content: "What about a recursive version?",
  },
  {
    id: "4",
    role: "assistant",
    content: `Here's the **recursive** version:

\`\`\`python
def binary_search_recursive(arr, target, low=0, high=None):
    if high is None:
        high = len(arr) - 1

    if low > high:
        return -1

    mid = (low + high) // 2

    if arr[mid] == target:
        return mid
    elif arr[mid] < target:
        return binary_search_recursive(arr, target, mid + 1, high)
    else:
        return binary_search_recursive(arr, target, low, mid - 1)
\`\`\`

| Aspect | Iterative | Recursive |
|--------|-----------|-----------|
| Space | \`O(1)\` | \`O(log n)\` stack |
| Speed | Slightly faster | Same big-O |
| Readability | Loop-based | More elegant |

Most production code uses the **iterative** version to avoid stack overflow on large inputs. Python's default recursion limit is \`1000\`, so for arrays larger than ~1000 elements the recursive version can fail without \`sys.setrecursionlimit()\`.`,
  },
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface Attachment {
  id: string;
  type: "image";
  url: string;
  name: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
}

// ─── Code Block with Copy ────────────────────────────────────────────────────

function CodeBlock({ children, ...props }: React.ComponentProps<"pre">) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const code = (children as React.ReactElement)?.props?.children || "";
    navigator.clipboard.writeText(String(code).trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative group/code">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700/50 transition-all cursor-pointer opacity-0 group-hover/code:opacity-100"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
      <pre {...props}>{children}</pre>
    </div>
  );
}

// ─── Chat Message Component ─────────────────────────────────────────────────

function ChatMessage({ message, accent, onEdit }: { message: Message; accent: string; onEdit?: (id: string) => void }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={`group flex ${isUser ? "justify-end" : ""}`}>
      <div className={`flex flex-col max-w-[90%] sm:max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser ? "text-white border" : "text-neutral-200"
          }`}
          style={isUser ? { borderColor: `${accent}4D` } : undefined}
        >
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {message.attachments.map((att) => (
                <img
                  key={att.id}
                  src={att.url}
                  alt={att.name}
                  className="max-w-[200px] max-h-[150px] rounded-lg object-cover"
                />
              ))}
            </div>
          )}
          {isUser ? (
            <p className="text-sm leading-relaxed">{message.content}</p>
          ) : (
            <div className="prose-chat text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ pre: CodeBlock }}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        <div className="flex gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
          {isUser && onEdit && (
            <button
              onClick={() => onEdit(message.id)}
              className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <Pencil size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Download Overlay ────────────────────────────────────────────────────────

function DownloadOverlay({
  modelName,
  progress,
  accent,
}: {
  modelName: string;
  progress: number;
  accent: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="flex flex-col items-center gap-6 p-8 rounded-2xl w-[90%] max-w-md">
        <div
          className="w-12 h-12 rounded-full border-2 spinner"
          style={{ borderColor: `${accent}4D`, borderTopColor: accent }}
        />

        <div className="text-center space-y-1">
          <p className="text-lg font-semibold text-white">
            Downloading {modelName}
          </p>
          <p className="text-sm text-neutral-400">
            {progress < 100
              ? "Preparing model for local inference..."
              : "Almost ready..."}
          </p>
        </div>

        <div className="w-full space-y-2">
          <div className="w-full h-3 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300 ease-out neon-glow"
              style={{ width: `${progress}%`, backgroundColor: accent }}
            />
          </div>
          <p className="text-center text-sm font-mono" style={{ color: accent }}>
            {progress}%
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState(mockModels[0]);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [history, setHistory] = useState(mockHistory);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [accentColor, setAccentColor] = useState(accentPresets[0].hex);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const simulateDownload = useCallback(() => {
    setIsDownloading(true);
    setDownloadProgress(0);
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
  }, []);

  // Simulate initial download on mount
  useEffect(() => {
    simulateDownload();
  }, [simulateDownload]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsModelDropdownOpen(false);
        setModelSearch("");
      }
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(e.target as Node)
      ) {
        setIsColorPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleModelSelect(model: string) {
    setSelectedModel(model);
    setIsModelDropdownOpen(false);
    simulateDownload();
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

    const attachmentNote = attachments.length > 0 ? `\n\n*${attachments.length} image(s) attached.*` : "";
    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: `I received your message: *"${text || "(no text)"}"*${attachmentNote}\n\nThis is a **mock response** from \`${selectedModel}\`. In a real setup, the model would generate a response locally on your machine.`,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setAttachments([]);
    if (editorRef.current) editorRef.current.textContent = "";
  }

  function handleNewChat() {
    setMessages([]);
    setActiveChat(null);
  }

  function handleDeleteHistory(index: number) {
    setHistory((prev) => prev.filter((_, i) => i !== index));
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

      <div className="flex h-screen overflow-hidden bg-[#0a0a0a]" style={{ "--accent": accentColor } as React.CSSProperties}>
        {/* Sidebar Backdrop (mobile) */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-0"
          } fixed md:relative z-30 md:z-auto w-72 h-full transition-all duration-300 flex flex-col bg-[#0a0a0a] ${
            isSidebarOpen ? "overflow-hidden" : "md:w-0 md:overflow-hidden"
          }`}
        >
          <div className="p-4">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-colors text-sm font-medium cursor-pointer border"
              style={{ borderColor: `${accentColor}4D`, color: accentColor }}
            >
              <Plus size={16} />
              New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <p className="px-2 py-1 text-xs font-medium text-neutral-500 uppercase tracking-wider">
              History
            </p>
            {history.map((title, i) => (
              <div
                key={i}
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm border ${
                  activeChat === title
                    ? ""
                    : "border-transparent text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
                }`}
                style={activeChat === title ? { borderColor: `${accentColor}4D`, color: "#ffffff" } : undefined}
                onClick={() => setActiveChat(title)}
              >
                <MessageSquare size={14} className="shrink-0" />
                <span className="truncate flex-1">{title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteHistory(i);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-500 hover:text-red-400 cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Area */}
        <div className="flex-1 relative min-w-0">
          {/* Header */}
          <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 sm:px-4 py-3 bg-[#0a0a0a]/40 backdrop-blur-md z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors cursor-pointer"
              >
                {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
              </button>

              <h1 className="text-base font-semibold text-white tracking-tight">
                local<span style={{ color: accentColor }}>.ai</span>
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Color Picker */}
              <div className="relative" ref={colorPickerRef}>
                <button
                  onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                  className="p-2 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                  style={{ color: accentColor }}
                >
                  <Palette size={18} />
                </button>

                {isColorPickerOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-[#0a0a0a] shadow-2xl shadow-black/50 z-40 border border-neutral-800/50 p-2 space-y-2">
                    <div className="grid grid-cols-4 gap-1.5">
                      {accentPresets.map((preset) => (
                        <button
                          key={preset.hex}
                          onClick={() => {
                            setAccentColor(preset.hex);
                            setIsColorPickerOpen(false);
                          }}
                          className="w-8 h-8 rounded-lg cursor-pointer transition-transform hover:scale-110 border-2"
                          style={{
                            backgroundColor: preset.hex,
                            borderColor: accentColor === preset.hex ? "#ffffff" : "transparent",
                          }}
                          title={preset.name}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent"
                      />
                      <span className="text-xs text-neutral-400 font-mono">{accentColor}</span>
                    </div>
                  </div>
                )}
              </div>

            {/* Model Selector */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-700 hover:border-neutral-500 transition-colors text-sm cursor-pointer max-w-[180px] sm:max-w-none"
              >
                <Bot size={14} style={{ color: accentColor }} />
                <span className="text-neutral-200 truncate">{selectedModel}</span>
                <ChevronDown
                  size={14}
                  className={`text-neutral-400 transition-transform ${
                    isModelDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isModelDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-[#0a0a0a] shadow-2xl shadow-black/50 z-40 border border-neutral-800/50 p-2 space-y-1">
                  <input
                    id="model-search"
                    name="model-search"
                    type="text"
                    placeholder="Search models..."
                    autoFocus
                    className="w-full px-3 py-2 text-sm bg-transparent rounded-lg text-neutral-200 placeholder-neutral-500 focus:outline-none"
                    onChange={(e) => setModelSearch(e.target.value)}
                    value={modelSearch}
                  />
                  {mockModels.filter((m) => m.toLowerCase().includes(modelSearch.toLowerCase())).map((model) => (
                    <button
                      key={model}
                      onClick={() => handleModelSelect(model)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer rounded-lg border ${
                        model === selectedModel
                          ? ""
                          : "border-transparent text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
                      }`}
                      style={model === selectedModel ? { borderColor: `${accentColor}4D`, color: "#ffffff" } : undefined}
                    >
                      {model}
                      {model === selectedModel && (
                        <span className="ml-2 text-xs text-neutral-500">
                          active
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            </div>
          </header>

          {/* Messages */}
          <main className="absolute inset-0 overflow-y-auto px-3 sm:px-4 md:px-6 pt-16 pb-28 space-y-6">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${accentColor}1A` }}>
                  <Bot size={32} style={{ color: accentColor }} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    local<span style={{ color: accentColor }}>.ai</span>
                  </h2>
                  <p className="text-sm text-neutral-500 mt-1">
                    Your private AI, running entirely on your machine.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  accent={accentColor}
                  onEdit={(id) => {
                    const msg = messages.find((m) => m.id === id);
                    if (msg) setInput(msg.content);
                  }}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </main>

          {/* Input */}
          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-[#0a0a0a]/40 backdrop-blur-md z-10">
            <div className="max-w-3xl mx-auto">
              <div
                className="rounded-xl border border-neutral-700 transition-colors"
                style={{ borderColor: (input.trim() || attachments.length > 0) ? `${accentColor}4D` : undefined }}
              >
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-3 pt-3">
                    {attachments.map((att) => (
                      <div key={att.id} className="relative group/att">
                        <img
                          src={att.url}
                          alt={att.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <button
                          onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-opacity cursor-pointer"
                        >
                          <XIcon size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2 p-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="shrink-0 p-2 rounded-lg text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                  >
                    <Paperclip size={18} />
                  </button>
                  <input
                    ref={fileInputRef}
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (!files) return;
                      Array.from(files).forEach((file) => {
                        if (!file.type.startsWith("image/")) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          setAttachments((prev) => [
                            ...prev,
                            { id: `${Date.now()}-${file.name}`, type: "image", url: reader.result as string, name: file.name },
                          ]);
                        };
                        reader.readAsDataURL(file);
                      });
                      e.target.value = "";
                    }}
                  />
                  <div
                    ref={editorRef}
                    id="message-input"
                    role="textbox"
                    contentEditable
                    aria-label="Message input"
                    data-placeholder="Message local.ai..."
                    className="flex-1 min-h-[28px] max-h-[200px] overflow-y-auto text-sm text-neutral-200 focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-500 [&_img]:max-w-full [&_img]:max-h-[300px] [&_img]:rounded-lg [&_img]:my-1"
                    onInput={() => {
                      const text = editorRef.current?.textContent || "";
                      setInput(text);
                    }}
                    onPaste={(e) => {
                      const items = e.clipboardData?.items;
                      if (!items) return;

                      let hasImage = false;
                      Array.from(items).forEach((item) => {
                        if (item.type.startsWith("image/")) {
                          hasImage = true;
                          e.preventDefault();
                          const file = item.getAsFile();
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            setAttachments((prev) => [
                              ...prev,
                              { id: `${Date.now()}-paste`, type: "image", url: reader.result as string, name: "pasted-image.png" },
                            ]);
                          };
                          reader.readAsDataURL(file);
                        }
                      });

                      if (!hasImage) {
                        e.preventDefault();
                        const text = e.clipboardData.getData("text/plain");
                        document.execCommand("insertText", false, text);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const files = e.dataTransfer?.files;
                      if (!files) return;
                      Array.from(files).forEach((file) => {
                        if (!file.type.startsWith("image/")) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          setAttachments((prev) => [
                            ...prev,
                            { id: `${Date.now()}-${file.name}`, type: "image", url: reader.result as string, name: file.name },
                          ]);
                        };
                        reader.readAsDataURL(file);
                      });
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() && attachments.length === 0}
                    className={`shrink-0 p-2 rounded-lg transition-all cursor-pointer ${
                      input.trim() || attachments.length > 0
                        ? "text-black"
                        : "text-neutral-600 cursor-not-allowed"
                    }`}
                    style={input.trim() || attachments.length > 0 ? { backgroundColor: accentColor } : undefined}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
