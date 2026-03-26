"use client";

import { useCallback, useSyncExternalStore } from "react";
import { AVAILABLE_MODELS, ACCENT_PRESETS } from "@/app/data/constants";

function makeLocalStorageStore(key: string, fallback: string) {
  const listeners = new Set<() => void>();

  function subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  function getSnapshot(): string {
    return localStorage.getItem(key) ?? fallback;
  }

  function getServerSnapshot(): string {
    return fallback;
  }

  function set(value: string) {
    localStorage.setItem(key, value);
    listeners.forEach((cb) => cb());
  }

  return { subscribe, getSnapshot, getServerSnapshot, set };
}

const modelStore = makeLocalStorageStore("selectedModel", AVAILABLE_MODELS[0]);
const accentStore = makeLocalStorageStore("accentColor", ACCENT_PRESETS[0].hex);
const sidebarStore = makeLocalStorageStore("isSidebarOpen", "false");

export function usePreferences() {
  const selectedModel = useSyncExternalStore(
    modelStore.subscribe,
    modelStore.getSnapshot,
    modelStore.getServerSnapshot,
  );

  const accentColor = useSyncExternalStore(
    accentStore.subscribe,
    accentStore.getSnapshot,
    accentStore.getServerSnapshot,
  );

  const isSidebarOpenRaw = useSyncExternalStore(
    sidebarStore.subscribe,
    sidebarStore.getSnapshot,
    sidebarStore.getServerSnapshot,
  );

  const isSidebarOpen = isSidebarOpenRaw === "true";

  const setSelectedModel = useCallback((v: string) => modelStore.set(v), []);
  const setAccentColor = useCallback((v: string) => accentStore.set(v), []);
  const setIsSidebarOpen = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof v === "function" ? v(sidebarStore.getSnapshot() === "true") : v;
      sidebarStore.set(String(next));
    },
    [],
  );

  return {
    selectedModel,
    setSelectedModel,
    accentColor,
    setAccentColor,
    isSidebarOpen,
    setIsSidebarOpen,
  };
}
