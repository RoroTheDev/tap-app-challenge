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
  walkingTolerance: "short" | "moderate" | "long";
  maxTravelMinutes: 0 | 15 | 30 | 45 | 60;
  planPreference: "simple" | "balanced" | "detailed";
  personalizationConsent: boolean;
  locationUseConsent: boolean;
  onboardingComplete: boolean;
  schemaVersion: 2;
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
  walkingTolerance: SeniorProfile["walkingTolerance"];
  maxTravelMinutes: SeniorProfile["maxTravelMinutes"];
  planPreference: SeniorProfile["planPreference"];
  accessibilitySupportRequested: boolean;
  trustedContactAvailable: boolean;
}

type ProfileIdentity = Pick<SeniorProfile, "uid" | "email" | "displayName">;

function recordValue(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function stringList(value: unknown, allowed?: readonly string[]) {
  if (!Array.isArray(value)) return [];
  const strings = value.filter((item): item is string => typeof item === "string");
  return allowed ? strings.filter((item) => allowed.includes(item)) : strings;
}

/** Converts legacy, partial, or malformed stored data into a safe current profile. */
export function normalizeSeniorProfile(input: unknown, identity: ProfileIdentity): SeniorProfile {
  const data = recordValue(input);
  const expectedFields: Array<keyof SeniorProfile> = [
    "uid", "email", "displayName", "phone", "birthYear", "preferredLanguage", "secondaryLanguage",
    "addressLine1", "addressLine2", "city", "state", "postalCode", "mobility", "transportModes",
    "hobbies", "otherInterests", "preferredDays", "preferredTimes", "communicationNotes",
    "accessibilityNotes", "contactPreference", "walkingTolerance", "maxTravelMinutes", "planPreference",
    "personalizationConsent", "locationUseConsent",
    "onboardingComplete", "schemaVersion",
  ];
  const isCompleteCurrentRecord = data.schemaVersion === 2 && expectedFields.every((field) => field in data);
  const birthYear = typeof data.birthYear === "number" && Number.isInteger(data.birthYear) ? data.birthYear : null;
  const mobilityOptions: SeniorProfile["mobility"][] = ["none", "cane", "walker", "wheelchair", "other"];
  const contactOptions: SeniorProfile["contactPreference"][] = ["call", "text", "email"];
  const walkingOptions: SeniorProfile["walkingTolerance"][] = ["short", "moderate", "long"];
  const travelOptions: SeniorProfile["maxTravelMinutes"][] = [0, 15, 30, 45, 60];
  const planOptions: SeniorProfile["planPreference"][] = ["simple", "balanced", "detailed"];
  const mobility = mobilityOptions.includes(data.mobility as SeniorProfile["mobility"])
    ? data.mobility as SeniorProfile["mobility"]
    : "none";
  const contactPreference = contactOptions.includes(data.contactPreference as SeniorProfile["contactPreference"])
    ? data.contactPreference as SeniorProfile["contactPreference"]
    : "text";
  const walkingTolerance = walkingOptions.includes(data.walkingTolerance as SeniorProfile["walkingTolerance"])
    ? data.walkingTolerance as SeniorProfile["walkingTolerance"]
    : "short";
  const maxTravelMinutes = travelOptions.includes(data.maxTravelMinutes as SeniorProfile["maxTravelMinutes"])
    ? data.maxTravelMinutes as SeniorProfile["maxTravelMinutes"]
    : 30;
  const planPreference = planOptions.includes(data.planPreference as SeniorProfile["planPreference"])
    ? data.planPreference as SeniorProfile["planPreference"]
    : "simple";

  return {
    uid: identity.uid,
    email: identity.email,
    displayName: stringValue(data.displayName, identity.displayName || identity.email.split("@")[0] || "TAP member"),
    phone: stringValue(data.phone),
    birthYear,
    preferredLanguage: stringValue(data.preferredLanguage, "English"),
    secondaryLanguage: stringValue(data.secondaryLanguage),
    addressLine1: stringValue(data.addressLine1),
    addressLine2: stringValue(data.addressLine2),
    city: stringValue(data.city),
    state: stringValue(data.state),
    postalCode: stringValue(data.postalCode),
    mobility,
    transportModes: stringList(data.transportModes, transportOptions),
    hobbies: stringList(data.hobbies, hobbyOptions),
    otherInterests: stringValue(data.otherInterests),
    preferredDays: stringList(data.preferredDays, ["Weekdays", "Weekends"]),
    preferredTimes: stringList(data.preferredTimes, ["Morning", "Afternoon", "Evening"]),
    communicationNotes: stringValue(data.communicationNotes),
    accessibilityNotes: stringValue(data.accessibilityNotes),
    contactPreference,
    walkingTolerance,
    maxTravelMinutes,
    planPreference,
    personalizationConsent: data.personalizationConsent === true,
    locationUseConsent: data.locationUseConsent === true,
    onboardingComplete: isCompleteCurrentRecord && data.onboardingComplete === true,
    schemaVersion: 2,
  };
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
    walkingTolerance: profile.walkingTolerance,
    maxTravelMinutes: profile.maxTravelMinutes,
    planPreference: profile.planPreference,
    accessibilitySupportRequested: Boolean(profile.accessibilityNotes.trim()),
    trustedContactAvailable: contacts.some((contact) => contact.permissionConfirmed),
  };
}

export function normalizeTrustedContacts(contacts: ReadonlyArray<Partial<TrustedContact>>, defaultUid = "") {
  return contacts.map((contact, index): TrustedContact => ({
    id: stringValue(contact.id, `contact-${index + 1}`),
    uid: stringValue(contact.uid, defaultUid),
    name: stringValue(contact.name),
    relationship: stringValue(contact.relationship),
    phone: stringValue(contact.phone),
    email: stringValue(contact.email),
    isPrimary: index === 0,
    canReceiveSms: contact.canReceiveSms !== false,
    permissionConfirmed: contact.permissionConfirmed === true,
  }));
}
