import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authorizeAdmin } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { PATCH } from "./route";

vi.mock("@/lib/admin-auth", () => ({
  authorizeAdmin: vi.fn(async () => ({ email: "admin@example.test" })),
}));
vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));
vi.mock("@/lib/security", () => ({
  databaseUnavailableResponse: vi.fn(() => null),
  isSameOrigin: vi.fn(() => true),
}));

describe("PATCH /api/v1/admin/batches/[batchId]", () => {
  const transaction = {
    productBatch: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    orderBatchAllocation: {
      aggregate: vi.fn(),
    },
    adminAuditLog: {
      create: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    transaction.productBatch.findUnique.mockResolvedValue({
      id: "batch_1",
      productId: "product_1",
      batchCode: "BATCH-1",
      quantityProduced: 10,
      quantityAvailable: 2,
      isActive: true,
    });
    transaction.orderBatchAllocation.aggregate.mockResolvedValue({
      _sum: { quantity: 8 },
    });
    transaction.productBatch.updateMany.mockResolvedValue({ count: 1 });
    transaction.adminAuditLog.create.mockResolvedValue({});
    vi.mocked(getDb).mockReturnValue({
      $transaction: (callback: (tx: typeof transaction) => unknown) => callback(transaction),
    } as never);
    vi.mocked(authorizeAdmin).mockResolvedValue({ email: "admin@example.test" });
  });

  it("rejects restoring stock already allocated to non-cancelled orders", async () => {
    const request = new NextRequest("http://localhost/api/v1/admin/batches/batch_1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quantityAvailable: 3 }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ batchId: "batch_1" }),
    });
    if (!response) throw new Error("Route did not return a response.");

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "INVALID_STOCK" },
    });
    expect(transaction.productBatch.updateMany).not.toHaveBeenCalled();
  });

  it("allows correcting remaining stock up to production minus active allocations", async () => {
    const request = new NextRequest("http://localhost/api/v1/admin/batches/batch_1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quantityAvailable: 2 }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ batchId: "batch_1" }),
    });
    if (!response) throw new Error("Route did not return a response.");

    expect(response.status).toBe(200);
    expect(transaction.orderBatchAllocation.aggregate).toHaveBeenCalledWith({
      where: {
        batchId: "batch_1",
        order: { isNot: { status: "CANCELLED" } },
      },
      _sum: { quantity: true },
    });
    expect(transaction.productBatch.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { quantityAvailable: 2, isActive: true } }),
    );
  });
});
