export interface ParsedAIResponse {
  terminal_output: string;
  scene_description: string;
  ship_status: { power_level: number; hull_integrity: number; stress_level: string } | null;
  active_alarms: string[];
  suggested_actions: string[];
  provider?: string;
  model?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function extractFields(raw: string, currentStatus?: ParsedAIResponse['ship_status']): ParsedAIResponse {
  // 1. Try to parse numbers/statuses from markdown text
  const powerMatch = raw.match(/power[_\s]level.*?\s(\d+)/i) || raw.match(/power["\s:]+(\d+)/i) || raw.match(/reactor.*?\s(\d+)/i);
  const hullMatch = raw.match(/hull[_\s]integrity.*?\s(\d+)/i) || raw.match(/hull["\s:]+(\d+)/i) || raw.match(/integrity.*?\s(\d+)/i);
  
  // Extract stress level
  const stressRawMatch = raw.match(/stress[_\s]level.*?\s([a-z]+)/i) || raw.match(/stress["\s:]+([a-z]+)/i);
  let stress_level = currentStatus?.stress_level || "Elevated";
  if (stressRawMatch && stressRawMatch[1]) {
    const rawStress = stressRawMatch[1].toLowerCase();
    if (rawStress.includes("critical")) stress_level = "Critical";
    else if (rawStress.includes("nominal")) stress_level = "Nominal";
  }

  // 2. Extract Alarms
  const alarmsMatch = raw.match(/\*\*ACTIVE ALARMS\*\*\s*([\s\S]*?)(?=\*\*|$)/i) || raw.match(/"active_alarms"\s*:\s*\[([\s\S]*?)\]/);
  let active_alarms: string[] = [];
  if (alarmsMatch) {
    active_alarms = alarmsMatch[1]
      .split('\n')
      .map(l => l.replace(/^[-\s"]+/, '').replace(/["\,]+$/, '').trim())
      .filter(Boolean);
  }

  // 3. Extract Suggested Actions
  const actionsMatch = raw.match(/\*\*SUGGESTED ACTIONS\*\*\s*([\s\S]*?)(?=\*\*|$)/i) || raw.match(/"suggested_actions"\s*:\s*\[([\s\S]*?)\]/);
  let suggested_actions: string[] = [];
  if (actionsMatch) {
    suggested_actions = actionsMatch[1]
      .split('\n')
      .map(l => l.replace(/^[\d\.\s"-]+/, '').replace(/["\,]+$/, '').trim())
      .filter(Boolean);
  }

  // 4. Extract Terminal Output Text
  let terminal_output = raw;
  const shipStatusIndex = raw.indexOf("**SHIP STATUS**");
  if (shipStatusIndex !== -1) {
    terminal_output = raw.substring(0, shipStatusIndex).replace(/\*\*TERMINAL OUTPUT\*\*/i, '').trim();
  } else {
    // If it was partial JSON but malformed
    const textMatch = raw.match(/"terminal_output"\s*:\s*"([^"]+)"/);
    if (textMatch) terminal_output = textMatch[1];
  }

  // 5. Extract Scene Description (atmospheric setting text)
  let scene_description = "";
  const sceneMatch = raw.match(/"scene_description"\s*:\s*"([^"]+)"/);
  if (sceneMatch) scene_description = sceneMatch[1];

  // Default values if no data found
  if (active_alarms.length === 0) active_alarms = ["PARTIAL_PARSE_RECOVERY"];
  if (suggested_actions.length === 0) suggested_actions = ["DIAGNOSE SYSTEMS", "ENTER COMMAND"];

  return {
    terminal_output: terminal_output.trim() || "SIGNAL CORRUPTED. RETRANSMITTING...",
    scene_description,
    ship_status: {
      power_level: clamp(Number(powerMatch?.[1]) || currentStatus?.power_level || 50, 0, 100),
      hull_integrity: clamp(Number(hullMatch?.[1]) || currentStatus?.hull_integrity || 50, 0, 100),
      stress_level,
    },
    active_alarms,
    suggested_actions,
  };
}

export function parseAIResponse(responseText: string, currentStatus?: ParsedAIResponse['ship_status']): ParsedAIResponse {
  let parsed: ParsedAIResponse | null = null;

  // Try parsing pure JSON first (find bounded json if wrapped in markdown)
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      // JSON parse failed, silently fall through to extractFields
    }
  }

  if (!parsed) {
    parsed = extractFields(responseText, currentStatus);
  }

  if (parsed.ship_status) {
    parsed.ship_status.hull_integrity = clamp(parsed.ship_status.hull_integrity, 0, 100);
    parsed.ship_status.power_level = clamp(parsed.ship_status.power_level, 0, 100);
    if (!["Nominal", "Elevated", "Critical"].includes(parsed.ship_status.stress_level)) {
      parsed.ship_status.stress_level = "Elevated";
    }
  }

  if (typeof parsed.scene_description !== "string") {
    parsed.scene_description = "";
  }

  return parsed;
}
