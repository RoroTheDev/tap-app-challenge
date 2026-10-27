import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import twilio from "twilio";
import { z } from "zod";
import type {
  ActivityCandidate,
  ConductorTag,
  ParsedIntent,
  PlaceCandidate,
  PlannerProfile,
  TransportOption,
} from "@tap/shared";
import type { ApiConfig } from "./config.js";
import { getCuratedSeniorActivities } from "./activity-sources.js";

const intentSchema = z.object({
  goal: z.string(),
  category: z.enum(["shopping", "appointment", "social", "errand", "activity", "other"]),
  placeQuery: z.string(),
  timing: z.string(),
  assistanceNeeded: z.boolean(),
  tags: z.array(z.enum(["places", "transport", "contact", "fallback"])),
});

export function classifyRequestCategory(request: string): ParsedIntent["category"] {
  const text = request.toLowerCase();
  if (/(shop|store|grocer|compras?|tienda|购物|商店|mamili|tindahan|mua sắm|cửa hàng|쇼핑|가게|تسوق|متجر|खरीदारी|दुकान)/u.test(text)) return "shopping";
  if (/(appointment|doctor|clinic|cita|médic|预约|医生|doktor|cuộc hẹn|bác sĩ|예약|의사|موعد|طبيب|मुलाकात|डॉक्टर)/u.test(text)) return "appointment";
  if (/(friend|visit|coffee|amig|visitar|朋友|拜访|kaibigan|bisita|bạn|gặp|친구|방문|صديق|زيارة|दोस्त|मिलना)/u.test(text)) return "social";
  if (/(errand|recado|办事|utos|việc vặt|심부름|مهمة|काम)/u.test(text)) return "errand";
  return "activity";
}

function mockIntent(request: string, profile: PlannerProfile): ParsedIntent {
  const category = classifyRequestCategory(request);
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
          content: "You are Cue's planning conductor for older adults. Convert the request into compact execution tags. Do not include phone numbers, exact addresses, or medical claims. Use the person's preferred language for goal, placeQuery, and timing. Always include fallback. Include contact only when trustedContactAvailable is true and coordination could help.",
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

export function placeSearchText(intent: ParsedIntent) {
  const goal = intent.goal.trim().toLowerCase();
  const genericAppointment = intent.category === "appointment"
    && (/^(help me )?(plan |schedule )?(a |an )?(doctor'?s? )?appointment\b/.test(goal) || goal === "i need an appointment");
  const genericFriendVisit = intent.category === "social"
    && /\b(visit|meet|see)\b.*\b(friend|family|relative)\b/.test(goal);

  if (genericAppointment) return "accessible primary care clinics";
  if (genericFriendVisit) return "quiet accessible cafes";
  return intent.placeQuery;
}

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
      body: JSON.stringify({ textQuery: `${placeSearchText(intent)} near ${profile.area}`, maxResultCount: 5 }),
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

function localAreaParts(area: string) {
  const [city = area, state = ""] = area.split(",").map((part) => part.trim());
  return { city, state: /^[A-Za-z]{2}$/.test(state) ? state.toUpperCase() : "" };
}

function eventStartLabel(start: { dateTime?: string; localDate?: string; localTime?: string } | undefined) {
  if (start?.dateTime) {
    const date = new Date(start.dateTime);
    if (!Number.isNaN(date.getTime())) return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }
  return [start?.localDate, start?.localTime].filter(Boolean).join(" at ") || "Date and time available from organizer";
}

function providerText(value: unknown, fallback: string, maximum: number) {
  const text = typeof value === "string" && value.trim() ? value.trim() : fallback;
  return text.length <= maximum ? text : `${text.slice(0, Math.max(0, maximum - 1)).trimEnd()}…`;
}

export async function findActivities(intent: ParsedIntent, profile: PlannerProfile, config: ApiConfig) {
  const curated = getCuratedSeniorActivities(profile.area);
  if (intent.category !== "activity") return { value: [] as ActivityCandidate[], source: "unavailable" as const };
  if (!config.ticketmasterApiKey) return { value: curated, source: curated.length ? "curated" as const : "unavailable" as const };
  try {
    const { city, state } = localAreaParts(profile.area);
    const query = new URLSearchParams({
      apikey: config.ticketmasterApiKey,
      countryCode: "US",
      startDateTime: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      endDateTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString().replace(/\.\d{3}Z$/, "Z"),
      size: "8",
      sort: "date,asc",
    });
    if (/fremont/i.test(profile.area)) {
      query.set("latlong", "37.5485,-121.9886");
      query.set("radius", "35");
      query.set("unit", "miles");
    } else {
      query.set("city", city);
      if (state) query.set("stateCode", state);
    }
    const response = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${query}`, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error(`Ticketmaster returned ${response.status}.`);
    const payload = await response.json() as { _embedded?: { events?: Array<Record<string, unknown>> } };
    const events = (payload._embedded?.events ?? []).flatMap((event): ActivityCandidate[] => {
      const embedded = event._embedded as { venues?: Array<Record<string, unknown>> } | undefined;
      const venue = embedded?.venues?.[0];
      if (!venue) return [];
      const address = venue.address as { line1?: string } | undefined;
      const eventCity = venue.city as { name?: string } | undefined;
      const eventState = venue.state as { stateCode?: string } | undefined;
      const location = venue.location as { latitude?: string; longitude?: string } | undefined;
      const dates = event.dates as { start?: { dateTime?: string; localDate?: string; localTime?: string } } | undefined;
      const price = (event.priceRanges as Array<{ min?: number; max?: number; currency?: string }> | undefined)?.[0];
      const accessibility = event.accessibility as { info?: string } | undefined;
      const venueName = providerText(venue.name, "Event venue", 160);
      const venueAddress = providerText([address?.line1, eventCity?.name, eventState?.stateCode].filter(Boolean).join(", "), profile.area, 300);
      return [{
        id: providerText(event.id, crypto.randomUUID(), 200),
        title: providerText(event.name, "Nearby event", 200),
        description: providerText(event.info ?? event.pleaseNote, "See the organizer page for event details.", 1_000),
        startLabel: providerText(eventStartLabel(dates?.start), "Date and time available from organizer", 200),
        costLabel: providerText(price?.min !== undefined ? `${price.currency ?? "$"} ${price.min}${price.max && price.max !== price.min ? `–${price.max}` : ""}` : "Check organizer for price", "Check organizer for price", 100),
        accessibilityLabel: providerText(accessibility?.info, "Accessibility not confirmed", 500),
        registrationUrl: providerText(event.url, "", 2_000),
        source: "ticketmaster",
        sourceUrl: providerText(event.url, "https://www.ticketmaster.com", 2_000),
        lastVerifiedAt: new Date().toISOString(),
        freshness: "live",
        venue: {
          id: `ticketmaster-${String(event.id ?? crypto.randomUUID())}`,
          name: venueName,
          address: venueAddress,
          mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(`${venueName} ${venueAddress}`)}`,
          latitude: location?.latitude ? Number(location.latitude) : null,
          longitude: location?.longitude ? Number(location.longitude) : null,
          source: "mock",
        },
      }];
    });
    return { value: [...curated, ...events].slice(0, 10), source: events.length ? "ticketmaster" as const : curated.length ? "curated" as const : "unavailable" as const };
  } catch (error) {
    console.warn("Ticketmaster failed; using verified local activities.", error instanceof Error ? error.message : error);
    return { value: curated, source: curated.length ? "curated" as const : "unavailable" as const };
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
        destination: place.source === "google" ? { placeId: place.id } : { address: place.address },
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
  try {
    const message = await client.messages.create({
      to: config.twilioChannel === "whatsapp" ? whatsappTo : to,
      from: config.twilioChannel === "whatsapp" ? config.twilioWhatsappFrom : config.twilioPhoneNumber,
      body,
      statusCallback: config.twilioStatusCallbackUrl,
    });
    return { sent: true, simulated: false, messageId: message.sid };
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? Number(error.code) : 0;
    const message = code === 63015
      ? "This contact must join the Cue WhatsApp Sandbox again before Cue can message them."
      : code === 63016
        ? "The WhatsApp conversation window has expired. Ask the contact to message the Sandbox, then try again."
        : code === 21211
          ? "The trusted contact phone number is not valid. Update the profile and try again."
          : "Twilio could not send this message. Check the sender and recipient setup, then try again.";
    throw Object.assign(new Error(message), { status: 502, cause: error });
  }
}
