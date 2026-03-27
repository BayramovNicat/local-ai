'use client';

import { FileText, X, Loader2 } from 'lucide-react';
import type { Document } from '@/app/types';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentPanel({
  documents,
  isUploading,
  accent,
  onRemove,
}: {
  documents: Document[];
  isUploading: boolean;
  accent: string;
  onRemove: (docId: string) => void;
}) {
  if (documents.length === 0 && !isUploading) return null;

  return (
    <div className="flex flex-wrap gap-2 px-3 pt-3 pb-1">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="group flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 py-1.5 pr-1.5 pl-2.5 text-xs text-neutral-300 shadow-sm transition-colors hover:border-neutral-600"
        >
          <FileText size={13} style={{ color: accent }} className="shrink-0" />
          <span className="max-w-32 truncate">{doc.name}</span>
          <span className="text-neutral-600">{formatSize(doc.size)}</span>
          <button
            onClick={() => onRemove(doc.id)}
            className="cursor-pointer rounded p-0.5 text-neutral-500 opacity-0 transition-colors group-hover:opacity-100 hover:text-red-400"
          >
            <X size={12} />
          </button>
        </div>
      ))}
      {isUploading && (
        <div className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 text-xs text-neutral-500 shadow-sm">
          <Loader2 size={13} className="spinner" style={{ color: accent }} />
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
}
