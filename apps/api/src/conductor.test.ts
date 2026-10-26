import { describe, expect, it } from "vitest";
import type { PlannerProfile } from "@tap/shared";
import { conduct } from "./conductor.js";
import { readConfig } from "./config.js";

const profile: PlannerProfile = {
  firstName: "Test",
  preferredLanguage: "English",
  approximateAge: 71,
  area: "Fremont, CA",
  mobility: "none",
  transportModes: ["Family or friend", "Rideshare"],
  interests: ["Shopping"],
  preferredDays: ["Weekdays"],
  preferredTimes: ["Afternoon"],
  walkingTolerance: "short",
  maxTravelMinutes: 30,
  planPreference: "balanced",
  accessibilitySupportRequested: true,
  trustedContactAvailable: true,
};

describe("conductor", () => {
  it("builds a ranked shopping plan with safe fallbacks when integrations are absent", async () => {
    const result = await conduct("I want to go shopping", profile, readConfig({ ALLOW_MOCKS: "true" }));
    expect(result.intent.category).toBe("shopping");
    expect(result.intent.tags).toEqual(["places", "transport", "contact", "fallback"]);
    expect(result.rankedOptions).toHaveLength(3);
    expect(result.rankedOptions[0].rank).toBe(1);
    expect(result.contactMessage.delivery).toBe("simulated");
    expect(result.integrations).toEqual({ intent: "mock", places: "mock", routes: "mock", messaging: "mock", events: "unavailable" });
  });

  it("uses curated senior activities when an activity provider key is absent", async () => {
    const result = await conduct("Find me a senior activity", { ...profile, interests: ["Learning"] }, readConfig({ ALLOW_MOCKS: "true" }));
    expect(result.intent.category).toBe("activity");
    expect(result.activities.length).toBeGreaterThan(0);
    expect(result.activities[0].source).toBe("curated");
    expect(result.rankedOptions[0].place.name).toContain("South Fremont");
    expect(result.rankedOptions[0].reason).toContain("saved interests");
    expect(result.integrations.events).toBe("curated");
  });
});
