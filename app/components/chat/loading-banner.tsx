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
      <div className="mx-auto max-w-3xl px-3 sm:px-4 md:px-6 pt-20 pb-4">
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-red-200">
              Model Initialization Error
            </p>
            <p className="text-sm text-red-400 leading-relaxed">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-4 md:px-6 pt-20 pb-4">
      <div className="rounded-xl border border-neutral-800/50 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div
            className="w-5 h-5 rounded-full border-2 spinner shrink-0"
            style={{ borderColor: `${accent}4D`, borderTopColor: accent }}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-200 truncate">
              {isCached ? "Loading" : "Downloading"} {modelName}
            </p>
            <p className="text-xs text-neutral-500 truncate">
              {progressText || "Preparing model..."}
            </p>
          </div>
          <span
            className="ml-auto text-xs font-mono shrink-0"
            style={{ color: accent }}
          >
            {progress}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%`, backgroundColor: accent }}
          />
        </div>
      </div>
    </div>
  );
}
