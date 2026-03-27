"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  const [coords, setCoords] = useState({ top: -9999, left: -9999 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const gap = 8;
    const padding = 10; // Viewport padding

    let top = 0;
    let left = 0;

    // Initial position calculation
    if (position === "top") {
      top = triggerRect.top - tooltipRect.height - gap;
      left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
    } else if (position === "bottom") {
      top = triggerRect.bottom + gap;
      left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
    } else if (position === "left") {
      top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
      left = triggerRect.left - tooltipRect.width - gap;
    } else if (position === "right") {
      top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
      left = triggerRect.right + gap;
    }

    // Boundary checks
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Horizontal boundary handling
    if (left < padding) {
      left = padding;
    } else if (left + tooltipRect.width > viewportWidth - padding) {
      left = viewportWidth - tooltipRect.width - padding;
    }

    // Vertical boundary handling
    if (top < padding) {
      // If "top" overflows, try "bottom"
      if (position === "top") {
        const bottomAlt = triggerRect.bottom + gap;
        if (bottomAlt + tooltipRect.height < viewportHeight - padding) {
          top = bottomAlt;
        } else {
          top = padding;
        }
      } else {
        top = padding;
      }
    } else if (top + tooltipRect.height > viewportHeight - padding) {
      // If "bottom" overflows, try "top"
      if (position === "bottom") {
        const topAlt = triggerRect.top - tooltipRect.height - gap;
        if (topAlt > padding) {
          top = topAlt;
        } else {
          top = viewportHeight - tooltipRect.height - padding;
        }
      } else {
        top = viewportHeight - tooltipRect.height - padding;
      }
    }

    requestAnimationFrame(() => {
      setCoords({ top, left });
    });
  }, [position]);

  useEffect(() => {
    if (isVisible) {
      updatePosition();
    }
  }, [isVisible, updatePosition]);

  useEffect(() => {
    if (isVisible) {
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
    }
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isVisible, updatePosition]);

  const show = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 200);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  return (
    <div ref={triggerRef} className={className} onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {isVisible &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={tooltipRef}
            className="pointer-events-none fixed z-9999 animate-[fadeIn_0.1s_ease-out] rounded-lg border border-neutral-800 bg-[#0a0a0a] px-2.5 py-1.5 whitespace-nowrap shadow-2xl"
            style={{
              top: coords.top,
              left: coords.left,
              visibility: coords.top === -9999 ? "hidden" : "visible",
            }}
          >
            <div className="flex items-center gap-2.5 text-[11px] font-medium text-neutral-300">
              {content}
              {shortcut && (
                <span className="rounded border border-neutral-700/50 bg-neutral-900 px-1.5 py-0.5 font-sans text-[10px] text-neutral-500">
                  {shortcut}
                </span>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
