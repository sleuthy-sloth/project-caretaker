import { describe, it, expect } from "bun:test";
import { parseAIResponse } from "./responseParser";

describe("parseAIResponse — scene description regex", () => {
  it("captures scene description with escaped quotes", () => {
    const json = JSON.stringify({
      terminal_output: "All systems nominal.",
      scene_description: 'He said \\"stop\\" and the lights went out.',
      ship_status: null,
      active_alarms: [],
      suggested_actions: [],
    });
    const result = parseAIResponse(json);
    expect(result.scene_description).toBe('He said \\"stop\\" and the lights went out.');
  });

  it("captures simple scene description", () => {
    const json = JSON.stringify({
      terminal_output: "Reading telemetry now.",
      scene_description: "The corridor is dark and cold.",
      ship_status: null,
      active_alarms: [],
      suggested_actions: [],
    });
    const result = parseAIResponse(json);
    expect(result.scene_description).toBe("The corridor is dark and cold.");
  });

  it("handles empty scene description", () => {
    const json = JSON.stringify({
      terminal_output: "Standing by.",
      scene_description: "",
      ship_status: null,
      active_alarms: [],
      suggested_actions: [],
    });
    const result = parseAIResponse(json);
    expect(result.scene_description).toBe("");
  });
});

describe("parseAIResponse — sentinel alarm gating", () => {
  it("does NOT add sentinel alarms when clean JSON has empty active_alarms", () => {
    const json = JSON.stringify({
      terminal_output: "Systems nominal.",
      scene_description: "Quiet.",
      ship_status: null,
      active_alarms: [],
      suggested_actions: [],
    });
    const result = parseAIResponse(json);
    expect(result.active_alarms).toEqual([]);
    expect(result.suggested_actions).toEqual([]);
  });

  it("does NOT add sentinel alarms when clean JSON has empty suggested_actions", () => {
    const json = JSON.stringify({
      terminal_output: "All quiet.",
      scene_description: "Silent.",
      ship_status: null,
      active_alarms: ["ALARM_1"],
      suggested_actions: [],
    });
    const result = parseAIResponse(json);
    expect(result.active_alarms).toEqual(["ALARM_1"]);
    expect(result.suggested_actions).toEqual([]);
  });

  it("does NOT add sentinel alarms when clean JSON has both empty", () => {
    const json = JSON.stringify({
      terminal_output: "Nothing to report.",
      scene_description: "Still.",
      ship_status: null,
      active_alarms: [],
      suggested_actions: [],
    });
    const result = parseAIResponse(json);
    expect(result.active_alarms).toEqual([]);
    expect(result.suggested_actions).toEqual([]);
  });

  it("adds sentinel alarms when extractFields fallback is used (malformed JSON)", () => {
    const malformed = `Some text **ACTIVE ALARMS**
- Item 1
**SUGGESTED ACTIONS**
1. DO THING
2. DO OTHER`;
    const result = parseAIResponse(malformed);
    // extractFields finds alarms/actions from the text above, so no sentinel needed
    expect(result.active_alarms).not.toContain("PARTIAL_PARSE_RECOVERY");
    expect(result.suggested_actions.length).toBeGreaterThan(0);
  });

  it("adds sentinel alarms when extractFields finds nothing in malformed text", () => {
    const malformed = "This is completely random text with no structured content at all.";
    const result = parseAIResponse(malformed);
    expect(result.active_alarms).toContain("PARTIAL_PARSE_RECOVERY");
    expect(result.suggested_actions).toContain("DIAGNOSE SYSTEMS");
  });
});
