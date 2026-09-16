export function normalizeWhatsAppNumber(value?: string | null) {
  if (!value) return "";
  return value.replace(/[^\d]/g, "");
}

export function buildWhatsAppUrl(number?: string | null, message?: string) {
  const normalized = normalizeWhatsAppNumber(number);
  if (!normalized) return null;

  const params = new URLSearchParams();
  if (message?.trim()) {
    params.set("text", message.trim());
  }

  return `https://wa.me/${normalized}${params.toString() ? `?${params.toString()}` : ""}`;
}
