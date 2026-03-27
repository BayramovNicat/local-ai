'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { MLCEngineInterface } from '@mlc-ai/web-llm';

export function useEngine(selectedModel: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [isCached, setIsCached] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadProgressText, setDownloadProgressText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const engineRef = useRef<MLCEngineInterface | null>(null);
  const enginePromiseRef = useRef<Promise<MLCEngineInterface> | null>(null);

  useEffect(() => {
    let active = true;
    let currentWorker: Worker | null = null;
    let currentEngine: MLCEngineInterface | null = null;

    const promise = (async () => {
      setIsLoading(true);
      setError(null);
      setDownloadProgress(0);
      setDownloadProgressText('Initializing...');

      // Pre-flight check for WebGPU support
      if (!('gpu' in navigator)) {
        const errorMsg =
          'WebGPU is not supported in this browser. Please use a recent version of Chrome or Edge (113+).';
        if (active) {
          setError(errorMsg);
          setDownloadProgressText(errorMsg);
          setIsLoading(false);
        }
        throw new Error(errorMsg);
      }

      const webllm = await import('@mlc-ai/web-llm');

      const cached = await webllm.hasModelInCache(selectedModel);
      if (active) setIsCached(cached);

      currentWorker = new Worker(new URL('../workers/engine.ts', import.meta.url), {
        type: 'module',
      });

      const engine = await webllm.CreateWebWorkerMLCEngine(currentWorker, selectedModel, {
        initProgressCallback: (report) => {
          if (active) {
            setDownloadProgress(Math.round(report.progress * 100));
            setDownloadProgressText(report.text);
          }
        },
      });

      if (active) {
        currentEngine = engine;
        engineRef.current = engine;
        setIsLoading(false);
      } else {
        // If we became inactive while engine was loading, clean it up immediately
        engine.unload();
        currentWorker.terminate();
      }

      return engine;
    })();

    promise.catch((err) => {
      if (active) {
        console.error(err);
        setDownloadProgressText('Error loading model. See console.');
      }
    });

    enginePromiseRef.current = promise;

    return () => {
      active = false;
      if (currentEngine) {
        currentEngine.unload();
      }
      if (currentWorker) {
        currentWorker.terminate();
      }
      engineRef.current = null;
    };
  }, [selectedModel]);

  const waitForEngine = useCallback(async (): Promise<MLCEngineInterface> => {
    if (engineRef.current) return engineRef.current;
    if (!enginePromiseRef.current) throw new Error('Engine not initializing');

    const engine = await enginePromiseRef.current;
    if (engineRef.current !== engine) {
      throw new Error('Engine was unloaded or replaced during initialization.');
    }
    return engine;
  }, []);

  return {
    engineRef,
    waitForEngine,
    isLoading,
    isCached,
    downloadProgress,
    downloadProgressText,
    error,
  };
}
