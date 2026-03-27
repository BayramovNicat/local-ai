'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Pencil } from 'lucide-react';
import type { Message } from '@/app/types';
import { CopyButton } from '@/app/components/ui/copy-button';
import { CodeBlock } from './code-block';
import { LoadingDots } from './loading-dots';

export const ChatMessage = memo(function ChatMessage({
  message,
  onEdit,
}: {
  message: Message;
  onEdit?: (id: string) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`group flex ${isUser ? 'justify-end' : 'justify-start'}`}
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: 'auto 100px',
      }}
    >
      <div className={`flex w-full max-w-full flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`overflow-hidden rounded-2xl px-4 py-3 break-all ${isUser ? 'border text-white' : 'text-neutral-200'}`}
          style={
            isUser
              ? { borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)' }
              : undefined
          }
        >
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {message.attachments.map((att) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={att.id}
                  src={att.url}
                  alt={att.name}
                  className="max-h-37.5 max-w-50 rounded-lg object-cover"
                />
              ))}
            </div>
          )}
          {isUser ? (
            <p className="text-sm leading-relaxed">{message.content}</p>
          ) : message.content === '' ? (
            <LoadingDots />
          ) : (
            <div className="prose-chat text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ pre: CodeBlock }}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        <div className="mt-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <CopyButton text={message.content} />
          {isUser && onEdit && (
            <button
              onClick={() => onEdit(message.id)}
              className="cursor-pointer rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-300"
            >
              <Pencil size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
