import type { ConductorResponse, PlannerProfile } from "@tap/shared";
import { computeTransport, findActivities, findPlaces, messagingMode, parseIntent } from "./adapters.js";
import type { ApiConfig } from "./config.js";

export async function conduct(request: string, profile: PlannerProfile, config: ApiConfig): Promise<ConductorResponse> {
  const parsed = await parseIntent(request, profile, config);
  const [places, activities, fallbackOptions, contactDraft] = await Promise.all([
    findPlaces(parsed.value, profile, config),
    findActivities(parsed.value, profile, config),
    Promise.resolve([
      `Try the next closest ${parsed.value.placeQuery.toLowerCase()} option.`,
      "Choose a different travel mode or time.",
      profile.trustedContactAvailable ? "Ask your trusted contact for help." : "Try again with a broader nearby search.",
    ]),
    Promise.resolve(profile.trustedContactAvailable
      ? `Hi, ${profile.firstName} would like help with this plan: ${parsed.value.goal}. Are you available to help coordinate?`
      : ""),
  ]);

  const planPlaces = parsed.value.category === "activity" && activities.value.length
    ? activities.value.map((activity) => activity.venue)
    : places.value;
  const transports = await Promise.all(planPlaces.map((place, index) => computeTransport(place, profile, index, config)));
  const rankedOptions = planPlaces
    .map((place, index) => ({
      place,
      transport: transports[index],
      score: (transports[index].feasible ? 100 : 0) - transports[index].durationMinutes,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, profile.planPreference === "simple" ? 1 : profile.planPreference === "balanced" ? 3 : 5)
    .map(({ place, transport }, index) => ({
      rank: index + 1,
      place,
      transport,
      reason: transport.feasible
        ? `${transport.durationMinutes} minutes away and within the usual travel limit.`
        : `A backup option if extra travel time is acceptable.`,
    }));

  const messageMode = messagingMode(config);
  const steps: ConductorResponse["steps"] = parsed.value.tags.map((tag) => {
    if (tag === "places") return {
      tag,
      title: parsed.value.category === "activity" ? "Find activities that fit" : "Find the best nearby options",
      detail: `${planPlaces.length} candidates prepared.`,
      status: places.source === "google" || activities.source === "ticketmaster" || activities.source === "curated" ? "ready" : "simulated",
    };
    if (tag === "transport") return { tag, title: "Check how to get there", detail: "Travel time and the user's preferred transportation were compared.", status: transports.some((item) => item.source === "google") ? "ready" : "simulated" };
    if (tag === "contact") return { tag, title: "Prepare trusted-contact help", detail: "A message is drafted and will not be sent without confirmation.", status: "needs_confirmation" };
    return { tag, title: "Keep backup choices ready", detail: "Fallback choices are ready if the first plan is unavailable.", status: "ready" };
  });

  return {
    request,
    intent: parsed.value,
    steps,
    rankedOptions,
    activities: activities.value,
    fallbackOptions,
    contactMessage: {
      available: profile.trustedContactAvailable,
      recipientLabel: profile.trustedContactAvailable ? "Primary trusted contact" : "No approved contact",
      draft: contactDraft,
      delivery: profile.trustedContactAvailable ? (messageMode === "twilio" ? "ready" : "simulated") : "unavailable",
    },
    integrations: {
      intent: parsed.source,
      places: places.source,
      routes: transports.some((item) => item.source === "google") ? "google" : "mock",
      messaging: profile.trustedContactAvailable ? messageMode : "unavailable",
      events: activities.source,
    },
  };
}
