"use client";

export function LoadingDots() {
  return (
    <div className="flex h-4 items-center space-x-1 py-2">
      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500 [animation-delay:-0.3s]"></div>
      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500 [animation-delay:-0.15s]"></div>
      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500"></div>
    </div>
  );
}
