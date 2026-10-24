export const hobbyOptions = [
  "Arts & crafts",
  "Books & reading",
  "Cooking",
  "Faith & spirituality",
  "Games & puzzles",
  "Gardening",
  "Learning",
  "Movies & music",
  "Nature",
  "Shopping",
  "Social events",
  "Volunteering",
] as const;

export const languageOptions = [
  "English",
  "Spanish",
  "Chinese",
  "Tagalog",
  "Vietnamese",
  "Korean",
  "Arabic",
  "Hindi",
  "Other",
] as const;

export const transportOptions = [
  "Walk",
  "Drive myself",
  "Family or friend",
  "Public transit",
  "Rideshare",
  "Paratransit",
] as const;

export interface SeniorProfile {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  birthYear: number | null;
  preferredLanguage: string;
  secondaryLanguage: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  mobility: "none" | "cane" | "walker" | "wheelchair" | "other";
  transportModes: string[];
  hobbies: string[];
  otherInterests: string;
  preferredDays: string[];
  preferredTimes: string[];
  communicationNotes: string;
  accessibilityNotes: string;
  contactPreference: "call" | "text" | "email";
  personalizationConsent: boolean;
  locationUseConsent: boolean;
  onboardingComplete: boolean;
  schemaVersion: 1;
}

export interface TrustedContact {
  id: string;
  uid: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  isPrimary: boolean;
  canReceiveSms: boolean;
  permissionConfirmed: boolean;
}

export interface PlannerProfile {
  firstName: string;
  preferredLanguage: string;
  approximateAge: number | null;
  area: string;
  mobility: SeniorProfile["mobility"];
  transportModes: string[];
  interests: string[];
  preferredDays: string[];
  preferredTimes: string[];
  accessibilityNotes: string;
  trustedContactAvailable: boolean;
}

export function toPlannerProfile(
  profile: SeniorProfile,
  contacts: TrustedContact[],
  currentYear = new Date().getFullYear(),
): PlannerProfile {
  return {
    firstName: profile.displayName.trim().split(/\s+/)[0] || "there",
    preferredLanguage: profile.preferredLanguage,
    approximateAge: profile.birthYear ? currentYear - profile.birthYear : null,
    area: [profile.city, profile.state].filter(Boolean).join(", "),
    mobility: profile.mobility,
    transportModes: profile.transportModes,
    interests: [...profile.hobbies, profile.otherInterests].filter(Boolean),
    preferredDays: profile.preferredDays,
    preferredTimes: profile.preferredTimes,
    accessibilityNotes: profile.accessibilityNotes,
    trustedContactAvailable: contacts.some(
      (contact) => contact.isPrimary && contact.permissionConfirmed,
    ),
  };
}
