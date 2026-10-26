import type { PlaceCandidate } from "@tap/shared";

export function buildUberDeepLink(clientId: string | undefined, destination: PlaceCandidate | undefined) {
  if (!clientId?.trim() || !destination) return "https://m.uber.com/";
  const params = new URLSearchParams({ client_id: clientId.trim(), pickup: "my_location" });
  params.set("drop[0]", JSON.stringify({
    ...(destination.latitude !== null ? { latitude: destination.latitude } : {}),
    ...(destination.longitude !== null ? { longitude: destination.longitude } : {}),
    addressLine1: destination.name,
    addressLine2: destination.address,
  }));
  return `https://m.uber.com/looking?${params.toString()}`;
}
