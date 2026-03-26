"use client";

import { Bot } from "lucide-react";

export function EmptyState({ accent }: { accent: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full text-center space-y-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: `${accent}1A` }}
      >
        <Bot size={32} style={{ color: accent }} />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-white">
          local<span style={{ color: accent }}>.ai</span>
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Your private AI, running entirely on your machine.
        </p>
      </div>
    </div>
  );
}
