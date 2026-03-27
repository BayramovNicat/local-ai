"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyButton({ text, size = 13 }: { text: string; size?: number }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {
        console.error("[Copy] Clipboard access denied");
      },
    );
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer"
    >
      {copied ? <Check size={size} /> : <Copy size={size} />}
    </button>
  );
}
