"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export function Tooltip({
  children,
  content,
  shortcut,
  position = "top",
  className = "flex w-full",
}: {
  children: React.ReactNode;
  content: string;
  shortcut?: string;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setCoords({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  };

  const show = () => {
    updatePosition();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      updatePosition();
      setIsVisible(true);
    }, 200);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible) {
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
    }
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isVisible]);

  const getTooltipPosition = () => {
    const { top, left, width, height } = coords;
    const gap = 8;

    switch (position) {
      case "top":
        return {
          top: top - gap,
          left: left + width / 2,
          transform: "translate(-50%, -100%)",
        };
      case "bottom":
        return {
          top: top + height + gap,
          left: left + width / 2,
          transform: "translateX(-50%)",
        };
      case "left":
        return {
          top: top + height / 2,
          left: left - gap,
          transform: "translate(-100%, -50%)",
        };
      case "right":
        return {
          top: top + height / 2,
          left: left + width + gap,
          transform: "translate(0, -50%)",
        };
    }
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-neutral-800",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-neutral-800",
    left: "left-full top-1/2 -translate-y-1/2 border-l-neutral-800",
    right: "right-full top-1/2 -translate-y-1/2 border-r-neutral-800",
  };

  return (
    <div
      ref={triggerRef}
      className={className}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {isVisible &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-9999 px-2.5 py-1.5 rounded-lg bg-[#0a0a0a] border border-neutral-800 shadow-2xl animate-[fadeIn_0.1s_ease-out] pointer-events-none whitespace-nowrap"
            style={getTooltipPosition()}
          >
            <div className="flex items-center gap-2.5 text-[11px] font-medium text-neutral-300">
              {content}
              {shortcut && (
                <span className="px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-500 font-sans text-[10px] border border-neutral-700/50">
                  {shortcut}
                </span>
              )}
            </div>
            {/* Arrow */}
            <div
              className={`absolute border-[5px] border-transparent ${arrowClasses[position]}`}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
