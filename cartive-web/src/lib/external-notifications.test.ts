import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteOneSignalMember,
  sendAdminAlert,
  sendClaimReviewPush,
  sendOrderStatusPush,
} from "./external-notifications";

vi.mock("server-only", () => ({}));

describe("optional external notifications", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("keeps all providers disabled when their credentials are absent", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    vi.stubEnv("TELEGRAM_ADMIN_CHAT_ID", "");
    vi.stubEnv("NEXT_PUBLIC_ONESIGNAL_APP_ID", "");
    vi.stubEnv("ONESIGNAL_REST_API_KEY", "");

    await sendAdminAlert("order_created");
    await sendOrderStatusPush("member-1", "PAID", 2);
    await sendClaimReviewPush("member-1", "APPROVED", 1);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends Telegram alerts without customer or order details", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
    vi.stubEnv("TELEGRAM_ADMIN_CHAT_ID", "test-chat");
    vi.stubEnv("CARTIVE_DEPLOYMENT_ENV", "staging");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendAdminAlert("payment_proof");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.telegram.org/bottest-token/sendMessage",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          chat_id: "test-chat",
          text: "[STAGING] Bukti pembayaran baru menunggu pemeriksaan di panel admin.",
          disable_web_page_preview: true,
        }),
      }),
    );
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).not.toContain("waNumber");
  });

  it("targets a single OneSignal user and uses localized, non-sensitive copy", async () => {
    vi.stubEnv("NEXT_PUBLIC_ONESIGNAL_APP_ID", "app-id");
    vi.stubEnv("ONESIGNAL_REST_API_KEY", "server-secret");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://staging.cartive.example");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendOrderStatusPush("opaque-member-id", "PAID", 2);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.onesignal.com/notifications",
      expect.objectContaining({
        headers: {
          Authorization: "Key server-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app_id: "app-id",
          target_channel: "push",
          include_aliases: { external_id: ["opaque-member-id"] },
          headings: { id: "Cartive" },
          contents: { id: "Pembayaran terkonfirmasi. 2 stamp sudah masuk ke Fuel Card." },
          url: "https://staging.cartive.example/pesanan",
        }),
      }),
    );
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).not.toContain("628");
  });

  it("logs provider failures without throwing into the business request", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
    vi.stubEnv("TELEGRAM_ADMIN_CHAT_ID", "test-chat");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 503 })));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(sendAdminAlert("claim_pending")).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      "Telegram admin alert delivery failed.",
      { event: "claim_pending", status: 503 },
    );
  });

  it("deletes an opted-in member from OneSignal before local account erasure", async () => {
    vi.stubEnv("NEXT_PUBLIC_ONESIGNAL_APP_ID", "app-id");
    vi.stubEnv("ONESIGNAL_REST_API_KEY", "server-secret");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteOneSignalMember("opaque-member-id")).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.onesignal.com/apps/app-id/users/by/external_id/opaque-member-id",
      expect.objectContaining({
        method: "DELETE",
        headers: { Authorization: "Key server-secret" },
      }),
    );
  });

  it("does not report an external erasure as successful when OneSignal is unavailable", async () => {
    vi.stubEnv("NEXT_PUBLIC_ONESIGNAL_APP_ID", "app-id");
    vi.stubEnv("ONESIGNAL_REST_API_KEY", "server-secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 503 })));

    await expect(deleteOneSignalMember("opaque-member-id")).resolves.toBe(false);
  });
});
