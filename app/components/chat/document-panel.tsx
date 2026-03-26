"use client";

import { FileText, X, Loader2 } from "lucide-react";
import type { Document } from "@/app/types";

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
          className="group flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-lg border border-neutral-700 bg-neutral-900 text-xs text-neutral-300 transition-colors hover:border-neutral-600 shadow-sm"
        >
          <FileText size={13} style={{ color: accent }} className="shrink-0" />
          <span className="truncate max-w-32">{doc.name}</span>
          <span className="text-neutral-600">{formatSize(doc.size)}</span>
          <button
            onClick={() => onRemove(doc.id)}
            className="p-0.5 rounded text-neutral-500 hover:text-red-400 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
          >
            <X size={12} />
          </button>
        </div>
      ))}
      {isUploading && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-neutral-700 bg-neutral-900 text-xs text-neutral-500 shadow-sm">
          <Loader2 size={13} className="spinner" style={{ color: accent }} />
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
}
