export function normalizeWhatsAppNumber(value: string) {
  const compact = value.trim().replace(/[\s()+.-]/g, "");
  let normalized: string;

  if (compact.startsWith("0")) {
    normalized = `62${compact.slice(1)}`;
  } else if (compact.startsWith("8")) {
    normalized = `62${compact}`;
  } else {
    normalized = compact;
  }

  if (!/^62\d{8,13}$/.test(normalized)) {
    throw new Error("Nomor WhatsApp tidak valid.");
  }

  return normalized;
}

export function maskWhatsAppNumber(number: string) {
  return `+${number.slice(0, 4)} **** ${number.slice(-4)}`;
}
