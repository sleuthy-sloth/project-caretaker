import { useState, useEffect, useRef, useCallback } from 'react';

export interface AIResponse {
  terminal_output: string;
  ship_status: {
    power_level: number;
    hull_integrity: number;
    stress_level: string;
  };
  active_alarms: string[];
  suggested_actions: string[];
}

export function useCaretakerAI() {
  const workerRef = useRef<Worker | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // We'll queue prompts if the user sends something while generating
  const resolveRef = useRef<((val: AIResponse) => void) | null>(null);
  const rejectRef = useRef<((err: string) => void) | null>(null);

  useEffect(() => {
    // Initialize Web Worker
    workerRef.current = new Worker(new URL('../engine/webLlmWorker.ts', import.meta.url), {
      type: 'module'
    });

    workerRef.current.onmessage = (event) => {
      const { type, payload } = event.data;

      switch (type) {
        case "PROGRESS":
          setDownloadProgress(payload.progress);
          setProgressText(payload.text);
          break;
        case "INIT_COMPLETE":
          setIsInitializing(false);
          setIsReady(true);
          setDownloadProgress(1);
          setProgressText("AI CORE ONLINE");
          break;
        case "GENERATE_COMPLETE":
          setIsGenerating(false);
          if (resolveRef.current) {
            resolveRef.current(payload.parsed);
            resolveRef.current = null;
            rejectRef.current = null;
          }
          break;
        case "ERROR":
          setIsInitializing(false);
          setIsGenerating(false);
          setError(payload);
          if (rejectRef.current) {
            rejectRef.current(payload);
            resolveRef.current = null;
            rejectRef.current = null;
          }
          break;
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const initAI = useCallback((modelId: string) => {
    if (!workerRef.current) return;
    setIsInitializing(true);
    setIsReady(false);
    setError(null);
    setDownloadProgress(0);
    workerRef.current.postMessage({ type: 'INIT', payload: { modelId } });
  }, []);

  const sendMessage = useCallback((prompt: string): Promise<AIResponse> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current || !isReady) {
        reject("AI Core is currently offline or initializing.");
        return;
      }
      
      resolveRef.current = resolve;
      rejectRef.current = reject;
      setIsGenerating(true);
      setError(null);
      
      workerRef.current.postMessage({
        type: 'GENERATE',
        payload: { prompt }
      });
    });
  }, [isReady]);

  return {
    isInitializing,
    downloadProgress,
    progressText,
    isGenerating,
    isReady,
    error,
    initAI,
    sendMessage
  };
}
