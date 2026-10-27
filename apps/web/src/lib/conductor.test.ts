import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeSeniorProfile, type ConductorResponse } from "@tap/shared";
import { requestConductorPlan } from "./conductor";

const demoUser = { uid: "demo-user", email: "demo@example.com", displayName: "Asha", isDemo: true };
const profile = normalizeSeniorProfile(undefined, demoUser);

const plan = {
  request: "I want to go shopping",
  intent: { goal: "Shop", category: "shopping", placeQuery: "stores", timing: "Afternoon", assistanceNeeded: false, tags: ["places", "transport", "fallback"] },
  steps: [], rankedOptions: [], activities: [], fallbackOptions: [],
  contactMessage: { available: false, recipientLabel: "No approved contact", draft: "", delivery: "unavailable" },
  integrations: { intent: "mock", places: "mock", routes: "mock", messaging: "unavailable", events: "unavailable" },
} satisfies ConductorResponse;

describe("conductor request resilience", () => {
  afterEach(() => vi.restoreAllMocks());

  it("automatically retries a transient first-run failure", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "cold start" }), { status: 503, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(plan), { status: 200, headers: { "Content-Type": "application/json" } }));

    const result = await requestConductorPlan("I want to go shopping", demoUser, profile, []);

    expect(result).toEqual(plan);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a request the server rejects", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ error: "Please add a request." }), { status: 400, headers: { "Content-Type": "application/json" } }));

    await expect(requestConductorPlan("", demoUser, profile, [])).rejects.toThrow("Please add a request.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
