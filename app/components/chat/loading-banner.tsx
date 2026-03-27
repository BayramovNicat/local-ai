"use client";

import { AlertCircle } from "lucide-react";

export function LoadingBanner({
  modelName,
  progress,
  progressText,
  isCached,
  accent,
  error,
}: {
  modelName: string;
  progress: number;
  progressText?: string;
  isCached?: boolean;
  accent: string;
  error?: string | null;
}) {
  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-3 pt-20 pb-4 sm:px-4 md:px-6">
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-red-200">Model Initialization Error</p>
            <p className="text-sm leading-relaxed text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-3 pt-20 pb-4 sm:px-4 md:px-6">
      <div className="space-y-3 rounded-xl border border-neutral-800/50 p-4">
        <div className="flex items-center gap-3">
          <div
            className="spinner h-5 w-5 shrink-0 rounded-full border-2"
            style={{ borderColor: `${accent}4D`, borderTopColor: accent }}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-neutral-200">
              {isCached ? "Loading" : "Downloading"} {modelName}
            </p>
            <p className="truncate text-xs text-neutral-500">
              {progressText || "Preparing model..."}
            </p>
          </div>
          <span className="ml-auto shrink-0 font-mono text-xs" style={{ color: accent }}>
            {progress}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%`, backgroundColor: accent }}
          />
        </div>
      </div>
    </div>
  );
}
