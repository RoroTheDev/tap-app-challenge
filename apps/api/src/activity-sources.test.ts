import { describe, expect, it } from "vitest";
import { FREMONT_AGE_WELL_SOURCE, getCuratedSeniorActivities, sourceNeedsReview } from "./activity-sources.js";

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
});
