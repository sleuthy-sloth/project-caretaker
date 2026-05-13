import { useState, useEffect, useRef, useCallback } from 'react';
import { sendGroqMessage } from '../engine/groqClient';

export interface ShipStatus {
  power_level: number;
  hull_integrity: number;
  stress_level: string;
}

export interface AIResponse {
  terminal_output: string;
  scene_description: string;
  ship_status: ShipStatus | null;
  active_alarms: string[];
  suggested_actions: string[];
}

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export const CLOUD_MODEL_ID = "groq-cloud";

export function useCaretakerAI() {
  const workerRef = useRef<Worker | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isCloudMode, setIsCloudMode] = useState(false);

  const resolveRef = useRef<((val: AIResponse) => void) | null>(null);
  const rejectRef = useRef<((err: string) => void) | null>(null);
  const isCloudRef = useRef(false);

  useEffect(() => {
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
    if (modelId === CLOUD_MODEL_ID) {
      isCloudRef.current = true;
      setIsCloudMode(true);
      setIsInitializing(false);
      setIsReady(true);
      setDownloadProgress(1);
      setProgressText("CLOUD AI CONNECTED");
      setError(null);
      return;
    }

    isCloudRef.current = false;
    setIsCloudMode(false);
    if (!workerRef.current) return;
    setIsInitializing(true);
    setIsReady(false);
    setError(null);
    setDownloadProgress(0);
    setProgressText("");
    workerRef.current.postMessage({ type: 'INIT', payload: { modelId } });
  }, []);

  const sendMessage = useCallback((prompt: string, history: ChatHistoryMessage[] = []): Promise<AIResponse> => {
    if (isCloudRef.current) {
      setIsGenerating(true);
      setError(null);
      return sendGroqMessage(prompt, history)
        .then(response => {
          setIsGenerating(false);
          return response;
        })
        .catch(err => {
          setIsGenerating(false);
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
          throw new Error(msg);
        });
    }

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
        payload: { prompt, history }
      });
    });
  }, [isReady]);

  return {
    isInitializing,
    downloadProgress,
    progressText,
    isGenerating,
    isReady,
    isCloudMode,
    error,
    initAI,
    sendMessage
  };
}
