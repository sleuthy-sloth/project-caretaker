export interface ShipState {
  hull: number;
  power: number;
  stress: string;
}

export interface ActiveAlarm {
  id: string;
  text: string;
}

export function normalizeStress(stress: string): string {
  const lower = stress.toLowerCase();
  if (lower === "critical" || lower === "elevated" || lower === "nominal") {
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
  return "Elevated";
}

export function getStressBarWidth(stress: string): { width: string; color: string } {
  const lower = stress.toLowerCase();
  if (lower === "critical") return { width: "95%", color: "bg-rose-500" };
  if (lower === "elevated") return { width: "60%", color: "bg-rose-400" };
  return { width: "10%", color: "bg-emerald-500" };
}

export interface StoryState {
  activeCheckpoint: string;
  completedCheckpoints: string[];
  storyFlags: Record<string, string | boolean | number>;
  activePlotThreads: string[];
  resolvedPlotThreads: string[];
  turnCount: number;
  updatedAt: number | null;
}

export interface StoryStateUpdate {
  advance_checkpoint?: string;
  set_flags?: Record<string, string | boolean | number>;
  resolve_thread?: string;
  add_thread?: string;
}

export const DEFAULT_STORY_STATE: StoryState = {
  activeCheckpoint: "CP-01",
  completedCheckpoints: [],
  storyFlags: {},
  activePlotThreads: [],
  resolvedPlotThreads: [],
  turnCount: 0,
  updatedAt: null,
};
