import { randomBytes } from "node:crypto";
import type { OrderStatus } from "@prisma/client";

export const orderStatusLabels: Record<OrderStatus, string> = {
  AWAITING_QUOTE: "Menunggu konfirmasi ongkir",
  AWAITING_PAYMENT: "Menunggu pembayaran",
  PAYMENT_REVIEW: "Bukti pembayaran sedang diperiksa",
  PAID: "Pembayaran dikonfirmasi",
  PROCESSING: "Pesanan diproses",
  READY: "Siap diambil / dikirim",
  COMPLETED: "Pesanan selesai",
  CANCELLED: "Pesanan dibatalkan",
};

export function createOrderCode(now = new Date()) {
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(now).split("/").reverse().join("");
  return `CRT-${date}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export function getQrisImageUrl() {
  const value = process.env.PAYMENT_QRIS_IMAGE_URL?.trim();
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
