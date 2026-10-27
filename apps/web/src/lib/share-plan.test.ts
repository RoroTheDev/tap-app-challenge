import { describe, expect, it } from "vitest";
import { buildSharePlanData } from "./share-plan";

describe("plan sharing", () => {
  it("includes useful place and activity details", () => {
    const option = {
      rank: 1,
      place: { id: "place-1", name: "Community Center", address: "123 Main St", mapsUrl: "https://maps.example/place", latitude: 1, longitude: 2, source: "google" as const },
      transport: { mode: "Rideshare", durationMinutes: 12, distanceMiles: 4, feasible: true, source: "google" as const },
      reason: "Close by",
    };
    const activity = {
      id: "activity-1", title: "Senior Art Class", description: "Paint together", startLabel: "Tuesday at 2 PM", costLabel: "Free", accessibilityLabel: "Wheelchair accessible", registrationUrl: "https://example.com/register", source: "ticketmaster" as const, sourceUrl: "https://example.com", lastVerifiedAt: "2026-10-26T00:00:00.000Z", freshness: "live" as const, venue: option.place,
    };
    const result = buildSharePlanData(option, activity);
    expect(result.text).toContain("Senior Art Class");
    expect(result.text).toContain("123 Main St");
    expect(result.text).toContain("12 minutes rideshare");
    expect(result.url).toBe("https://example.com/register");
  });
});
