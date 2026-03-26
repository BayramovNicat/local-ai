"use client";

import { useRef } from "react";
import { Send, Paperclip, X } from "lucide-react";
import type { Attachment } from "@/app/types";
import { processFiles, processPasteItems } from "@/app/hooks/use-file-handler";

export function MessageInput({
  input,
  setInput,
  attachments,
  setAttachments,
  accent,
  onSend,
}: {
  input: string;
  setInput: (v: string) => void;
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  accent: string;
  onSend: () => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasContent = input.trim() || attachments.length > 0;

  return (
    <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-[#0a0a0a]/40 backdrop-blur-md z-10">
      <div className="max-w-3xl mx-auto">
        <div
          className="rounded-xl border border-neutral-700 transition-colors"
          style={{ borderColor: hasContent ? `${accent}4D` : undefined }}
        >
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
              onChange={async (e) => {
                if (!e.target.files) return;
                const newAtts = await processFiles(e.target.files);
                setAttachments((prev) => [...prev, ...newAtts]);
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
              className="flex-1 min-h-7 max-h-50 overflow-y-auto text-sm text-neutral-200 focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-500 [&_img]:max-w-full [&_img]:max-h-75 [&_img]:rounded-lg [&_img]:my-1"
              onInput={() => setInput(editorRef.current?.textContent || "")}
              onPaste={async (e) => {
                const items = e.clipboardData?.items;
                if (!items) return;

                const hasImage = Array.from(items).some((i) =>
                  i.type.startsWith("image/"),
                );
                if (hasImage) {
                  e.preventDefault();
                  const newAtts = await processPasteItems(items);
                  setAttachments((prev) => [...prev, ...newAtts]);
                } else {
                  e.preventDefault();
                  const text = e.clipboardData.getData("text/plain");
                  document.execCommand("insertText", false, text);
                }
              }}
              onDrop={async (e) => {
                e.preventDefault();
                if (!e.dataTransfer?.files) return;
                const newAtts = await processFiles(e.dataTransfer.files);
                setAttachments((prev) => [...prev, ...newAtts]);
              }}
              onDragOver={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                  if (editorRef.current) editorRef.current.textContent = "";
                }
              }}
            />
            <button
              onClick={() => {
                onSend();
                if (editorRef.current) editorRef.current.textContent = "";
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
          </div>
        </div>
      </div>
    </div>
  );
}
