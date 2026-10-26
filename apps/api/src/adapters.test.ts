import { describe, expect, it } from "vitest";
import type { ParsedIntent } from "@tap/shared";
import { placeSearchText } from "./adapters.js";

function intent(category: ParsedIntent["category"], goal: string, placeQuery: string): ParsedIntent {
  return { goal, category, placeQuery, timing: "Flexible", assistanceNeeded: false, tags: ["places", "transport", "fallback"] };
}

describe("place search quality", () => {
  it("keeps generic appointments away from urgent-care searches", () => {
    expect(placeSearchText(intent("appointment", "Help me plan an appointment", "medical offices")))
      .toBe("accessible primary care clinics");
  });

  it("turns an unspecified friend visit into a sensible meeting-place search", () => {
    expect(placeSearchText(intent("social", "I want to visit a friend", "quiet meeting places")))
      .toBe("quiet accessible cafes");
  });

  it("preserves a specific model-generated search", () => {
    expect(placeSearchText(intent("shopping", "Find groceries", "accessible grocery stores")))
      .toBe("accessible grocery stores");
  });
});
