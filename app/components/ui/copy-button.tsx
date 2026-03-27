'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyButton({ text, size = 13 }: { text: string; size?: number }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {
        console.error('[Copy] Clipboard access denied');
      },
    );
  }

  return (
    <button
      onClick={handleCopy}
      className="cursor-pointer rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-300"
    >
      {copied ? <Check size={size} /> : <Copy size={size} />}
    </button>
  );
}
