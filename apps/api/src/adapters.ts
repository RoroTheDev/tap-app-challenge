import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import twilio from "twilio";
import { z } from "zod";
import type {
  ConductorTag,
  ParsedIntent,
  PlaceCandidate,
  PlannerProfile,
  TransportOption,
} from "@tap/shared";
import type { ApiConfig } from "./config.js";

const intentSchema = z.object({
  goal: z.string(),
  category: z.enum(["shopping", "appointment", "social", "errand", "activity", "other"]),
  placeQuery: z.string(),
  timing: z.string(),
  assistanceNeeded: z.boolean(),
  tags: z.array(z.enum(["places", "transport", "contact", "fallback"])),
});

function mockIntent(request: string, profile: PlannerProfile): ParsedIntent {
  const text = request.toLowerCase();
  const category: ParsedIntent["category"] = text.includes("shop") || text.includes("store")
    ? "shopping"
    : text.includes("appointment") || text.includes("doctor")
      ? "appointment"
      : text.includes("friend") || text.includes("visit")
        ? "social"
        : text.includes("errand") ? "errand" : "activity";
  const placeQuery = category === "shopping" ? "accessible shopping stores"
    : category === "appointment" ? "medical offices"
      : category === "social" ? "quiet meeting places"
        : "senior-friendly activities";
  const tags: ConductorTag[] = ["places", "transport"];
  if (profile.trustedContactAvailable) tags.push("contact");
  tags.push("fallback");
  return {
    goal: request.trim(),
    category,
    placeQuery,
    timing: profile.preferredTimes[0] ?? "Flexible",
    assistanceNeeded: profile.mobility !== "none" || profile.accessibilitySupportRequested,
    tags,
  };
}

function normalizeTags(tags: ConductorTag[], trustedContactAvailable: boolean) {
  const result: ConductorTag[] = [];
  for (const required of ["places", "transport"] as const) if (!result.includes(required)) result.push(required);
  for (const tag of tags) {
    if (tag === "contact" && !trustedContactAvailable) continue;
    if (!result.includes(tag)) result.push(tag);
  }
  if (trustedContactAvailable && tags.includes("contact") && !result.includes("contact")) result.push("contact");
  if (!result.includes("fallback")) result.push("fallback");
  return result;
}

export async function parseIntent(request: string, profile: PlannerProfile, config: ApiConfig) {
  if (!config.openAiApiKey) return { value: mockIntent(request, profile), source: "mock" as const };
  try {
    const client = new OpenAI({ apiKey: config.openAiApiKey });
    const completion = await client.chat.completions.parse({
      model: config.openAiModel,
      messages: [
        {
          role: "system",
          content: "You are TAP's planning conductor for older adults. Convert the request into compact execution tags. Do not include phone numbers, exact addresses, or medical claims. Use the person's preferred language for goal, placeQuery, and timing. Always include fallback. Include contact only when trustedContactAvailable is true and coordination could help.",
        },
        { role: "user", content: JSON.stringify({ request, profile }) },
      ],
      response_format: zodResponseFormat(intentSchema, "tap_intent"),
    });
    const parsed = completion.choices[0]?.message.parsed;
    if (!parsed) throw new Error("The model returned no structured intent.");
    return {
      value: { ...parsed, tags: normalizeTags(parsed.tags, profile.trustedContactAvailable) },
      source: "openai" as const,
    };
  } catch (error) {
    console.warn("OpenAI intent parsing failed; using the deterministic planner.", error instanceof Error ? error.message : error);
    return { value: mockIntent(request, profile), source: "mock" as const };
  }
}

const mockPlaces: PlaceCandidate[] = [
  { id: "mock-1", name: "Fremont Hub Shopping Center", address: "Fremont, CA", mapsUrl: "https://maps.google.com/?q=Fremont+Hub", latitude: 37.5485, longitude: -121.9886, source: "mock" },
  { id: "mock-2", name: "Pacific Commons", address: "Fremont, CA", mapsUrl: "https://maps.google.com/?q=Pacific+Commons+Fremont", latitude: 37.5068, longitude: -121.9694, source: "mock" },
  { id: "mock-3", name: "Warm Springs Plaza", address: "Fremont, CA", mapsUrl: "https://maps.google.com/?q=Warm+Springs+Plaza+Fremont", latitude: 37.4936, longitude: -121.9287, source: "mock" },
];

export async function findPlaces(intent: ParsedIntent, profile: PlannerProfile, config: ApiConfig) {
  if (!config.googleMapsApiKey) return { value: mockPlaces, source: "mock" as const };
  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": config.googleMapsApiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.googleMapsUri,places.location",
      },
      body: JSON.stringify({ textQuery: `${intent.placeQuery} near ${profile.area}`, maxResultCount: 5 }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Places returned ${response.status}.`);
    const payload = await response.json() as { places?: Array<Record<string, unknown>> };
    const places = (payload.places ?? []).map((place): PlaceCandidate => {
      const location = place.location as { latitude?: number; longitude?: number } | undefined;
      const displayName = place.displayName as { text?: string } | undefined;
      return {
        id: String(place.id ?? crypto.randomUUID()),
        name: displayName?.text ?? "Nearby option",
        address: String(place.formattedAddress ?? profile.area),
        mapsUrl: String(place.googleMapsUri ?? ""),
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        source: "google",
      };
    });
    if (!places.length) throw new Error("Places returned no candidates.");
    return { value: places, source: "google" as const };
  } catch (error) {
    console.warn("Google Places failed; using nearby sample options.", error instanceof Error ? error.message : error);
    return { value: mockPlaces, source: "mock" as const };
  }
}

function travelMode(profile: PlannerProfile) {
  if (profile.transportModes.includes("Walk")) return "WALK";
  if (profile.transportModes.includes("Public transit")) return "TRANSIT";
  return "DRIVE";
}

function parseDuration(value: string | undefined) {
  const seconds = Number.parseFloat(value?.replace("s", "") ?? "0");
  return Math.max(1, Math.round(seconds / 60));
}

export async function computeTransport(place: PlaceCandidate, profile: PlannerProfile, index: number, config: ApiConfig): Promise<TransportOption> {
  const mockDuration = 12 + (index * 7);
  const mock: TransportOption = {
    mode: profile.transportModes[0] ?? "Family or friend",
    durationMinutes: mockDuration,
    distanceMiles: Number((2.3 + index * 1.8).toFixed(1)),
    feasible: profile.maxTravelMinutes === 0 || mockDuration <= profile.maxTravelMinutes,
    source: "mock",
  };
  if (!config.googleMapsApiKey) return mock;
  try {
    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": config.googleMapsApiKey,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: { address: profile.area },
        destination: { placeId: place.id },
        travelMode: travelMode(profile),
        computeAlternativeRoutes: false,
        languageCode: "en-US",
        units: "IMPERIAL",
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Routes returned ${response.status}.`);
    const payload = await response.json() as { routes?: Array<{ duration?: string; distanceMeters?: number }> };
    const route = payload.routes?.[0];
    if (!route) throw new Error("Routes returned no route.");
    const durationMinutes = parseDuration(route.duration);
    return {
      mode: travelMode(profile).toLowerCase(),
      durationMinutes,
      distanceMiles: Number((((route.distanceMeters ?? 0) / 1609.344)).toFixed(1)),
      feasible: profile.maxTravelMinutes === 0 || durationMinutes <= profile.maxTravelMinutes,
      source: "google",
    };
  } catch (error) {
    console.warn("Google Routes failed for a candidate; using a sample estimate.", error instanceof Error ? error.message : error);
    return mock;
  }
}

export function messagingMode(config: ApiConfig) {
  const sender = config.twilioChannel === "whatsapp" ? config.twilioWhatsappFrom : config.twilioPhoneNumber;
  return config.twilioAccountSid && config.twilioAuthToken && sender ? "twilio" as const : "mock" as const;
}

export async function sendText(to: string, body: string, config: ApiConfig) {
  if (messagingMode(config) !== "twilio") return { sent: false, simulated: true, messageId: `simulated-${Date.now()}` };
  const client = twilio(config.twilioAccountSid, config.twilioAuthToken);
  const whatsappTo = `whatsapp:${to.replace(/^whatsapp:/, "")}`;
  const message = await client.messages.create({
    to: config.twilioChannel === "whatsapp" ? whatsappTo : to,
    from: config.twilioChannel === "whatsapp" ? config.twilioWhatsappFrom : config.twilioPhoneNumber,
    body,
  });
  return { sent: true, simulated: false, messageId: message.sid };
}
