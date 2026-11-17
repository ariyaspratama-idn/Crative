import { z } from "zod";
import { NextRequest } from "next/server";
import { getCatalogProducts } from "@/lib/catalog-settings";
import { getDb } from "@/lib/db";
import { buildManualOrderMessage } from "@/lib/manual-order";
import { databaseUnavailableResponse, isSameOrigin } from "@/lib/security";

const orderRequestSchema = z.object({
  customerName: z.string().trim().min(1).max(100),
  fulfillment: z.enum(["DELIVERY", "PICKUP"]),
  address: z.string().trim().max(400).optional(),
  note: z.string().trim().max(250).optional(),
  items: z.array(z.object({
    productId: z.string().min(1).max(40),
    quantity: z.number().int().min(1).max(20),
  }).strict()).min(1).max(20),
}).strict().superRefine((order, context) => {
  if (order.fulfillment === "DELIVERY" && !order.address?.trim()) {
    context.addIssue({
      code: "custom",
      path: ["address"],
      message: "Alamat diperlukan untuk pesanan yang diantar.",
    });
  }
});

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return Response.json(
      { data: null, error: { code: "INVALID_ORIGIN", message: "Permintaan tidak dapat diverifikasi." } },
      { status: 403 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { data: null, error: { code: "INVALID_JSON", message: "Data pesanan tidak terbaca." } },
      { status: 400 },
    );
  }

  const parsed = orderRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { data: null, error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message ?? "Data pesanan tidak valid." } },
      { status: 400 },
    );
  }

  let catalog;
  try {
    catalog = await getCatalogProducts(getDb());
  } catch (error) {
    const unavailable = databaseUnavailableResponse(error);
    if (unavailable) return unavailable;
    throw error;
  }
  const configuredById = new Map<string, (typeof catalog)[number]>(
    catalog.map((product) => [product.id, product]),
  );
  if (parsed.data.items.some((item) => !configuredById.get(item.productId)?.isActive)) {
    return Response.json(
      { data: null, error: { code: "PRODUCT_UNAVAILABLE", message: "Salah satu produk sedang tidak ditawarkan. Muat ulang menu sebelum membuat pesanan." } },
      { status: 409 },
    );
  }
  const items = parsed.data.items.map((item) => {
    const configured = configuredById.get(item.productId);
    if (!configured) return null;
    return {
      product: configured,
      quantity: item.quantity,
    };
  });
  if (items.some((item) => item === null)) {
    return Response.json(
      { data: null, error: { code: "INVALID_PRODUCT", message: "Salah satu produk tidak tersedia di katalog." } },
      { status: 400 },
    );
  }

  const message = buildManualOrderMessage({
    customerName: parsed.data.customerName,
    fulfillment: parsed.data.fulfillment,
    address: parsed.data.address,
    note: parsed.data.note,
    items: items.filter((item) => item !== null),
  });
  const contactNumber = process.env.CARTIVE_WHATSAPP_NUMBER;
  if (!contactNumber || !/^62\d{8,12}$/.test(contactNumber)) {
    if (
      process.env.NODE_ENV === "development" &&
      ["localhost", "127.0.0.1", "::1"].includes(request.nextUrl.hostname.toLowerCase())
    ) {
      return Response.json(
        { data: { whatsappUrl: null, message, localSimulation: true }, error: null },
        { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } },
      );
    }
    return Response.json(
      { data: null, error: { code: "WHATSAPP_CHANNEL_UNAVAILABLE", message: "Nomor WhatsApp resmi Cartive belum dikonfigurasi." } },
      { status: 503 },
    );
  }

  const whatsappUrl = `https://wa.me/${contactNumber}?text=${encodeURIComponent(message)}`;
  return Response.json(
    { data: { whatsappUrl, message, localSimulation: false }, error: null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
