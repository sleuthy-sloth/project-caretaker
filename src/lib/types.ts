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
