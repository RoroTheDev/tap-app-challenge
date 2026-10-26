import {
  toPlannerProfile,
  type ConductorResponse,
  type CoordinationStatusResponse,
  type PlanningSession,
  type PlanningSessionPhase,
  type PlanningSessionStatus,
  type SendContactMessageResponse,
  type SeniorProfile,
  type TrustedContact,
} from "@tap/shared";
import { auth, type AppUser } from "./firebase";

const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "/api";

async function requestHeaders(user: AppUser) {
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(user.isDemo ? { "X-TAP-Preview": "true" } : {}),
  };
}

async function planningSessionRequest(user: AppUser, path: string, init?: RequestInit) {
  const response = await fetch(`${apiBase}/planning-sessions${path}`, {
    ...init,
    headers: await requestHeaders(user),
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 404) return null;
  const payload = await response.json().catch(() => ({})) as PlanningSession & { error?: string };
  if (!response.ok) throw new Error(payload.error || "TAP could not save this planning session.");
  return payload;
}

export function createPlanningSession(user: AppUser, id: string, request: string) {
  if (user.isDemo) return Promise.resolve(null);
  return planningSessionRequest(user, "", { method: "POST", body: JSON.stringify({ id, request }) });
}

export function readPlanningSession(user: AppUser, id: string) {
  if (user.isDemo) return Promise.resolve(null);
  return planningSessionRequest(user, `/${encodeURIComponent(id)}`);
}

export function updatePlanningSession(user: AppUser, id: string, update: {
  phase?: PlanningSessionPhase;
  status?: PlanningSessionStatus;
  plan?: ConductorResponse | null;
  coordinationStatus?: PlanningSession["coordinationStatus"];
  selectedOptionRank?: number | null;
}) {
  if (user.isDemo) return Promise.resolve(null);
  return planningSessionRequest(user, `/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(update) });
}

export async function requestConductorPlan(
  request: string,
  user: AppUser,
  profile: SeniorProfile,
  contacts: TrustedContact[],
): Promise<ConductorResponse> {
  const response = await fetch(`${apiBase}/conductor`, {
    method: "POST",
    headers: await requestHeaders(user),
    body: JSON.stringify({
      request,
      ...(user.isDemo ? { previewProfile: toPlannerProfile(profile, contacts) } : {}),
    }),
    signal: AbortSignal.timeout(65_000),
  });
  const payload = await response.json().catch(() => ({})) as ConductorResponse & { error?: string };
  if (!response.ok) throw new Error(payload.error || "TAP could not prepare the plan.");
  return payload;
}

export async function sendContactRequest(user: AppUser, contact: TrustedContact, message: string) {
  const response = await fetch(`${apiBase}/contact-message`, {
    method: "POST",
    headers: await requestHeaders(user),
    body: JSON.stringify({ confirmed: true, contactId: contact.id, message, ...(user.isDemo ? { previewPhone: contact.phone } : {}) }),
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await response.json().catch(() => ({})) as SendContactMessageResponse & { error?: string };
  if (!response.ok) throw new Error(payload.error || "TAP could not contact this person.");
  return payload;
}

export async function readCoordinationStatus(user: AppUser, confirmationId: string) {
  const response = await fetch(`${apiBase}/coordination/${encodeURIComponent(confirmationId)}`, {
    headers: await requestHeaders(user),
    signal: AbortSignal.timeout(10_000),
  });
  const payload = await response.json().catch(() => ({})) as CoordinationStatusResponse & { error?: string };
  if (!response.ok) throw new Error(payload.error || "TAP could not check the reply.");
  return payload;
}

export async function deleteConductorData(user: AppUser) {
  if (user.isDemo) return;
  const response = await fetch(`${apiBase}/profile-data`, {
    method: "DELETE",
    headers: await requestHeaders(user),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok && response.status !== 404) throw new Error("TAP could not delete conductor activity.");
}
