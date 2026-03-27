"use client";

import { Bot } from "lucide-react";

export function EmptyState({ accent }: { accent: string }) {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center space-y-4 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${accent}1A` }}
      >
        <Bot size={32} style={{ color: accent }} />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-white">
          local<span style={{ color: accent }}>.ai</span>
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Your private AI, running entirely on your machine.
        </p>
      </div>
    </div>
  );
}
