import { afterEach, describe, expect, it, vi } from "vitest";
import type { ParsedIntent, PlannerProfile } from "@tap/shared";
import { findActivities } from "./adapters.js";
import { FREMONT_AGE_WELL_SOURCE, getCuratedSeniorActivities, sourceNeedsReview } from "./activity-sources.js";
import { readConfig } from "./config.js";

afterEach(() => vi.unstubAllGlobals());

describe("curated senior activity sources", () => {
  it("returns provenance-backed Fremont activities only for the covered area", () => {
    expect(getCuratedSeniorActivities("Oakland, CA")).toEqual([]);
    const activities = getCuratedSeniorActivities("Fremont, CA");
    expect(activities).toHaveLength(2);
    expect(activities.every((activity) => activity.sourceUrl === FREMONT_AGE_WELL_SOURCE.url)).toBe(true);
    expect(activities.every((activity) => activity.lastVerifiedAt === FREMONT_AGE_WELL_SOURCE.verifiedAt)).toBe(true);
    expect(activities.every((activity) => activity.freshness === "verified")).toBe(true);
  });

  it("flags curated entries for review after the freshness window", () => {
    const activity = getCuratedSeniorActivities("Fremont, CA")[0];
    expect(sourceNeedsReview(activity, new Date("2026-11-15T00:00:00Z"))).toBe(false);
    expect(sourceNeedsReview(activity, new Date("2026-12-15T00:00:00Z"))).toBe(true);
    expect(sourceNeedsReview({ ...activity, freshness: "live" }, new Date("2030-01-01T00:00:00Z"))).toBe(false);
  });

  it("bounds oversized provider text before it reaches a saved plan", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ _embedded: { events: [{
        id: "event-1", name: "Community concert", info: "x".repeat(1_400), url: "https://example.com/event",
        _embedded: { venues: [{ name: "Community hall", city: { name: "Oakland" }, state: { stateCode: "CA" } }] },
      }] } }),
    }));
    const intent = { category: "activity" } as ParsedIntent;
    const profile = { area: "Oakland, CA" } as PlannerProfile;
    const result = await findActivities(intent, profile, readConfig({ TICKETMASTER_API_KEY: "test", ALLOW_MOCKS: "true" }));
    expect(result.value).toHaveLength(1);
    expect(result.value[0].description.length).toBe(1_000);
    expect(result.value[0].description.endsWith("…")).toBe(true);
  });
});
