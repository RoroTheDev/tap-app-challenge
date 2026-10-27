import type { ActivityCandidate, RankedPlanOption } from "@tap/shared";

export interface SharePlanData {
  title: string;
  text: string;
  url: string;
}

export function buildSharePlanData(option: RankedPlanOption, activity?: ActivityCandidate): SharePlanData {
  const title = activity?.title ?? option.place.name;
  const details = [
    `Cue plan: ${title}`,
    activity?.startLabel ? `When: ${activity.startLabel}` : "",
    `Place: ${option.place.name}`,
    `Address: ${option.place.address}`,
    `Travel: ${option.transport.durationMinutes} minutes ${option.transport.mode.toLowerCase()}`,
    activity?.costLabel ? `Cost: ${activity.costLabel}` : "",
  ].filter(Boolean);
  return {
    title,
    text: details.join("\n"),
    url: activity?.registrationUrl || activity?.sourceUrl || option.place.mapsUrl,
  };
}

export async function sharePlan(data: SharePlanData): Promise<"shared" | "copied" | "cancelled"> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share(data);
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  await navigator.clipboard.writeText(`${data.text}\n${data.url}`);
  return "copied";
}
