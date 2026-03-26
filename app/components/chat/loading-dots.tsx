"use client";

export function LoadingDots() {
  return (
    <div className="flex space-x-1 items-center h-4 py-2">
      <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce"></div>
    </div>
  );
}
