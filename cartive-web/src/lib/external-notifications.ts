import "server-only";

import type { OrderStatus } from "@prisma/client";

type AdminAlertType = "claim_pending" | "order_created" | "payment_proof";
type ClaimReviewStatus = "APPROVED" | "REJECTED";

const adminAlertMessages: Record<AdminAlertType, string> = {
  claim_pending: "Klaim Fuel Card baru menunggu pemeriksaan di panel admin.",
  order_created: "Pesanan web baru masuk. Buka panel admin untuk melihat detail.",
  payment_proof: "Bukti pembayaran baru menunggu pemeriksaan di panel admin.",
};

const orderMessages: Record<OrderStatus, string> = {
  AWAITING_QUOTE: "Pesanan antar sedang menunggu penetapan ongkir.",
  AWAITING_PAYMENT: "Pesanan siap dibayar. Buka Cartive untuk melihat statusnya.",
  PAYMENT_REVIEW: "Bukti pembayaran sedang diperiksa oleh admin Cartive.",
  PAID: "Pembayaran pesananmu sudah dikonfirmasi.",
  PROCESSING: "Pesananmu mulai disiapkan.",
  READY: "Pesananmu siap. Buka Cartive untuk melihat detailnya.",
  COMPLETED: "Pesananmu selesai. Terima kasih sudah memilih Cartive.",
  CANCELLED: "Pesananmu dibatalkan. Buka Cartive untuk melihat status terbaru.",
};

function deploymentLabel() {
  const environment = process.env.CARTIVE_DEPLOYMENT_ENV?.trim() || "development";
  return environment.toUpperCase();
}

export async function sendAdminAlert(type: AdminAlertType) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
  if (!token && !chatId) return;
  if (!token || !chatId) {
    console.error("Telegram admin alerts are disabled: configure both bot token and chat ID.");
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `[${deploymentLabel()}] ${adminAlertMessages[type]}`,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error("Telegram admin alert delivery failed.", {
        event: type,
        status: response.status,
      });
    }
  } catch (error) {
    console.error("Telegram admin alert request failed.", {
      event: type,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }
}

async function sendCustomerPush(
  memberId: string,
  text: string,
  destination: "/kartu" | "/pesanan",
) {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim();
  const apiKey = process.env.ONESIGNAL_REST_API_KEY?.trim();
  if (!appId && !apiKey) return;
  if (!appId || !apiKey) {
    console.error("OneSignal push is disabled: configure both app ID and REST API key.");
    return;
  }

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    const url = siteUrl ? new URL(destination, siteUrl).toString() : undefined;
    const response = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: appId,
        target_channel: "push",
        include_aliases: { external_id: [memberId] },
        headings: { id: "Cartive" },
        contents: { id: text },
        ...(url ? { url } : {}),
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error("OneSignal customer push delivery failed.", {
        status: response.status,
        destination,
      });
    }
  } catch (error) {
    console.error("OneSignal customer push request failed.", {
      destination,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }
}

export function sendOrderStatusPush(
  memberId: string,
  status: OrderStatus,
  stampsAdded = 0,
) {
  const message =
    status === "PAID" && stampsAdded > 0
      ? `Pembayaran terkonfirmasi. ${stampsAdded} stamp sudah masuk ke Fuel Card.`
      : orderMessages[status];
  return sendCustomerPush(memberId, message, "/pesanan");
}

export function sendClaimReviewPush(
  memberId: string,
  status: ClaimReviewStatus,
  stampsAdded: number,
) {
  const message =
    status === "APPROVED"
      ? `Klaim disetujui. ${stampsAdded} stamp sudah ditambahkan ke Fuel Card.`
      : "Klaim belum disetujui. Periksa riwayat klaim di Fuel Card.";
  return sendCustomerPush(memberId, message, "/kartu");
}

export async function deleteOneSignalMember(memberId: string) {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim();
  const apiKey = process.env.ONESIGNAL_REST_API_KEY?.trim();
  if (!appId && !apiKey) return true;
  if (!appId || !apiKey) {
    console.error("OneSignal data removal is unavailable: configure both app ID and REST API key.");
    return false;
  }

  try {
    const response = await fetch(
      `https://api.onesignal.com/apps/${encodeURIComponent(appId)}/users/by/external_id/${encodeURIComponent(memberId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Key ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (response.ok || response.status === 404) return true;
    console.error("OneSignal member data removal failed.", { status: response.status });
    return false;
  } catch (error) {
    console.error("OneSignal member data removal request failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return false;
  }
}
