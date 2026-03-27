'use client';

import { useRef, useEffect } from 'react';
import { Send, Paperclip, X, Square } from 'lucide-react';
import { Tooltip } from '../ui/tooltip';
import { DocumentPanel } from './document-panel';
import type { Attachment, Document } from '@/app/types';
import { SUPPORTED_DOC_TYPES } from '@/app/data/constants';

export function MessageInput({
  input,
  setInput,
  attachments,
  onRemoveAttachment,
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
  onRemoveAttachment: (id: string) => void;
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

  // Sync state to editor
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
      className={`p-3 transition-all duration-300 ease-in-out sm:p-4 ${
        isCentered ? 'bg-transparent' : 'bg-[#0a0a0a]/40 backdrop-blur-md'
      }`}
    >
      <div
        className={`mx-auto max-w-4xl transition-all duration-300 ease-in-out ${
          isCentered ? 'scale-[1.02]' : 'scale-100'
        }`}
      >
        <div
          className="rounded-xl border border-neutral-700 bg-[#0a0a0a] transition-colors"
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
                <div key={att.id} className="group/att relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={att.url} alt={att.name} className="h-16 w-16 rounded-lg object-cover" />
                  <button
                    onClick={() => onRemoveAttachment(att.id)}
                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-neutral-800 text-neutral-400 opacity-0 transition-opacity group-hover/att:opacity-100 hover:text-white"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2 p-2">
            <Tooltip content="Attach files" position="top" className="inline-block">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 cursor-pointer rounded-lg p-2 text-neutral-500 transition-colors hover:text-neutral-300"
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
                e.target.value = '';
              }}
            />
            <div
              ref={editorRef}
              id="message-input"
              role="textbox"
              contentEditable
              aria-label="Message input"
              data-placeholder="Message local.ai..."
              className="max-h-50 min-h-20 flex-1 overflow-y-auto text-sm text-neutral-200 empty:before:text-neutral-500 empty:before:content-[attr(data-placeholder)] focus:outline-none [&_img]:my-1 [&_img]:max-h-75 [&_img]:max-w-full [&_img]:rounded-lg"
              onInput={() => setInput(editorRef.current?.innerText || '')}
              onPaste={async (e) => {
                const items = e.clipboardData?.items;
                if (!items) return;

                const hasFiles = Array.from(items).some((i) => i.kind === 'file');
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
                  const text = e.clipboardData.getData('text/plain');
                  document.execCommand('insertText', false, text);
                }
              }}
              onDrop={async (e) => {
                e.preventDefault();
                if (!e.dataTransfer?.files) return;
                onUpload(Array.from(e.dataTransfer.files));
              }}
              onDragOver={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isStreaming) {
                    onSend();
                  }
                }
              }}
            />
            {isStreaming ? (
              <Tooltip content="Stop generation" position="top" className="inline-block">
                <button
                  onClick={onStop}
                  className="shrink-0 cursor-pointer rounded-lg p-2 text-neutral-400 transition-all hover:bg-neutral-800 hover:text-white"
                >
                  <Square size={18} fill="currentColor" />
                </button>
              </Tooltip>
            ) : (
              <Tooltip content="Send message" position="top" className="inline-block">
                <button
                  onClick={() => {
                    onSend();
                  }}
                  disabled={!hasContent}
                  className={`shrink-0 cursor-pointer rounded-lg p-2 transition-all ${
                    hasContent ? 'text-black' : 'cursor-not-allowed text-neutral-600'
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
