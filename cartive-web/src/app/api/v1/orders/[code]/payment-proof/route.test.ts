import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { deleteStoredReceipt } from "@/lib/receipt-storage";
import { POST } from "./route";

vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));
vi.mock("@/lib/external-notifications", () => ({
  sendAdminAlert: vi.fn(async () => undefined),
  sendOrderStatusPush: vi.fn(async () => undefined),
}));
vi.mock("@/lib/member-session", () => ({
  getCurrentMember: vi.fn(async () => ({ id: "member_1" })),
}));
vi.mock("@/lib/rate-limit", () => ({
  consumeRateLimit: vi.fn(async () => ({ allowed: true, resetAt: new Date() })),
}));
vi.mock("@/lib/receipt-processing", () => ({
  processReceiptImage: vi.fn(async () => Buffer.from("processed")),
  ReceiptImageError: class ReceiptImageError extends Error {},
}));
vi.mock("@/lib/receipt-storage", () => ({
  storePrivateReceipt: vi.fn(async () => ({ client: {}, bucket: "receipts" })),
  deleteStoredReceipt: vi.fn(async () => undefined),
  disposeStorageClient: vi.fn(),
  StorageError: class StorageError extends Error {},
}));
vi.mock("@/lib/security", () => ({
  ConfigurationError: class ConfigurationError extends Error {},
  databaseUnavailableResponse: vi.fn(() => null),
  isSameOrigin: vi.fn(() => true),
}));

describe("POST /api/v1/orders/[code]/payment-proof", () => {
  const webOrder = { findFirst: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    webOrder.findFirst
      .mockResolvedValueOnce({
        id: "order_1",
        status: "AWAITING_PAYMENT",
        paymentProofKey: null,
      })
      .mockResolvedValueOnce(null);
    vi.mocked(getDb).mockReturnValue({
      webOrder,
      $transaction: vi.fn(async () => {
        throw new Prisma.PrismaClientKnownRequestError(
          "Unique constraint failed",
          {
            code: "P2002",
            clientVersion: "7.10.1",
            meta: { target: ["paymentProofHash"] },
          },
        );
      }),
    } as never);
  });

  it("returns a conflict and removes the stored file when another order claims the same proof concurrently", async () => {
    const form = new FormData();
    form.append("proof", new File([Buffer.from("proof")], "proof.jpg", { type: "image/jpeg" }));
    const request = new NextRequest("http://localhost/api/v1/orders/CRT-260101-ABC123/payment-proof", {
      method: "POST",
      headers: { origin: "http://localhost" },
      body: form,
    });

    const response = await POST(request, {
      params: Promise.resolve({ code: "CRT-260101-ABC123" }),
    });
    if (!response) throw new Error("Route did not return a response.");

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: { code: "DUPLICATE_PAYMENT_PROOF" },
    });
    expect(deleteStoredReceipt).toHaveBeenCalledWith(
      expect.stringMatching(/^orders\/order_1\/payment-proof\//),
    );
  });
});
