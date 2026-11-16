import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authorizeAdmin } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { deleteOneSignalMember } from "@/lib/external-notifications";
import { POST } from "./route";

vi.mock("@/lib/admin-auth", () => ({
  authorizeAdmin: vi.fn(async () => ({ email: "admin@example.test" })),
}));
vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));
vi.mock("@/lib/external-notifications", () => ({
  deleteOneSignalMember: vi.fn(async () => true),
}));
vi.mock("@/lib/security", () => ({
  databaseUnavailableResponse: vi.fn(() => null),
  isSameOrigin: vi.fn(() => true),
}));

describe("POST /api/v1/admin/data-requests/[requestId]/review", () => {
  const transaction = {
    memberDataRequest: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    member: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    loginChallenge: { deleteMany: vi.fn() },
    waVerification: { deleteMany: vi.fn() },
    session: { deleteMany: vi.fn() },
    adminAuditLog: { create: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    transaction.memberDataRequest.findUnique.mockResolvedValue({
      id: "request_1",
      type: "ERASURE",
      status: "IN_REVIEW",
      memberId: "member_1",
    });
    transaction.memberDataRequest.updateMany.mockResolvedValue({ count: 1 });
    transaction.member.findUnique.mockResolvedValue({
      id: "member_1",
      waNumber: "6281234567890",
    });
    transaction.member.updateMany.mockResolvedValue({ count: 1 });
    transaction.loginChallenge.deleteMany.mockResolvedValue({ count: 1 });
    transaction.waVerification.deleteMany.mockResolvedValue({ count: 1 });
    transaction.session.deleteMany.mockResolvedValue({ count: 1 });
    transaction.adminAuditLog.create.mockResolvedValue({});
    vi.mocked(deleteOneSignalMember).mockResolvedValue(true);
    vi.mocked(getDb).mockReturnValue({
      memberDataRequest: transaction.memberDataRequest,
      $transaction: (callback: (tx: typeof transaction) => unknown) => callback(transaction),
    } as never);
    vi.mocked(authorizeAdmin).mockResolvedValue({ email: "admin@example.test" });
  });

  it("anonymizes a member and revokes access when erasure is completed", async () => {
    const request = new NextRequest("http://localhost/api/v1/admin/data-requests/request_1/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED", resolution: "Data telah dihapus sesuai permintaan." }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ requestId: "request_1" }),
    });
    if (!response) throw new Error("Route did not return a response.");

    expect(response.status).toBe(200);
    expect(transaction.loginChallenge.deleteMany).toHaveBeenCalledWith({
      where: { waNumber: "6281234567890" },
    });
    expect(transaction.member.updateMany).toHaveBeenCalledWith({
      where: { id: "member_1", deletedAt: null },
      data: expect.objectContaining({
        waNumber: "ANON-member_1",
        waVerifiedAt: null,
        consentPromoAt: null,
        deletedAt: expect.any(Date),
      }),
    });
    expect(transaction.waVerification.deleteMany).toHaveBeenCalledWith({
      where: { memberId: "member_1" },
    });
    expect(transaction.session.deleteMany).toHaveBeenCalledWith({
      where: { memberId: "member_1" },
    });
    expect(transaction.memberDataRequest.updateMany).toHaveBeenCalled();
    expect(deleteOneSignalMember).toHaveBeenCalledWith("member_1");
  });

  it("keeps an erasure request open when OneSignal data cannot be removed", async () => {
    vi.mocked(deleteOneSignalMember).mockResolvedValue(false);
    const request = new NextRequest("http://localhost/api/v1/admin/data-requests/request_1/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED", resolution: "Data telah dihapus sesuai permintaan." }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ requestId: "request_1" }),
    });
    if (!response) throw new Error("Route did not return a response.");

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: "PUSH_DATA_CLEANUP_FAILED" },
    });
    expect(transaction.member.updateMany).not.toHaveBeenCalled();
    expect(transaction.memberDataRequest.updateMany).not.toHaveBeenCalled();
  });

  it("does not anonymize the member when an erasure request is declined", async () => {
    const request = new NextRequest("http://localhost/api/v1/admin/data-requests/request_1/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "DECLINED", resolution: "Permintaan ditolak dengan alasan tercatat." }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ requestId: "request_1" }),
    });
    if (!response) throw new Error("Route did not return a response.");

    expect(response.status).toBe(200);
    expect(transaction.member.updateMany).not.toHaveBeenCalled();
    expect(transaction.session.deleteMany).not.toHaveBeenCalled();
  });
});
