import { describe, expect, it } from "vitest";
import { buildUberDeepLink } from "./uber";

const destination = {
  id: "place-1",
  name: "Age Well Center",
  address: "40086 Paseo Padre Parkway, Fremont, CA",
  mapsUrl: "https://maps.google.com/",
  latitude: 37.55,
  longitude: -121.96,
  source: "google" as const,
};

describe("Uber handoff", () => {
  it("keeps a safe generic fallback until a client id exists", () => {
    expect(buildUberDeepLink(undefined, destination)).toBe("https://m.uber.com/");
  });

  it("prefills current pickup and the selected destination", () => {
    const link = new URL(buildUberDeepLink("client-123", destination));
    expect(link.hostname).toBe("m.uber.com");
    expect(link.pathname).toBe("/looking");
    expect(link.searchParams.get("client_id")).toBe("client-123");
    expect(link.searchParams.get("pickup")).toBe("my_location");
    expect(JSON.parse(link.searchParams.get("drop[0]") ?? "{}")).toMatchObject({
      latitude: 37.55,
      longitude: -121.96,
      addressLine1: "Age Well Center",
    });
  });
});
