import { describe, expect, it } from "vitest";
import type { ParsedIntent } from "@tap/shared";
import { classifyRequestCategory, placeSearchText } from "./adapters.js";

function intent(category: ParsedIntent["category"], goal: string, placeQuery: string): ParsedIntent {
  return { goal, category, placeQuery, timing: "Flexible", assistanceNeeded: false, tags: ["places", "transport", "fallback"] };
}

describe("place search quality", () => {
  it.each([
    ["Quiero ir de compras", "shopping"],
    ["我想去购物", "shopping"],
    ["Gusto kong mamili", "shopping"],
    ["Tôi muốn đi mua sắm", "shopping"],
    ["쇼핑하러 가고 싶어요", "shopping"],
    ["أريد الذهاب للتسوق", "shopping"],
    ["मैं खरीदारी करना चाहता हूँ", "shopping"],
    ["Ayúdame a planear una cita", "appointment"],
    ["我想去看朋友", "social"],
  ])("classifies multilingual request %s", (request, expected) => {
    expect(classifyRequestCategory(request)).toBe(expected);
  });

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
