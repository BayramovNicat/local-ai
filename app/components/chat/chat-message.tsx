"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Pencil } from "lucide-react";
import type { Message } from "@/app/types";
import { CopyButton } from "@/app/components/ui/copy-button";
import { CodeBlock } from "./code-block";

export function ChatMessage({
  message,
  accent,
  onEdit,
}: {
  message: Message;
  accent: string;
  onEdit?: (id: string) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`group flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex flex-col w-full max-w-full ${isUser ? "items-end" : "items-start"}`}
      >
        <div
          className={`rounded-2xl px-4 py-3 break-all overflow-hidden ${isUser ? "text-white border" : "text-neutral-200"}`}
          style={isUser ? { borderColor: `${accent}4D` } : undefined}
        >
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {message.attachments.map((att) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={att.id}
                  src={att.url}
                  alt={att.name}
                  className="max-w-50 max-h-37.5 rounded-lg object-cover"
                />
              ))}
            </div>
          )}
          {isUser ? (
            <p className="text-sm leading-relaxed">{message.content}</p>
          ) : (
            <div className="prose-chat text-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{ pre: CodeBlock }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        <div className="flex gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <CopyButton text={message.content} />
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
