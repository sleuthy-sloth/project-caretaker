import { CLOUD_MODEL_AUTO_ID } from '../hooks/useCaretakerAI';

export { CLOUD_MODEL_AUTO_ID };

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod|Android|Mobile/i.test(ua)) return true;
  if (ua.includes('Mac') && navigator.maxTouchPoints > 1) return true;
  return false;
}