"use client";

export function DownloadOverlay({
  modelName,
  progress,
  progressText,
  isCached,
  accent,
}: {
  modelName: string;
  progress: number;
  progressText?: string;
  isCached?: boolean;
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
            {isCached ? "Loading" : "Downloading"} {modelName}
          </p>
          <p className="text-sm text-neutral-400">
            {progressText || (progress < 100 ? "Preparing model for local inference..." : "Almost ready...")}
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
