"use client";

import { useRef, useEffect } from "react";
import { Send, Paperclip, X, Square } from "lucide-react";
import { Tooltip } from "../ui/tooltip";
import { DocumentPanel } from "./document-panel";
import type { Attachment, Document } from "@/app/types";
import { SUPPORTED_DOC_TYPES } from "@/app/data/constants";

export function MessageInput({
  input,
  setInput,
  attachments,
  setAttachments,
  accent,
  isStreaming,
  onSend,
  onStop,
  onUpload,
  documents,
  isUploading,
  onRemoveDocument,
  activeChatId,
  isCentered = false,
}: {
  input: string;
  setInput: (v: string) => void;
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  accent: string;
  isStreaming: boolean;
  onSend: () => void;
  onStop: () => void;
  onUpload: (files: File[]) => void;
  documents: Document[];
  isUploading: boolean;
  onRemoveDocument: (docId: string) => void;
  activeChatId: string | null;
  isCentered?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasContent = input.trim() || attachments.length > 0;

  // Sync state to editor (for editing messages)
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerText !== input) {
      editorRef.current.innerText = input;
    }
  }, [input]);

  // Auto-focus logic
  useEffect(() => {
    // Focus on mount and whenever chat context changes
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, [activeChatId, isCentered]);

  return (
    <div
      className={`p-3 sm:p-4 transition-all duration-300 ease-in-out ${
        isCentered ? "bg-transparent" : "bg-[#0a0a0a]/40 backdrop-blur-md"
      }`}
    >
      <div
        className={`max-w-4xl mx-auto transition-all duration-300 ease-in-out ${
          isCentered ? "scale-[1.02]" : "scale-100"
        }`}
      >
        <div
          className="rounded-xl border border-neutral-700 transition-colors bg-[#0a0a0a]"
          style={{ borderColor: hasContent ? `${accent}4D` : undefined }}
        >
          <DocumentPanel
            documents={documents}
            isUploading={isUploading}
            accent={accent}
            onRemove={onRemoveDocument}
          />
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-3">
              {attachments.map((att) => (
                <div key={att.id} className="relative group/att">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={att.url}
                    alt={att.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <button
                    onClick={() =>
                      setAttachments((prev) =>
                        prev.filter((a) => a.id !== att.id),
                      )
                    }
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-opacity cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2 p-2">
            <Tooltip
              content="Attach files"
              position="top"
              className="inline-block"
            >
              <button
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 p-2 rounded-lg text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
              >
                <Paperclip size={18} />
              </button>
            </Tooltip>
            <input
              ref={fileInputRef}
              id="file-upload"
              name="file-upload"
              type="file"
              accept={`image/*,${SUPPORTED_DOC_TYPES}`}
              multiple
              className="hidden"
              onChange={(e) => {
                if (!e.target.files) return;
                onUpload(Array.from(e.target.files));
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
              className="flex-1 min-h-20 max-h-50 overflow-y-auto text-sm text-neutral-200 focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-500 [&_img]:max-w-full [&_img]:max-h-75 [&_img]:rounded-lg [&_img]:my-1"
              onInput={() => setInput(editorRef.current?.innerText || "")}
              onPaste={async (e) => {
                const items = e.clipboardData?.items;
                if (!items) return;

                const hasFiles = Array.from(items).some(
                  (i) => i.kind === "file",
                );
                if (hasFiles) {
                  e.preventDefault();
                  const files: File[] = [];
                  for (const item of Array.from(items)) {
                    const file = item.getAsFile();
                    if (file) files.push(file);
                  }
                  if (files.length > 0) onUpload(files);
                } else {
                  e.preventDefault();
                  const text = e.clipboardData.getData("text/plain");
                  document.execCommand("insertText", false, text);
                }
              }}
              onDrop={async (e) => {
                e.preventDefault();
                if (!e.dataTransfer?.files) return;
                onUpload(Array.from(e.dataTransfer.files));
              }}
              onDragOver={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!isStreaming) {
                    onSend();
                  }
                }
              }}
            />
            {isStreaming ? (
              <Tooltip
                content="Stop generation"
                position="top"
                className="inline-block"
              >
                <button
                  onClick={onStop}
                  className="shrink-0 p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
                >
                  <Square size={18} fill="currentColor" />
                </button>
              </Tooltip>
            ) : (
              <Tooltip
                content="Send message"
                position="top"
                className="inline-block"
              >
                <button
                  onClick={() => {
                    onSend();
                  }}
                  disabled={!hasContent}
                  className={`shrink-0 p-2 rounded-lg transition-all cursor-pointer ${
                    hasContent
                      ? "text-black"
                      : "text-neutral-600 cursor-not-allowed"
                  }`}
                  style={hasContent ? { backgroundColor: accent } : undefined}
                >
                  <Send size={18} />
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
