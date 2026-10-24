import { describe, expect, it } from "vitest";
import { toPlannerProfile, type SeniorProfile, type TrustedContact } from "@tap/shared";

const profile: SeniorProfile = {
  uid: "user-1", email: "private@example.com", displayName: "Maria Chen", phone: "555-0100", birthYear: 1950,
  preferredLanguage: "Chinese", secondaryLanguage: "English", addressLine1: "10 Private Lane", addressLine2: "4B",
  city: "Pasadena", state: "CA", postalCode: "91101", mobility: "cane", transportModes: ["Family or friend"],
  hobbies: ["Gardening"], otherInterests: "Tea", preferredDays: ["Weekdays"], preferredTimes: ["Morning"],
  communicationNotes: "", accessibilityNotes: "Avoid stairs", contactPreference: "text", personalizationConsent: true,
  locationUseConsent: true, onboardingComplete: true, schemaVersion: 1,
};

const contact: TrustedContact = { id: "c1", uid: "user-1", name: "Maya", relationship: "Daughter", phone: "555-0101", email: "maya@example.com", isPrimary: true, canReceiveSms: true, permissionConfirmed: true };

describe("toPlannerProfile", () => {
  it("shares useful constraints without raw PII", () => {
    const summary = toPlannerProfile(profile, [contact], 2026);
    expect(summary).toMatchObject({ firstName: "Maria", approximateAge: 76, area: "Pasadena, CA", trustedContactAvailable: true });
    expect(JSON.stringify(summary)).not.toContain("Private Lane");
    expect(JSON.stringify(summary)).not.toContain("555-");
    expect(JSON.stringify(summary)).not.toContain("@example.com");
  });
});
