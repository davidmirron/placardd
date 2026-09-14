export type ActionState = { error?: string; success?: string } | undefined;

export function fieldString(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function fieldNumber(form: FormData, key: string, fallback = 0) {
  const v = Number(fieldString(form, key).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(v) ? v : fallback;
}

export function dollarsToCents(value: string | number) {
  const n = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}
