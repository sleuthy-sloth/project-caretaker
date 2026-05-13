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

export const CLOUD_MODEL_AUTO_ID = "cloud-auto";

function isCloudModel(modelId: string): boolean {
  return modelId.startsWith("cloud-");
}

export function useCaretakerAI() {
  const workerRef = useRef<Worker | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isCloudMode, setIsCloudMode] = useState(false);
  const [generationElapsed, setGenerationElapsed] = useState(0);

  const resolveRef = useRef<((val: AIResponse) => void) | null>(null);
  const rejectRef = useRef<((err: string) => void) | null>(null);
  const isCloudRef = useRef(false);
  const activeCloudModelRef = useRef(CLOUD_MODEL_AUTO_ID);
  const generationTimeoutRef = useRef<number | null>(null);

  const clearGenerationTimeout = useCallback(() => {
    if (generationTimeoutRef.current !== null) {
      window.clearTimeout(generationTimeoutRef.current);
      generationTimeoutRef.current = null;
    }
  }, []);

  const failPendingGeneration = useCallback((message: string) => {
    setIsGenerating(false);
    setError(message);
    if (rejectRef.current) {
      rejectRef.current(message);
      resolveRef.current = null;
      rejectRef.current = null;
    }
  }, []);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../engine/webLlmWorker.ts', import.meta.url), {
      type: 'module'
    });

    workerRef.current.onmessage = (event) => {
      const { type, payload } = event.data;

      switch (type) {
        case "HEARTBEAT":
          setGenerationElapsed(payload.elapsedMs);
          break;
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
          clearGenerationTimeout();
          setIsGenerating(false);
          setGenerationElapsed(0);
          if (resolveRef.current) {
            resolveRef.current(payload.parsed);
            resolveRef.current = null;
            rejectRef.current = null;
          }
          break;
        case "ERROR":
          clearGenerationTimeout();
          setIsInitializing(false);
          setIsGenerating(false);
          setGenerationElapsed(0);
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
      clearGenerationTimeout();
      workerRef.current?.terminate();
    };
  }, [clearGenerationTimeout]);

  const initAI = useCallback((modelId: string) => {
    if (isCloudModel(modelId)) {
      activeCloudModelRef.current = modelId;
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
      setGenerationElapsed(0);
      setIsGenerating(true);
      setError(null);
      return sendGroqMessage(prompt, history, activeCloudModelRef.current)
        .then(response => {
          setIsGenerating(false);
          setGenerationElapsed(0);
          return response;
        })
        .catch(err => {
          setIsGenerating(false);
          setGenerationElapsed(0);
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
      setGenerationElapsed(0);
      setIsGenerating(true);
      setError(null);

      clearGenerationTimeout();
      generationTimeoutRef.current = window.setTimeout(() => {
        failPendingGeneration(
          "Local generation timed out after 90 seconds. This can happen on iPhone due to memory limits. Retry, switch to Cloud AI, or use a smaller prompt.",
        );
      }, 90_000);

      workerRef.current.postMessage({
        type: 'GENERATE',
        payload: { prompt, history }
      });
    });
  }, [clearGenerationTimeout, failPendingGeneration, isReady]);

  return {
    isInitializing,
    downloadProgress,
    progressText,
    isGenerating,
    isReady,
    isCloudMode,
    error,
    initAI,
    sendMessage,
    generationElapsed
  };
}
