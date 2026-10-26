import type { ActivityCandidate } from "@tap/shared";

export const FREMONT_AGE_WELL_SOURCE = {
  name: "City of Fremont Age Well Centers",
  url: "https://www.fremont.gov/government/departments/human-services/age-well-centers",
  verifiedAt: "2026-10-25",
} as const;

export function getCuratedSeniorActivities(area: string): ActivityCandidate[] {
  if (!/\bfremont\b/i.test(area)) return [];
  const provenance = {
    sourceUrl: FREMONT_AGE_WELL_SOURCE.url,
    lastVerifiedAt: FREMONT_AGE_WELL_SOURCE.verifiedAt,
    freshness: "verified" as const,
  };
  return [
    {
      id: "fremont-age-well-lake-elizabeth",
      title: "Age Well Center classes and activities",
      description: "Classes, fitness, social programs, workshops, and services for adults 55+ at Lake Elizabeth.",
      startLabel: "Weekdays — check the current activity calendar",
      costLabel: "Free and paid programs",
      accessibilityLabel: "Contact the center to confirm support for a specific class",
      registrationUrl: FREMONT_AGE_WELL_SOURCE.url,
      source: "curated",
      ...provenance,
      venue: {
        id: "fremont-age-well-lake-elizabeth",
        name: "Age Well Center at Lake Elizabeth",
        address: "40086 Paseo Padre Parkway, Fremont, CA 94538",
        mapsUrl: "https://maps.google.com/?q=Age+Well+Center+at+Lake+Elizabeth",
        latitude: null,
        longitude: null,
        source: "mock",
      },
    },
    {
      id: "fremont-age-well-south",
      title: "South Fremont senior activities",
      description: "Community, wellness, learning, and social activities designed for adults 55+.",
      startLabel: "Weekdays — check the current activity calendar",
      costLabel: "Free and paid programs",
      accessibilityLabel: "Contact the center to confirm support for a specific class",
      registrationUrl: FREMONT_AGE_WELL_SOURCE.url,
      source: "curated",
      ...provenance,
      venue: {
        id: "fremont-age-well-south",
        name: "Age Well Center at South Fremont",
        address: "47111 Mission Falls Court, Fremont, CA 94539",
        mapsUrl: "https://maps.google.com/?q=Age+Well+Center+at+South+Fremont",
        latitude: null,
        longitude: null,
        source: "mock",
      },
    },
  ];
}

export function sourceNeedsReview(activity: ActivityCandidate, now = new Date(), maximumAgeDays = 45) {
  if (activity.freshness === "live") return false;
  const verified = new Date(`${activity.lastVerifiedAt}T00:00:00Z`).getTime();
  if (!Number.isFinite(verified)) return true;
  return now.getTime() - verified > maximumAgeDays * 24 * 60 * 60 * 1000;
}
