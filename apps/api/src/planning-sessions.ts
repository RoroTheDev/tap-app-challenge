import { randomUUID } from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import type {
  ConductorResponse,
  CoordinationStatus,
  PlanningSession,
  PlanningSessionPhase,
  PlanningSessionStatus,
} from "@tap/shared";
import { adminReady } from "./profile.js";

const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1_000;
const sessionIdPattern = /^[A-Za-z0-9_-]{8,80}$/;
const phases = ["understanding", "discovering", "transport", "fallbacks", "ready"] as const satisfies readonly PlanningSessionPhase[];
const statuses = ["planning", "ready", "waiting_for_contact", "accepted", "fallback", "complete", "failed"] as const satisfies readonly PlanningSessionStatus[];
const coordinationStatuses = ["waiting", "accepted", "declined", "timed_out", "failed"] as const satisfies readonly CoordinationStatus[];

const boundedText = (maximum: number) => z.string().max(maximum);
const placeSchema = z.object({
  id: boundedText(200), name: boundedText(160), address: boundedText(300), mapsUrl: boundedText(2_000),
  latitude: z.number().min(-90).max(90).nullable(), longitude: z.number().min(-180).max(180).nullable(),
  source: z.enum(["google", "mock"]),
}).strict();
const transportSchema = z.object({
  mode: boundedText(60), durationMinutes: z.number().nonnegative().max(1_440), distanceMiles: z.number().nonnegative().max(2_000),
  feasible: z.boolean(), source: z.enum(["google", "mock"]),
}).strict();
const conductorResponseSchema: z.ZodType<ConductorResponse> = z.object({
  request: boundedText(500),
  intent: z.object({
    goal: boundedText(500), category: z.enum(["shopping", "appointment", "social", "errand", "activity", "other"]),
    placeQuery: boundedText(300), timing: boundedText(120), assistanceNeeded: z.boolean(),
    tags: z.array(z.enum(["places", "transport", "contact", "fallback"])).max(4),
  }).strict(),
  steps: z.array(z.object({
    tag: z.enum(["places", "transport", "contact", "fallback"]), title: boundedText(160), detail: boundedText(500),
    status: z.enum(["ready", "simulated", "needs_confirmation"]),
  }).strict()).max(4),
  rankedOptions: z.array(z.object({
    rank: z.number().int().min(1).max(5), place: placeSchema, transport: transportSchema, reason: boundedText(500),
  }).strict()).max(5),
  activities: z.array(z.object({
    id: boundedText(200), title: boundedText(200), description: boundedText(1_000), startLabel: boundedText(200),
    costLabel: boundedText(100), accessibilityLabel: boundedText(500), registrationUrl: boundedText(2_000),
    source: z.enum(["ticketmaster", "curated"]), sourceUrl: boundedText(2_000), lastVerifiedAt: boundedText(40),
    freshness: z.enum(["live", "verified"]), venue: placeSchema,
  }).strict()).max(10),
  fallbackOptions: z.array(boundedText(500)).max(5),
  contactMessage: z.object({
    available: z.boolean(), recipientLabel: boundedText(100), draft: boundedText(800),
    delivery: z.enum(["ready", "simulated", "unavailable"]),
  }).strict(),
  integrations: z.object({
    intent: z.enum(["openai", "mock"]), places: z.enum(["google", "mock"]), routes: z.enum(["google", "mock"]),
    messaging: z.enum(["twilio", "mock", "unavailable"]), events: z.enum(["ticketmaster", "curated", "unavailable"]),
  }).strict(),
}).strict();

export const createPlanningSessionSchema = z.object({
  id: z.string().regex(sessionIdPattern).optional(),
  request: z.string().trim().min(2).max(500),
});

export const updatePlanningSessionSchema = z.object({
  phase: z.enum(phases).optional(),
  status: z.enum(statuses).optional(),
  plan: conductorResponseSchema.nullable().optional(),
  coordinationStatus: z.enum(coordinationStatuses).nullable().optional(),
  coordinationId: boundedText(200).nullable().optional(),
  coordinationExpiresAt: boundedText(40).nullable().optional(),
  selectedOptionRank: z.number().int().min(1).max(5).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "At least one session field is required.");

interface StoredPlanningSession extends PlanningSession { ownerUid: string; }

export interface PlanningSessionStore {
  create(uid: string, id: string, value: StoredPlanningSession): Promise<void>;
  read(uid: string, id: string): Promise<StoredPlanningSession | null>;
  update(uid: string, id: string, value: Partial<StoredPlanningSession>): Promise<void>;
  delete(uid: string, id: string): Promise<void>;
  deleteAll(uid: string): Promise<void>;
}

class FirestorePlanningSessionStore implements PlanningSessionStore {
  private collection(uid: string) {
    adminReady();
    return getFirestore().collection(`users/${uid}/planningSessions`);
  }

  async create(uid: string, id: string, value: StoredPlanningSession) {
    await this.collection(uid).doc(id).create(value);
  }

  async read(uid: string, id: string) {
    const snapshot = await this.collection(uid).doc(id).get();
    return snapshot.exists ? snapshot.data() as StoredPlanningSession : null;
  }

  async update(uid: string, id: string, value: Partial<StoredPlanningSession>) {
    await this.collection(uid).doc(id).update(value);
  }

  async delete(uid: string, id: string) {
    await this.collection(uid).doc(id).delete();
  }

  async deleteAll(uid: string) {
    const snapshots = await this.collection(uid).limit(100).get();
    if (snapshots.empty) return;
    const db = getFirestore();
    const batch = db.batch();
    snapshots.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
    if (snapshots.size === 100) await this.deleteAll(uid);
  }
}

const firestoreStore = new FirestorePlanningSessionStore();

function publicSession(value: StoredPlanningSession): PlanningSession {
  const { ownerUid: _ownerUid, ...session } = value;
  return session;
}

function validateSessionId(id: string) {
  if (!sessionIdPattern.test(id)) throw Object.assign(new Error("Invalid planning session ID."), { status: 400 });
}

export async function createPlanningSession(
  uid: string,
  input: z.infer<typeof createPlanningSessionSchema>,
  store: PlanningSessionStore = firestoreStore,
  now = new Date(),
) {
  const parsed = createPlanningSessionSchema.parse(input);
  const id = parsed.id ?? randomUUID();
  const session: StoredPlanningSession = {
    id,
    ownerUid: uid,
    request: parsed.request,
    phase: "understanding",
    status: "planning",
    plan: null,
    coordinationStatus: null,
    coordinationId: null,
    coordinationExpiresAt: null,
    selectedOptionRank: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS).toISOString(),
  };
  try {
    await store.create(uid, id, session);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && String(error.code).includes("already-exists")) {
      throw Object.assign(new Error("This planning session already exists."), { status: 409 });
    }
    throw error;
  }
  return publicSession(session);
}

export async function getPlanningSession(uid: string, id: string, store: PlanningSessionStore = firestoreStore, now = new Date()) {
  validateSessionId(id);
  const stored = await store.read(uid, id);
  if (!stored || stored.ownerUid !== uid) throw Object.assign(new Error("Planning session not found."), { status: 404 });
  if (new Date(stored.expiresAt).getTime() <= now.getTime()) {
    await store.delete(uid, id);
    throw Object.assign(new Error("This planning session has expired."), { status: 410 });
  }
  return publicSession(stored);
}

export async function updatePlanningSession(
  uid: string,
  id: string,
  input: z.infer<typeof updatePlanningSessionSchema>,
  store: PlanningSessionStore = firestoreStore,
  now = new Date(),
) {
  const current = await getPlanningSession(uid, id, store, now);
  const parsed = updatePlanningSessionSchema.parse(input);
  const updates: Partial<StoredPlanningSession> = { ...parsed, updatedAt: now.toISOString() };
  await store.update(uid, id, updates);
  return { ...current, ...parsed, updatedAt: updates.updatedAt! } as PlanningSession;
}

export async function deletePlanningSessions(uid: string, store: PlanningSessionStore = firestoreStore) {
  await store.deleteAll(uid);
}
