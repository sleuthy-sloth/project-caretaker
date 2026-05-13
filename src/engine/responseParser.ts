export interface ParsedAIResponse {
  terminal_output: string;
  ship_status: { power_level: number; hull_integrity: number; stress_level: string } | null;
  active_alarms: string[];
  suggested_actions: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function extractFields(raw: string): ParsedAIResponse {
  const textMatch = raw.match(/terminal_output["\s:]+([^"]+)/);
  const powerMatch = raw.match(/power_level["\s:]+(\d+)/);
  const hullMatch = raw.match(/hull_integrity["\s:]+(\d+)/);
  const stressMatch = raw.match(/stress_level["\s:]+(\w+)/);

  return {
    terminal_output: textMatch?.[1]?.replace(/["{},]/g, '').trim() || "SIGNAL CORRUPTED. RETRANSMITTING...",
    ship_status: {
      power_level: clamp(Number(powerMatch?.[1]) || 50, 0, 100),
      hull_integrity: clamp(Number(hullMatch?.[1]) || 50, 0, 100),
      stress_level: ["Nominal", "Elevated", "Critical"].includes(stressMatch?.[1] || "")
        ? stressMatch![1]
        : "Elevated",
    },
    active_alarms: ["PARTIAL_PARSE_RECOVERY"],
    suggested_actions: ["DIAGNOSE SYSTEMS", "ENTER COMMAND"],
  };
}

export function parseAIResponse(responseText: string): ParsedAIResponse {
  let parsed: ParsedAIResponse;

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      parsed = extractFields(responseText);
    }
  } else {
    parsed = {
      terminal_output: responseText.trim() || "ERROR: COGNITIVE MATRIX FAULT. SIGNAL DEGRADATION ON CHANNEL.",
      ship_status: null,
      active_alarms: ["RESPONSE_FORMAT_FAULT"],
      suggested_actions: ["ENTER COMMAND", "REQUEST REPEAT"],
    };
  }

  if (parsed.ship_status) {
    parsed.ship_status.hull_integrity = clamp(parsed.ship_status.hull_integrity, 0, 100);
    parsed.ship_status.power_level = clamp(parsed.ship_status.power_level, 0, 100);
    if (!["Nominal", "Elevated", "Critical"].includes(parsed.ship_status.stress_level)) {
      parsed.ship_status.stress_level = "Elevated";
    }
  }

  return parsed;
}
