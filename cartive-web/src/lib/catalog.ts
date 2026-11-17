export const products = [
  {
    id: "reka-classic",
    name: "Reka Classic",
    line: "Reka",
    description: "Kopi pekat, creamy tipis, dan tidak berlebihan manis.",
    note: "Bold · 250 ml",
    tone: "espresso",
    price: 10000,
  },
  {
    id: "reka-double-shot",
    name: "Reka Double Shot",
    line: "Reka",
    description: "Dua kali kopi untuk hari yang butuh fokus ekstra.",
    note: "Extra bold · 250 ml",
    tone: "dark",
    price: 10000,
  },
  {
    id: "reka-black-aren",
    name: "Reka Black Aren",
    line: "Reka",
    description: "Kopi hitam dengan sentuhan manis gula aren.",
    note: "Black · 250 ml",
    tone: "black",
    price: 10000,
  },
  {
    id: "sela-aren-karamel",
    name: "Sela Aren Karamel",
    line: "Sela",
    description: "Lembut dan creamy dengan manis aren yang pas.",
    note: "Smooth · 250 ml",
    tone: "caramel",
    price: 10000,
  },
  {
    id: "sela-ice-creamy",
    name: "Sela Ice Creamy",
    line: "Sela",
    description: "Rasa kopi susu yang ringan untuk jeda yang nyaman.",
    note: "Creamy · 250 ml",
    tone: "cream",
    price: 10000,
  },
  {
    id: "sela-aren-bold",
    name: "Sela Aren Bold",
    line: "Sela",
    description: "Creamy dan manis aren, dengan karakter kopi lebih terasa.",
    note: "Sweet & bold · 250 ml",
    tone: "honey",
    price: 10000,
  },
] as const;

export type CatalogProduct = {
  id: string;
  name: string;
  line: string;
  description: string;
  note: string;
  tone: string;
  price: number;
};
export type ProductId = CatalogProduct["id"];

export function getProduct(productId: string) {
  return products.find((product) => product.id === productId);
}
