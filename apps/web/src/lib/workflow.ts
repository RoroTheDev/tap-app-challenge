import type { CoordinationStatus, ParsedIntent } from "@tap/shared";

export type PlanningPhase = "understanding" | "discovering" | "transport" | "fallbacks" | "ready";

export interface FeatureDefinition {
  label: string;
  progressLabel: string;
  resultLabel: string;
}

const definitions: Record<ParsedIntent["category"], FeatureDefinition> = {
  shopping: { label: "Shopping plan", progressLabel: "Finding nearby stores", resultLabel: "Best shopping options" },
  activity: { label: "Activity finder", progressLabel: "Finding activities that fit you", resultLabel: "Activities selected for you" },
  appointment: { label: "Appointment plan", progressLabel: "Checking the destination and timing", resultLabel: "Best appointment routes" },
  social: { label: "Social plan", progressLabel: "Finding comfortable places to meet", resultLabel: "Best places to connect" },
  errand: { label: "Errand planner", progressLabel: "Finding the simplest nearby options", resultLabel: "Best errand options" },
  other: { label: "Personal plan", progressLabel: "Finding options that match your request", resultLabel: "Best options" },
};

export function getFeatureDefinition(category?: ParsedIntent["category"]) {
  return definitions[category ?? "other"];
}

export function getPhaseLabel(phase: PlanningPhase, category?: ParsedIntent["category"]) {
  if (phase === "understanding") return "Understanding what you need";
  if (phase === "discovering") return getFeatureDefinition(category).progressLabel;
  if (phase === "transport") return "Checking travel time and accessibility";
  if (phase === "fallbacks") return "Preparing backup options";
  return "Your plan is ready";
}

export function activePlanBranch(needsContact: boolean, status?: CoordinationStatus) {
  if (!needsContact) return "primary" as const;
  if (status === "accepted") return "primary" as const;
  if (status && ["declined", "timed_out", "failed"].includes(status)) return "fallback" as const;
  return "coordination" as const;
}
