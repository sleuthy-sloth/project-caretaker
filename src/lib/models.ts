import { CLOUD_MODEL_ID } from '../hooks/useCaretakerAI';

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  recommended: boolean;
  mobileSafe: boolean;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: CLOUD_MODEL_ID,
    name: "Cloud AI",
    description: "Runs on remote cloud servers via a large language model. Best narrative. Instant start, no download. Requires internet.",
    recommended: true,
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
