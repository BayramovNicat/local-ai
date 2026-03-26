"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CodeBlock({ children, ...props }: React.ComponentProps<"pre">) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const code = (children as any)?.props?.children || "";
    navigator.clipboard.writeText(String(code).trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative group/code">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700/50 transition-all cursor-pointer opacity-0 group-hover/code:opacity-100"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
      <pre {...props}>{children}</pre>
    </div>
  );
}
