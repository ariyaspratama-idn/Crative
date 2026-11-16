import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authorizeAdmin } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { sendOrderStatusPush } from "@/lib/external-notifications";
import { POST } from "./route";

vi.mock("@/lib/admin-auth", () => ({
  authorizeAdmin: vi.fn(async () => ({ email: "admin@example.test" })),
}));
vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));
vi.mock("@/lib/external-notifications", () => ({
  sendOrderStatusPush: vi.fn(async () => undefined),
}));
vi.mock("@/lib/security", () => ({
  databaseUnavailableResponse: vi.fn(() => null),
  isSameOrigin: vi.fn(() => true),
}));

describe("POST /api/v1/admin/orders/[orderId]/status", () => {
  const transaction = {
    webOrder: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    stampLedger: { create: vi.fn() },
    member: { update: vi.fn() },
    adminAuditLog: { create: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    transaction.webOrder.findUnique.mockResolvedValue({
      id: "order_1",
      code: "CRT-260101-ABC123",
      memberId: "member_1",
      status: "PAYMENT_REVIEW",
      fulfillment: "PICKUP",
      subtotal: 40000,
      discount: 0,
      rewardId: null,
      paymentProofKey: "orders/order_1/proof.webp",
      items: [
        { quantity: 2, isReward: false },
        { quantity: 1, isReward: true },
      ],
    });
    transaction.webOrder.updateMany.mockResolvedValue({ count: 1 });
    transaction.stampLedger.create.mockResolvedValue({});
    transaction.member.update.mockResolvedValue({});
    transaction.adminAuditLog.create.mockResolvedValue({});
    vi.mocked(getDb).mockReturnValue({
      $transaction: (callback: (tx: typeof transaction) => unknown) => callback(transaction),
    } as never);
    vi.mocked(authorizeAdmin).mockResolvedValue({ email: "admin@example.test" });
  });

  function makeRequest() {
    return new NextRequest("http://localhost/api/v1/admin/orders/order_1/status", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost",
      },
      body: JSON.stringify({ action: "CONFIRM_PAYMENT" }),
    });
  }

  it("adds two stamps per paid bottle and records the payment audit", async () => {
    const response = await POST(makeRequest(), {
      params: Promise.resolve({ orderId: "order_1" }),
    });
    if (!response) throw new Error("Route did not return a response.");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: { status: "PAID", stampsAdded: 4 },
    });
    expect(sendOrderStatusPush).toHaveBeenCalledWith("member_1", "PAID", 4);
    expect(transaction.webOrder.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: "order_1",
        status: "PAYMENT_REVIEW",
        paymentProofKey: { not: null },
      },
    }));
    expect(transaction.stampLedger.create).toHaveBeenCalledWith({
      data: {
        memberId: "member_1",
        delta: 4,
        reason: "WEB_ORDER",
        refType: "WebOrder",
        refId: "order_1",
      },
    });
    expect(transaction.member.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "member_1" },
      data: expect.objectContaining({ stampExpiryProcessedAt: null }),
    }));
    expect(transaction.adminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "ORDER_PAYMENT_CONFIRMED",
        entityId: "order_1",
        metadata: { stampsAdded: 4 },
      }),
    }));
  });

  it("does not award stamps if another request changed the payment status first", async () => {
    transaction.webOrder.updateMany.mockResolvedValue({ count: 0 });

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ orderId: "order_1" }),
    });
    if (!response) throw new Error("Route did not return a response.");

    expect(response.status).toBe(409);
    expect(transaction.stampLedger.create).not.toHaveBeenCalled();
    expect(transaction.member.update).not.toHaveBeenCalled();
    expect(transaction.adminAuditLog.create).not.toHaveBeenCalled();
  });

  it("refuses to confirm payment when no proof is attached", async () => {
    transaction.webOrder.findUnique.mockResolvedValue({
      id: "order_1",
      code: "CRT-260101-ABC123",
      memberId: "member_1",
      status: "PAYMENT_REVIEW",
      fulfillment: "PICKUP",
      subtotal: 40000,
      discount: 0,
      rewardId: null,
      paymentProofKey: null,
      items: [{ quantity: 2, isReward: false }],
    });

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ orderId: "order_1" }),
    });
    if (!response) throw new Error("Route did not return a response.");

    expect(response.status).toBe(409);
    expect(transaction.webOrder.updateMany).not.toHaveBeenCalled();
    expect(transaction.stampLedger.create).not.toHaveBeenCalled();
  });
});
