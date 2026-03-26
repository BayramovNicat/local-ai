"use client";

import { useState, useEffect, useRef } from "react";
import { CreateMLCEngine, MLCEngine, hasModelInCache } from "@mlc-ai/web-llm";

export function useEngine(selectedModel: string) {
  const [isDownloading, setIsDownloading] = useState(true);
  const [isCached, setIsCached] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadProgressText, setDownloadProgressText] = useState("");
  const engineRef = useRef<MLCEngine | null>(null);

  useEffect(() => {
    let active = true;

    async function loadEngine() {
      setIsDownloading(true);
      setDownloadProgress(0);
      setDownloadProgressText("Initializing engine...");

      try {
        const cached = await hasModelInCache(selectedModel);
        if (active) setIsCached(cached);

        const engine = await CreateMLCEngine(selectedModel, {
          initProgressCallback: (report) => {
            if (active) {
              setDownloadProgress(Math.round(report.progress * 100));
              setDownloadProgressText(report.text);
            }
          },
        });

        if (active) {
          engineRef.current = engine;
          setIsDownloading(false);
        }
      } catch (err) {
        if (active) {
          console.error(err);
          setDownloadProgressText("Error loading model. See console.");
        }
      }
    }

    loadEngine();

    return () => {
      active = false;
    };
  }, [selectedModel]);

  return { engineRef, isDownloading, isCached, downloadProgress, downloadProgressText };
}
