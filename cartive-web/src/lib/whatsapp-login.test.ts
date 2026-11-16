import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createLoginCode,
  hashLoginCode,
  LOGIN_CODE_PATTERN,
  sendWhatsAppLoginCode,
  WhatsAppDeliveryError,
  WhatsAppLoginConfigurationError,
} from "./whatsapp-login";

const envKeys = [
  "WHATSAPP_CLOUD_PHONE_NUMBER_ID",
  "WHATSAPP_CLOUD_ACCESS_TOKEN",
  "WHATSAPP_CLOUD_API_VERSION",
  "WHATSAPP_LOGIN_TEMPLATE_NAME",
  "WHATSAPP_LOGIN_TEMPLATE_LANGUAGE",
] as const;
const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of envKeys) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("kode masuk WhatsApp", () => {
  it("membuat kode enam karakter tanpa huruf atau angka yang mudah tertukar", () => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const code = createLoginCode();
      expect(LOGIN_CODE_PATTERN.test(code)).toBe(true);
      expect(code).not.toMatch(/[01IO]/);
    }
  });

  it("mengikat hash kode ke nomor dan kode yang dimasukkan", () => {
    const secret = "test-session-secret-with-at-least-32-chars";
    const original = hashLoginCode("6281234567890", "ABC234", secret);
    expect(hashLoginCode("6281234567890", "ABC234", secret)).toBe(original);
    expect(hashLoginCode("6281234567891", "ABC234", secret)).not.toBe(original);
    expect(hashLoginCode("6281234567890", "ABC235", secret)).not.toBe(original);
  });

  it("gagal tertutup saat konfigurasi WhatsApp belum lengkap", async () => {
    for (const key of envKeys) delete process.env[key];
    await expect(sendWhatsAppLoginCode("6281234567890", "ABC234"))
      .rejects.toBeInstanceOf(WhatsAppLoginConfigurationError);
  });

  it("mengirim template OTP melalui provider tanpa membocorkan token di URL", async () => {
    process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID = "phone-id";
    process.env.WHATSAPP_CLOUD_ACCESS_TOKEN = "private-token";
    process.env.WHATSAPP_CLOUD_API_VERSION = "v25.0";
    process.env.WHATSAPP_LOGIN_TEMPLATE_NAME = "cartive_login_code";
    process.env.WHATSAPP_LOGIN_TEMPLATE_LANGUAGE = "id";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendWhatsAppLoginCode("6281234567890", "ABC234");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://graph.facebook.com/v25.0/phone-id/messages");
    expect(url).not.toContain("private-token");
    expect(new Headers(options.headers).get("authorization")).toBe("Bearer private-token");
    expect(JSON.parse(String(options.body))).toMatchObject({
      messaging_product: "whatsapp",
      to: "6281234567890",
      template: {
        name: "cartive_login_code",
        components: [{ type: "body", parameters: [{ type: "text", text: "ABC234" }] }],
      },
    });
  });

  it("tidak menganggap kegagalan provider sebagai kode terkirim", async () => {
    process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID = "phone-id";
    process.env.WHATSAPP_CLOUD_ACCESS_TOKEN = "private-token";
    process.env.WHATSAPP_CLOUD_API_VERSION = "v25.0";
    process.env.WHATSAPP_LOGIN_TEMPLATE_NAME = "cartive_login_code";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 400 })));
    await expect(sendWhatsAppLoginCode("6281234567890", "ABC234"))
      .rejects.toBeInstanceOf(WhatsAppDeliveryError);
  });
});
