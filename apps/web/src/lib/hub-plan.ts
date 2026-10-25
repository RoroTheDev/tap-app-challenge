import type { HubCopy } from "./localization";

export type PlanTag = "places" | "transport" | "contact" | "fallback";

export interface HubPlanStep {
  tag: PlanTag;
  title: string;
  detail: string;
}

export interface HubPlan {
  request: string;
  steps: HubPlanStep[];
}

export function buildHubPlan(request: string, copy: HubCopy, trustedContactAvailable: boolean): HubPlan {
  const steps: HubPlanStep[] = [
    { tag: "places", title: copy.places, detail: copy.placesDetail },
    { tag: "transport", title: copy.transport, detail: copy.transportDetail },
  ];
  if (trustedContactAvailable) steps.push({ tag: "contact", title: copy.contact, detail: copy.contactDetail });
  steps.push({ tag: "fallback", title: copy.fallback, detail: copy.fallbackDetail });
  return { request: request.trim(), steps };
}

