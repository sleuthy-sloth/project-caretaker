import { CLOUD_MODEL_AUTO_ID } from '../hooks/useCaretakerAI';

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  recommended: boolean;
  mobileSafe: boolean;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: CLOUD_MODEL_AUTO_ID,
    name: "Cloud AI (Auto)",
    description: "Runs on remote cloud providers with automatic fallback. Best reliability. Instant start, no download. Requires internet.",
    recommended: true,
    mobileSafe: true
  },
  {
    id: "cloud-gemini",
    name: "Cloud AI (Gemini)",
    description: "Force Google Gemini route. Fast and cheap when available.",
    recommended: false,
    mobileSafe: true
  },
  {
    id: "cloud-openrouter",
    name: "Cloud AI (OpenRouter)",
    description: "Force OpenRouter route. Useful when other providers are throttled.",
    recommended: false,
    mobileSafe: true
  },
  {
    id: "cloud-groq",
    name: "Cloud AI (Groq)",
    description: "Force Groq route for consistent speed and style.",
    recommended: false,
    mobileSafe: true
  },
  {
    id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 0.5B",
    description: "Tiny local model (~360MB). Runs offline in browser via WebGPU. Basic narrative.",
    recommended: false,
    mobileSafe: true
  },
  {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    name: "Llama 3.2 1B",
    description: "Small local model (~880MB). Runs offline via WebGPU. Better than 0.5B on recent phones.",
    recommended: false,
    mobileSafe: true
  },
  {
    id: "gemma-2b-it-q4f32_1-MLC",
    name: "Gemma 2B",
    description: "Mid-size local model (~1.4GB). Solid offline narrative on desktop. Will crash most phones.",
    recommended: false,
    mobileSafe: false
  },
  {
    id: "Llama-3-8B-Instruct-q4f32_1-MLC",
    name: "Llama-3 8B",
    description: "Large (~5GB). Best narrative, requires desktop with strong GPU.",
    recommended: false,
    mobileSafe: false
  }
];

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod|Android|Mobile/i.test(ua)) return true;
  if (ua.includes('Mac') && navigator.maxTouchPoints > 1) return true;
  return false;
}
