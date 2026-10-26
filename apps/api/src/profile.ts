import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import type { PlannerProfile, TrustedContact } from "@tap/shared";
import type { Request } from "express";
import type { ApiConfig } from "./config.js";

export interface RequestIdentity {
  uid: string;
  preview: boolean;
}

export function adminReady() {
  if (!getApps().length) initializeApp({ credential: applicationDefault() });
}

export async function authenticate(request: Request, config: ApiConfig): Promise<RequestIdentity> {
  const authorization = request.header("authorization") ?? "";
  if (authorization.startsWith("Bearer ")) {
    adminReady();
    const token = await getAuth().verifyIdToken(authorization.slice(7));
    return { uid: token.uid, preview: false };
  }
  if (config.allowMocks && request.header("x-tap-preview") === "true") return { uid: "preview-user", preview: true };
  throw Object.assign(new Error("Sign in is required."), { status: 401 });
}

export async function loadPlannerProfile(identity: RequestIdentity, body: unknown): Promise<{ profile: PlannerProfile; contacts: TrustedContact[] }> {
  if (identity.preview) {
    const candidate = (body as { previewProfile?: PlannerProfile } | null)?.previewProfile;
    if (!candidate) throw Object.assign(new Error("Preview profile is required."), { status: 400 });
    return { profile: candidate, contacts: [] };
  }

  adminReady();
  const db = getFirestore();
  const [profileSnapshot, contactSnapshot, user] = await Promise.all([
    db.doc(`users/${identity.uid}`).get(),
    db.collection(`users/${identity.uid}/trustedContacts`).get(),
    getAuth().getUser(identity.uid),
  ]);
  if (!profileSnapshot.exists) throw Object.assign(new Error("Complete your Cue profile first."), { status: 409 });
  const data = profileSnapshot.data() ?? {};
  const stringList = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  const contacts = contactSnapshot.docs.map((document, index): TrustedContact => {
    const contact = document.data();
    return {
      id: document.id,
      uid: identity.uid,
      name: typeof contact.name === "string" ? contact.name : "",
      relationship: typeof contact.relationship === "string" ? contact.relationship : "",
      phone: typeof contact.phone === "string" ? contact.phone : "",
      email: typeof contact.email === "string" ? contact.email : "",
      isPrimary: contact.isPrimary === true || index === 0,
      canReceiveSms: contact.canReceiveSms !== false,
      permissionConfirmed: contact.permissionConfirmed === true,
    };
  });
  const birthYear = typeof data.birthYear === "number" ? data.birthYear : null;
  const displayName = typeof data.displayName === "string" ? data.displayName : (user.displayName ?? "Cue member");
  const profile: PlannerProfile = {
    firstName: displayName.trim().split(/\s+/)[0] || "there",
    preferredLanguage: typeof data.preferredLanguage === "string" ? data.preferredLanguage : "English",
    approximateAge: birthYear ? new Date().getFullYear() - birthYear : null,
    area: [data.city, data.state].filter((item): item is string => typeof item === "string" && Boolean(item)).join(", "),
    mobility: ["none", "cane", "walker", "wheelchair", "other"].includes(String(data.mobility)) ? data.mobility as PlannerProfile["mobility"] : "none",
    transportModes: stringList(data.transportModes),
    interests: [...stringList(data.hobbies), typeof data.otherInterests === "string" ? data.otherInterests : ""].filter(Boolean),
    preferredDays: stringList(data.preferredDays),
    preferredTimes: stringList(data.preferredTimes),
    walkingTolerance: ["short", "moderate", "long"].includes(String(data.walkingTolerance)) ? data.walkingTolerance as PlannerProfile["walkingTolerance"] : "short",
    maxTravelMinutes: [0, 15, 30, 45, 60].includes(Number(data.maxTravelMinutes)) ? data.maxTravelMinutes as PlannerProfile["maxTravelMinutes"] : 30,
    planPreference: ["simple", "balanced", "detailed"].includes(String(data.planPreference)) ? data.planPreference as PlannerProfile["planPreference"] : "simple",
    accessibilitySupportRequested: typeof data.accessibilityNotes === "string" && Boolean(data.accessibilityNotes.trim()),
    trustedContactAvailable: contacts.some((contact) => contact.permissionConfirmed),
  };
  return { profile, contacts };
}
