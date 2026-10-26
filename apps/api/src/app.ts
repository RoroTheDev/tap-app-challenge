import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { z } from "zod";
import { conduct } from "./conductor.js";
import { readConfig, type ApiConfig } from "./config.js";
import { authenticate, loadPlannerProfile } from "./profile.js";
import { beginCoordination, deleteCoordinationData, getCoordinationStatus, handleIncomingReply, twimlReply, validateTwilioWebhook } from "./coordination.js";
import {
  createPlanningSession,
  createPlanningSessionSchema,
  deletePlanningSessions,
  getPlanningSession,
  updatePlanningSession,
  updatePlanningSessionSchema,
} from "./planning-sessions.js";

const conductorRequestSchema = z.object({ request: z.string().trim().min(2).max(500), previewProfile: z.unknown().optional() });
const messageRequestSchema = z.object({
  confirmed: z.literal(true),
  message: z.string().trim().min(1).max(800),
  contactId: z.string().trim().max(100).optional(),
  previewPhone: z.string().trim().max(30).optional(),
});

export function createApp(config: ApiConfig = readConfig()) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: config.webOrigin, methods: ["GET", "POST", "PATCH", "DELETE"], allowedHeaders: ["Content-Type", "Authorization", "X-TAP-Preview"] }));
  app.use(express.json({ limit: "32kb" }));
  app.use(express.urlencoded({ extended: false, limit: "32kb" }));

  app.get(["/health", "/api/health"], (_request, response) => {
    response.json({ ok: true, mocksAllowed: config.allowMocks });
  });

  app.post(["/conductor", "/api/conductor"], async (request, response, next) => {
    try {
      const input = conductorRequestSchema.parse(request.body);
      const identity = await authenticate(request, config);
      const { profile } = await loadPlannerProfile(identity, input);
      response.json(await conduct(input.request, profile, config));
    } catch (error) { next(error); }
  });

  app.post(["/contact-message", "/api/contact-message"], async (request, response, next) => {
    try {
      const input = messageRequestSchema.parse(request.body);
      const identity = await authenticate(request, config);
      const { contacts } = await loadPlannerProfile(identity, request.body);
      const contact = identity.preview ? null : (input.contactId ? contacts.find((item) => item.id === input.contactId) : contacts.find((item) => item.isPrimary));
      if (!identity.preview && (!contact?.permissionConfirmed || !contact.canReceiveSms || !contact.phone)) {
        throw Object.assign(new Error("No approved SMS contact is available."), { status: 409 });
      }
      const destination = identity.preview ? input.previewPhone : contact?.phone;
      if (!destination) throw Object.assign(new Error("A message destination is required."), { status: 400 });
      if (identity.preview) {
        response.json({ sent: false, simulated: true, messageId: `simulated-${Date.now()}`, confirmationId: `preview-${Date.now()}`, status: "waiting", expiresAt: new Date(Date.now() + 120_000).toISOString() });
        return;
      }
      response.json(await beginCoordination(identity.uid, contact!, input.message, config));
    } catch (error) { next(error); }
  });

  app.post(["/planning-sessions", "/api/planning-sessions"], async (request, response, next) => {
    try {
      const identity = await authenticate(request, config);
      if (identity.preview) throw Object.assign(new Error("Preview planning sessions stay in this browser."), { status: 409 });
      const input = createPlanningSessionSchema.parse(request.body);
      response.status(201).json(await createPlanningSession(identity.uid, input));
    } catch (error) { next(error); }
  });

  app.get(["/planning-sessions/:id", "/api/planning-sessions/:id"], async (request, response, next) => {
    try {
      const identity = await authenticate(request, config);
      if (identity.preview) throw Object.assign(new Error("Preview planning sessions stay in this browser."), { status: 409 });
      response.json(await getPlanningSession(identity.uid, String(request.params.id)));
    } catch (error) { next(error); }
  });

  app.patch(["/planning-sessions/:id", "/api/planning-sessions/:id"], async (request, response, next) => {
    try {
      const identity = await authenticate(request, config);
      if (identity.preview) throw Object.assign(new Error("Preview planning sessions stay in this browser."), { status: 409 });
      const input = updatePlanningSessionSchema.parse(request.body);
      response.json(await updatePlanningSession(identity.uid, String(request.params.id), input));
    } catch (error) { next(error); }
  });

  app.get(["/coordination/:id", "/api/coordination/:id"], async (request, response, next) => {
    try {
      const identity = await authenticate(request, config);
      if (identity.preview) throw Object.assign(new Error("Preview confirmations are simulated."), { status: 409 });
      response.json(await getCoordinationStatus(String(request.params.id), identity.uid));
    } catch (error) { next(error); }
  });

  app.post(["/twilio/incoming", "/api/twilio/incoming"], async (request, response, next) => {
    try {
      const parameters = Object.fromEntries(Object.entries(request.body as Record<string, unknown>).map(([key, value]) => [key, String(value)]));
      if (!validateTwilioWebhook(request.header("x-twilio-signature") ?? "", parameters, config)) {
        response.status(403).type("text/plain").send("Invalid Twilio signature.");
        return;
      }
      const result = await handleIncomingReply(parameters.From ?? "", parameters.Body ?? "");
      response.type("text/xml").send(twimlReply(result.reply));
    } catch (error) { next(error); }
  });

  app.delete(["/profile-data", "/api/profile-data"], async (request, response, next) => {
    try {
      const identity = await authenticate(request, config);
      if (!identity.preview) await Promise.all([deleteCoordinationData(identity.uid), deletePlanningSessions(identity.uid)]);
      response.status(204).send();
    } catch (error) { next(error); }
  });

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    const status = error instanceof z.ZodError ? 400 : typeof error === "object" && error && "status" in error ? Number(error.status) : 500;
    const message = status >= 500 ? "TAP could not prepare the plan. Please try again." : error instanceof Error ? error.message : "Invalid request.";
    if (status >= 500) console.error(error);
    response.status(status).json({ error: message });
  });
  return app;
}
