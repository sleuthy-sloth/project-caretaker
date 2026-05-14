import { useState, useCallback, useRef } from 'react';
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
  story_state_update?: {
    advance_checkpoint?: string;
    set_flags?: Record<string, string | boolean | number>;
    resolve_thread?: string;
    add_thread?: string;
  };
  provider?: string;
  model?: string;
}

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export const CLOUD_MODEL_AUTO_ID = "cloud-auto";

export function useCaretakerAI() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string>("Initializing...");
  const retryCountRef = useRef(0);

  // Stub state for App.tsx compatibility until Phase 2 removes model picker
  const isInitializing = false;
  const downloadProgress = 1;
  const progressText = "CLOUD AI CONNECTED";
  const isReady = true;
  const isCloudMode = true;
  const generationElapsed = 0;

  const initAI = useCallback((_modelId: string) => {
    // Cloud-only mode — initialization is automatic, no model selection needed
  }, []);

  const sendMessage = useCallback((
    prompt: string, 
    history: ChatHistoryMessage[] = [], 
    currentStatus?: AIResponse['ship_status'],
    storyState?: string
  ): Promise<AIResponse> => {
    setIsGenerating(true);
    setError(null);
    const attempt = retryCountRef.current;
    return sendGroqMessage(prompt, history, attempt, currentStatus, storyState)
      .then(response => {
        setIsGenerating(false);
        // Reset retry count on any successful response (even fallback)
        // so the next fresh command starts clean
        retryCountRef.current = 0;
        
        if (response.provider && response.model) {
          setActiveModel(`${response.provider} // ${response.model}`);
        } else if (response.provider) {
          setActiveModel(response.provider);
        } else {
          setActiveModel("Cloud AI");
        }

        return response;
      })
      .catch(err => {
        setIsGenerating(false);
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw new Error(msg);
      });
  }, []);

  const retry = useCallback((
    prompt: string, 
    history: ChatHistoryMessage[] = [], 
    currentStatus?: AIResponse['ship_status'],
    storyState?: string
  ): Promise<AIResponse> => {
    retryCountRef.current += 1;
    return sendMessage(prompt, history, currentStatus, storyState);
  }, [sendMessage]);

  const resetRetryCount = useCallback(() => {
    retryCountRef.current = 0;
  }, []);

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
    retry,
    resetRetryCount,
    generationElapsed,
    activeModel
  };
}