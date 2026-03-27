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
    <div className="group/code relative">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 cursor-pointer rounded-md p-1.5 text-neutral-500 opacity-0 transition-all group-hover/code:opacity-100 hover:bg-neutral-700/50 hover:text-neutral-300"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
      <pre {...props}>{children}</pre>
    </div>
  );
}
