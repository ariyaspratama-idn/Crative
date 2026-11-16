import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { deleteStoredReceipt } from "@/lib/receipt-storage";
import { GET } from "./route";

vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));
vi.mock("@/lib/receipt-storage", () => ({
  deleteStoredReceipt: vi.fn(),
}));
vi.mock("@/lib/security", () => ({
  databaseUnavailableResponse: vi.fn(() => null),
}));

describe("GET /api/cron/maintenance", () => {
  const transaction = {
    claim: { updateMany: vi.fn() },
    webOrder: { updateMany: vi.fn() },
    adminAuditLog: { create: vi.fn() },
  };
  const db = {
    member: { findMany: vi.fn() },
    claim: { findMany: vi.fn() },
    webOrder: { findMany: vi.fn() },
    adminAuditLog: { deleteMany: vi.fn() },
    rateLimitBucket: { deleteMany: vi.fn() },
    reward: { updateMany: vi.fn() },
    loginChallenge: { deleteMany: vi.fn() },
    $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  };
  const secret = "cron-test-secret".repeat(3);

  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", secret);
    vi.clearAllMocks();
    db.member.findMany.mockResolvedValue([]);
    db.claim.findMany.mockResolvedValue([]);
    db.webOrder.findMany.mockResolvedValue([]);
    db.adminAuditLog.deleteMany.mockResolvedValue({ count: 0 });
    db.rateLimitBucket.deleteMany.mockResolvedValue({ count: 0 });
    db.reward.updateMany.mockResolvedValue({ count: 0 });
    db.loginChallenge.deleteMany.mockResolvedValue({ count: 0 });
    transaction.claim.updateMany.mockResolvedValue({ count: 1 });
    transaction.webOrder.updateMany.mockResolvedValue({ count: 1 });
    transaction.adminAuditLog.create.mockResolvedValue({});
    vi.mocked(getDb).mockReturnValue(db as never);
    vi.mocked(deleteStoredReceipt).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function makeRequest(authorization = `Bearer ${secret}`) {
    return new Request("http://localhost/api/cron/maintenance", {
      headers: { authorization },
    });
  }

  it("does not run maintenance without a configured bearer secret", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const response = await GET(makeRequest(""));

    expect(response.status).toBe(503);
    expect(getDb).not.toHaveBeenCalled();
  });

  it("removes expired claim receipts and records a retention audit event", async () => {
    db.claim.findMany.mockResolvedValue([{ id: "claim_1", imageKey: "member_1/receipt.webp" }]);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: { receiptsChecked: 1, receiptsDeleted: 1, failures: 0 },
      error: null,
    });
    expect(deleteStoredReceipt).toHaveBeenCalledWith("member_1/receipt.webp");
    expect(transaction.claim.updateMany).toHaveBeenCalledWith({
      where: { id: "claim_1", imageKey: "member_1/receipt.webp" },
      data: { imageKey: null },
    });
    expect(transaction.adminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "CLAIM_RECEIPT_PURGED",
        entityId: "claim_1",
        metadata: { retentionDays: 30 },
      }),
    }));
  });

  it("reports storage deletion failures and keeps the receipt reference for retry", async () => {
    db.claim.findMany.mockResolvedValue([{ id: "claim_1", imageKey: "member_1/receipt.webp" }]);
    vi.mocked(deleteStoredReceipt).mockRejectedValue(new Error("storage unavailable"));

    const response = await GET(makeRequest());

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      data: { receiptsChecked: 1, receiptsDeleted: 0, failures: 1 },
      error: { code: "PARTIAL_MAINTENANCE_FAILURE" },
    });
    expect(transaction.claim.updateMany).not.toHaveBeenCalled();
    expect(transaction.adminAuditLog.create).not.toHaveBeenCalled();
  });
});
