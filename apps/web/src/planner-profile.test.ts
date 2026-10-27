import { describe, expect, it } from "vitest";
import { languageOptions, normalizeSeniorProfile, normalizeTrustedContacts, toPlannerProfile, type SeniorProfile, type TrustedContact } from "@tap/shared";
import { onboardingStepError } from "./lib/validation";
import { buildHubPlan } from "./lib/hub-plan";
import { getHubCopy, getTextDirection, speechLocales } from "./lib/localization";
import { shouldFallbackToRedirect } from "./lib/auth-flow";

const profile: SeniorProfile = {
  uid: "user-1", email: "private@example.com", displayName: "Maria Chen", phone: "555-0100", birthYear: 1950,
  preferredLanguage: "Chinese", secondaryLanguage: "English", addressLine1: "10 Private Lane", addressLine2: "4B",
  city: "Pasadena", state: "CA", postalCode: "91101", mobility: "cane", transportModes: ["Family or friend"],
  hobbies: ["Gardening"], otherInterests: "Tea", preferredDays: ["Weekdays"], preferredTimes: ["Morning"],
  communicationNotes: "", accessibilityNotes: "Avoid stairs", contactPreference: "text", walkingTolerance: "short",
  maxTravelMinutes: 30, planPreference: "simple", personalizationConsent: true,
  locationUseConsent: true, onboardingComplete: true, schemaVersion: 2,
};

const contact: TrustedContact = { id: "c1", uid: "user-1", name: "Maya", relationship: "Daughter", phone: "555-0101", email: "maya@example.com", isPrimary: true, canReceiveSms: true, permissionConfirmed: true };

describe("toPlannerProfile", () => {
  it("shares useful constraints without raw PII", () => {
    const summary = toPlannerProfile(profile, [contact], 2026);
    expect(summary).toMatchObject({
      firstName: "Maria",
      approximateAge: 76,
      area: "Pasadena, CA",
      walkingTolerance: "short",
      maxTravelMinutes: 30,
      planPreference: "simple",
      trustedContactAvailable: true,
    });
    expect(JSON.stringify(summary)).not.toContain("Private Lane");
    expect(JSON.stringify(summary)).not.toContain("555-");
    expect(JSON.stringify(summary)).not.toContain("@example.com");
    expect(JSON.stringify(summary)).not.toContain("Avoid stairs");
    expect(summary.accessibilitySupportRequested).toBe(true);
  });

  it("recognizes any approved contact after primary contacts change", () => {
    expect(toPlannerProfile(profile, [{ ...contact, isPrimary: false }], 2026).trustedContactAvailable).toBe(true);
    expect(normalizeTrustedContacts([{ ...contact, isPrimary: false }, { ...contact, id: "c2" }]).map((item) => item.isPrimary)).toEqual([true, false]);
  });
});

describe("stored profile compatibility", () => {
  it("repairs a legacy partial profile and returns it to onboarding", () => {
    const migrated = normalizeSeniorProfile(
      { displayName: "Maria", city: "Pasadena", onboardingComplete: true },
      { uid: "user-1", email: "private@example.com", displayName: "Maria Chen" },
    );
    expect(migrated).toMatchObject({
      uid: "user-1",
      phone: "",
      preferredLanguage: "English",
      transportModes: [],
      onboardingComplete: false,
      walkingTolerance: "short",
      maxTravelMinutes: 30,
      planPreference: "simple",
      schemaVersion: 2,
    });
    expect(() => migrated.displayName.trim()).not.toThrow();
    expect(() => migrated.accessibilityNotes.trim()).not.toThrow();
  });

  it("repairs incomplete trusted contacts without inventing consent", () => {
    expect(normalizeTrustedContacts([{ id: "c1", name: "Maya" }], "user-1")).toEqual([{
      id: "c1",
      uid: "user-1",
      name: "Maya",
      relationship: "",
      phone: "",
      email: "",
      isPrimary: true,
      canReceiveSms: true,
      permissionConfirmed: false,
    }]);
  });

  it("returns a structurally complete but unusable profile to setup", () => {
    const repaired = normalizeSeniorProfile(
      { ...profile, city: "", onboardingComplete: true },
      { uid: profile.uid, email: profile.email, displayName: profile.displayName },
    );
    expect(repaired.onboardingComplete).toBe(false);
  });
});

describe("onboarding validation", () => {
  it("returns clear guidance for invalid profile and contact data", () => {
    expect(onboardingStepError(0, { ...profile, phone: "12" }, [])).toContain("valid phone");
    expect(onboardingStepError(1, { ...profile, city: "" }, [])).toBe("Please enter your city.");
    expect(onboardingStepError(3, profile, [{ ...contact, email: "not-an-email" }])).toContain("email address");
  });
});

describe("personalized hub", () => {
  it("uses the saved language for hub copy and speech recognition", () => {
    const copy = getHubCopy("Spanish");
    expect(copy.askTitle).toBe("Dile a Cue lo que necesitas");
    expect(speechLocales.Spanish).toBe("es-US");
    expect(getTextDirection("Arabic")).toBe("rtl");
  });

  it("has complete hub and voice support for every named language", () => {
    for (const language of languageOptions.filter((item) => item !== "Other")) {
      const copy = getHubCopy(language);
      expect(speechLocales[language], `${language} speech locale`).toMatch(/^[a-z]{2,3}-[A-Z]{2}$/);
      expect(copy.askTitle, `${language} hub copy`).toBeTruthy();
      expect(copy.voiceStarting, `${language} starting message`).toBeTruthy();
      expect(copy.voicePermission, `${language} permission message`).toBeTruthy();
      expect(copy.voiceNoSpeech, `${language} no-speech message`).toBeTruthy();
      expect(copy.quickRequests.length, `${language} quick requests`).toBeGreaterThanOrEqual(4);
    }
    expect(getHubCopy("Other").askTitle).toBeTruthy();
  });

  it("builds ranked action tags and only includes approved contact help", () => {
    const copy = getHubCopy("English");
    expect(buildHubPlan("I want to go shopping", copy, true).steps.map((step) => step.tag)).toEqual(["places", "transport", "contact", "fallback"]);
    expect(buildHubPlan("I want to go shopping", copy, false).steps.map((step) => step.tag)).toEqual(["places", "transport", "fallback"]);
  });
});

describe("Google authentication fallback", () => {
  it("uses redirect only when the browser cannot complete a popup", () => {
    expect(shouldFallbackToRedirect({ code: "auth/popup-blocked" })).toBe(true);
    expect(shouldFallbackToRedirect({ code: "auth/web-storage-unsupported" })).toBe(true);
    expect(shouldFallbackToRedirect({ code: "auth/popup-closed-by-user" })).toBe(false);
    expect(shouldFallbackToRedirect({ code: "auth/unauthorized-domain" })).toBe(false);
  });
});
