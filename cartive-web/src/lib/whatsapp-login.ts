import { createHmac, randomInt } from "node:crypto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const LOGIN_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

export class WhatsAppLoginConfigurationError extends Error {
  constructor() {
    super("Layanan kode masuk WhatsApp belum dikonfigurasi.");
    this.name = "WhatsAppLoginConfigurationError";
  }
}

export class WhatsAppDeliveryError extends Error {
  constructor() {
    super("Kode masuk tidak dapat dikirim melalui WhatsApp.");
    this.name = "WhatsAppDeliveryError";
  }
}

export function createLoginCode() {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
}

export function hashLoginCode(waNumber: string, code: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`member-login:${waNumber}:${code}`)
    .digest("hex");
}

export async function sendWhatsAppLoginCode(waNumber: string, code: string) {
  const phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim();
  const accessToken = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN?.trim();
  const templateName = process.env.WHATSAPP_LOGIN_TEMPLATE_NAME?.trim();
  const apiVersion = process.env.WHATSAPP_CLOUD_API_VERSION?.trim();
  const language = process.env.WHATSAPP_LOGIN_TEMPLATE_LANGUAGE?.trim() || "id";

  if (
    !phoneNumberId ||
    !accessToken ||
    !templateName ||
    !apiVersion ||
    !/^v\d+\.\d+$/.test(apiVersion) ||
    !/^[a-zA-Z0-9_]+$/.test(templateName) ||
    !/^[a-z]{2}(?:_[A-Z]{2})?$/.test(language)
  ) {
    throw new WhatsAppLoginConfigurationError();
  }

  let response: Response;
  try {
    response = await fetch(
      `https://graph.facebook.com/${apiVersion}/${encodeURIComponent(phoneNumberId)}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: waNumber,
          type: "template",
          template: {
            name: templateName,
            language: { code: language },
            components: [{
              type: "body",
              parameters: [{ type: "text", text: code }],
            }],
          },
        }),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      },
    );
  } catch {
    throw new WhatsAppDeliveryError();
  }

  if (!response.ok) throw new WhatsAppDeliveryError();
}
