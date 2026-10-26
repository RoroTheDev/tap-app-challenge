import { createHash, randomUUID } from "node:crypto";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import twilio from "twilio";
import type { CoordinationStatus, CoordinationStatusResponse, TrustedContact } from "@tap/shared";
import { messagingMode, sendText } from "./adapters.js";
import type { ApiConfig } from "./config.js";
import { adminReady } from "./profile.js";

const CONFIRMATION_WINDOW_MS = 2 * 60 * 1000;

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

function contactHash(phone: string) {
  return createHash("sha256").update(normalizePhone(phone)).digest("hex");
}

export async function beginCoordination(
  uid: string,
  contact: TrustedContact,
  body: string,
  config: ApiConfig,
) {
  const id = randomUUID();
  const expiresAtDate = new Date(Date.now() + CONFIRMATION_WINDOW_MS);
  if (messagingMode(config) !== "twilio") {
    return { sent: false, simulated: true, messageId: `simulated-${Date.now()}`, confirmationId: id, status: "waiting" as const, expiresAt: expiresAtDate.toISOString() };
  }

  adminReady();
  const db = getFirestore();
  const hash = contactHash(contact.phone);
  const expiresAt = Timestamp.fromDate(expiresAtDate);
  const requestRef = db.doc(`coordinationRequests/${id}`);
  const indexRef = db.doc(`coordinationByContact/${hash}`);
  const existingIndex = await indexRef.get();
  const batch = db.batch();
  const existingRequestId = existingIndex.exists ? String(existingIndex.data()?.requestId ?? "") : "";
  if (existingRequestId) {
    batch.set(db.doc(`coordinationRequests/${existingRequestId}`), {
      status: "timed_out",
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  batch.set(requestRef, {
    uid,
    contactId: contact.id,
    contactHash: hash,
    channel: config.twilioChannel,
    status: "waiting",
    message: body,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    expiresAt,
  });
  batch.set(indexRef, { requestId: id, uid, expiresAt, updatedAt: FieldValue.serverTimestamp() });
  await batch.commit();

  try {
    const delivery = await sendText(contact.phone, `${body}\n\nReply YES to accept or NO to decline.`, config);
    await requestRef.update({ messageId: delivery.messageId, updatedAt: FieldValue.serverTimestamp() });
    return { ...delivery, confirmationId: id, status: "waiting" as const, expiresAt: expiresAtDate.toISOString() };
  } catch (error) {
    await Promise.all([
      requestRef.update({ status: "failed", updatedAt: FieldValue.serverTimestamp() }),
      indexRef.delete(),
    ]);
    throw error;
  }
}

export async function getCoordinationStatus(id: string, uid: string): Promise<CoordinationStatusResponse> {
  adminReady();
  const ref = getFirestore().doc(`coordinationRequests/${id}`);
  const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.data()?.uid !== uid) throw Object.assign(new Error("Confirmation was not found."), { status: 404 });
  const data = snapshot.data()!;
  let status = data.status as CoordinationStatus;
  const expiresAt = data.expiresAt as Timestamp;
  if (status === "waiting" && expiresAt.toMillis() <= Date.now()) {
    status = "timed_out";
    await ref.update({ status, updatedAt: FieldValue.serverTimestamp() });
  }
  return { id, status, expiresAt: expiresAt.toDate().toISOString() };
}

export function validateTwilioWebhook(signature: string, parameters: Record<string, string>, config: ApiConfig) {
  return Boolean(config.twilioAuthToken && signature && twilio.validateRequest(
    config.twilioAuthToken,
    signature,
    config.twilioWebhookUrl,
    parameters,
  ));
}

export function interpretCoordinationReply(body: string): "accepted" | "declined" | null {
  const normalized = body.trim().toLowerCase();
  if (/^(yes|y|accept|accepted|1)\b/.test(normalized)) return "accepted";
  if (/^(no|n|decline|declined|2)\b/.test(normalized)) return "declined";
  return null;
}

export async function handleIncomingReply(from: string, body: string) {
  adminReady();
  const db = getFirestore();
  const hash = contactHash(from);
  const indexRef = db.doc(`coordinationByContact/${hash}`);
  const indexSnapshot = await indexRef.get();
  if (!indexSnapshot.exists) return { handled: false, reply: "TAP could not find an active request." };
  const requestId = String(indexSnapshot.data()?.requestId ?? "");
  const requestRef = db.doc(`coordinationRequests/${requestId}`);
  const requestSnapshot = await requestRef.get();
  if (!requestSnapshot.exists) {
    await indexRef.delete();
    return { handled: false, reply: "TAP could not find an active request." };
  }
  const data = requestSnapshot.data()!;
  if (data.status !== "waiting") return { handled: false, reply: "This request is already complete." };
  const expiresAt = data.expiresAt as Timestamp;
  if (expiresAt.toMillis() <= Date.now()) {
    await requestRef.update({ status: "timed_out", updatedAt: FieldValue.serverTimestamp() });
    await indexRef.delete();
    return { handled: true, reply: "That request has timed out. TAP is preparing another option." };
  }

  const status: CoordinationStatus | null = interpretCoordinationReply(body);
  if (!status) return { handled: false, reply: "Please reply YES to accept or NO to decline." };
  const batch = db.batch();
  batch.update(requestRef, { status, responseReceivedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  batch.delete(indexRef);
  await batch.commit();
  return { handled: true, reply: status === "accepted" ? "Thanks — TAP marked the ride help as accepted." : "Thanks — TAP will prepare another transportation option." };
}

export function twimlReply(message: string) {
  const response = new twilio.twiml.MessagingResponse();
  response.message(message);
  return response.toString();
}

export async function deleteCoordinationData(uid: string) {
  adminReady();
  const db = getFirestore();
  const [requests, indexes] = await Promise.all([
    db.collection("coordinationRequests").where("uid", "==", uid).get(),
    db.collection("coordinationByContact").where("uid", "==", uid).get(),
  ]);
  const documents = [...requests.docs, ...indexes.docs];
  for (let start = 0; start < documents.length; start += 450) {
    const batch = db.batch();
    documents.slice(start, start + 450).forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
  return documents.length;
}
