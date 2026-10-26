import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { readConfig } from "./config.js";

const previewProfile = {
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

describe("conductor API", () => {
  const app = createApp(readConfig({ ALLOW_MOCKS: "true", WEB_ORIGIN: "http://localhost:5173" }));

  it("rejects anonymous requests without explicit preview mode", async () => {
    await request(app).post("/api/conductor").send({ request: "I want to go shopping" }).expect(401);
  });

  it("returns a complete preview plan", async () => {
    const response = await request(app)
      .post("/api/conductor")
      .set("X-TAP-Preview", "true")
      .send({ request: "I want to go shopping", previewProfile })
      .expect(200);
    expect(response.body.intent.category).toBe("shopping");
    expect(response.body.rankedOptions).toHaveLength(3);
    expect(response.body.steps.map((step: { tag: string }) => step.tag)).toEqual(["places", "transport", "contact", "fallback"]);
  });
});
