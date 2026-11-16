import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authorizeAdmin } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { PATCH } from "./route";

vi.mock("@/lib/admin-auth", () => ({
  authorizeAdmin: vi.fn(async () => ({ email: "admin@example.test" })),
}));
vi.mock("@/lib/catalog-settings", () => ({
  catalogSettingKey: (id: string) => `catalog.product.${id}`,
}));
vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));
vi.mock("@/lib/security", () => ({
  databaseUnavailableResponse: vi.fn(() => null),
  isSameOrigin: vi.fn(() => true),
}));

describe("PATCH /api/v1/admin/products/[productId]", () => {
  const transaction = {
    setting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    adminAuditLog: { create: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    transaction.setting.findUnique.mockResolvedValue({
      value: { price: 12000, isActive: true },
    });
    transaction.setting.upsert.mockResolvedValue({});
    transaction.adminAuditLog.create.mockResolvedValue({});
    vi.mocked(getDb).mockReturnValue({
      $transaction: (callback: (tx: typeof transaction) => unknown) => callback(transaction),
    } as never);
    vi.mocked(authorizeAdmin).mockResolvedValue({ email: "admin@example.test" });
  });

  it("persists the selected product price and records an audit entry", async () => {
    const request = new NextRequest("http://localhost/api/v1/admin/products/reka-classic", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ price: 14500 }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ productId: "reka-classic" }),
    });
    if (!response) throw new Error("Route did not return a response.");

    expect(response.status).toBe(200);
    expect(transaction.setting.upsert).toHaveBeenCalledWith({
      where: { key: "catalog.product.reka-classic" },
      create: { key: "catalog.product.reka-classic", value: { price: 14500, isActive: true } },
      update: { value: { price: 14500, isActive: true } },
    });
    expect(transaction.adminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "CATALOG_PRODUCT_UPDATED",
        metadata: expect.objectContaining({ previousPrice: 12000, price: 14500 }),
      }),
    }));
  });

  it("rejects prices outside the supported nonnegative integer range", async () => {
    const request = new NextRequest("http://localhost/api/v1/admin/products/reka-classic", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ price: -1 }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ productId: "reka-classic" }),
    });
    if (!response) throw new Error("Route did not return a response.");

    expect(response.status).toBe(400);
    expect(transaction.setting.upsert).not.toHaveBeenCalled();
  });
});
