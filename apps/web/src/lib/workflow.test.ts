import { describe, expect, it } from "vitest";
import { activePlanBranch, getFeatureDefinition, getPhaseLabel } from "./workflow";

describe("adaptable planning workflow", () => {
  it("uses feature-specific presentation without changing the shared stages", () => {
    expect(getFeatureDefinition("shopping").label).toBe("Shopping plan");
    expect(getFeatureDefinition("activity").label).toBe("Activity finder");
    expect(getPhaseLabel("transport", "activity")).toBe("Checking travel time and accessibility");
    expect(getPhaseLabel("discovering", "activity")).toContain("activities");
  });

  it("moves to fallback only after coordination cannot continue", () => {
    expect(activePlanBranch(false)).toBe("primary");
    expect(activePlanBranch(true)).toBe("coordination");
    expect(activePlanBranch(true, "waiting")).toBe("coordination");
    expect(activePlanBranch(true, "accepted")).toBe("primary");
    expect(activePlanBranch(true, "declined")).toBe("fallback");
    expect(activePlanBranch(true, "timed_out")).toBe("fallback");
    expect(activePlanBranch(true, "failed")).toBe("fallback");
  });
});
