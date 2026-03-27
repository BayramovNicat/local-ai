import { useEffect, type RefObject } from 'react';

export function useClickOutside(refs: RefObject<HTMLElement | null>[], callbacks: (() => void)[]) {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      refs.forEach((ref, i) => {
        if (ref.current && !ref.current.contains(e.target as Node)) {
          callbacks[i]();
        }
      });
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [refs, callbacks]);
}
