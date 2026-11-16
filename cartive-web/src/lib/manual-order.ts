import { products, type CatalogProduct } from "./catalog";

export type ManualOrderItem = {
  product: Omit<CatalogProduct, "price"> & { price: number };
  quantity: number;
};

export type ManualOrder = {
  customerName: string;
  fulfillment: "DELIVERY" | "PICKUP";
  address?: string;
  note?: string;
  items: ManualOrderItem[];
};

export function buildManualOrderMessage(order: ManualOrder) {
  const subtotal = order.items.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0,
  );
  const lines = [
    "Halo Cartive, saya ingin mengajukan pesanan (belum dikonfirmasi).",
    "",
    `Nama: ${order.customerName}`,
    "Pesanan:",
    ...order.items.map(
      ({ product, quantity }) =>
        `- ${product.name} x${quantity} — Rp${(product.price * quantity).toLocaleString("id-ID")}`,
    ),
    `Subtotal produk: Rp${subtotal.toLocaleString("id-ID")}`,
    `Metode: ${order.fulfillment === "DELIVERY" ? "Diantar" : "Ambil di tempat"}`,
    ...(order.fulfillment === "DELIVERY" && order.address
      ? [`Alamat: ${order.address}`]
      : []),
    ...(order.note ? [`Catatan: ${order.note}`] : []),
    "",
    "Mohon konfirmasi ketersediaan produk dan ongkir terlebih dahulu. Saya akan mengirim bukti pembayaran sebagai lampiran di chat ini setelah mendapat konfirmasi.",
  ];
  return lines.join("\n");
}

export function getManualOrderSubtotal(items: ManualOrderItem[]) {
  return items.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0,
  );
}

export function getCatalogProduct(productId: string) {
  return products.find((product) => product.id === productId);
}
