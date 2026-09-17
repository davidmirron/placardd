/** Extra spots on a combined listing order, stored as a JSON string array of zone ids. */

export function parseAdditionalZoneIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string" && id.length > 0) : [];
  } catch {
    return [];
  }
}

export function serializeAdditionalZoneIds(ids: string[]): string {
  return JSON.stringify([...new Set(ids)]);
}

export function allOrderZoneIds(order: { zoneId: string; additionalZoneIds?: string | null }): string[] {
  return [order.zoneId, ...parseAdditionalZoneIds(order.additionalZoneIds)];
}

export function orderHoldsZone(order: { zoneId: string; additionalZoneIds?: string | null }, zoneId: string): boolean {
  return allOrderZoneIds(order).includes(zoneId);
}

export function orderSpotHeading(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "Spot";
  return labels.join(" + ");
}

export function orderLineDescription(labels: string[], listingTitle: string): string {
  return `${orderSpotHeading(labels)} · ${listingTitle}`;
}
