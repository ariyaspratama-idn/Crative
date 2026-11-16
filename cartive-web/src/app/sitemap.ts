import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "@/lib/public-site-url";

const publicPaths = [
  "/",
  "/menu",
  "/menu/reka-classic",
  "/menu/reka-double-shot",
  "/menu/reka-black-aren",
  "/menu/sela-aren-karamel",
  "/menu/sela-ice-creamy",
  "/menu/sela-aren-bold",
  "/cara-kerja",
  "/privasi",
  "/syarat",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getPublicSiteUrl();
  if (!baseUrl) return [];

  return publicPaths.map((path) => ({
    url: new URL(path, baseUrl).toString(),
    changeFrequency: path === "/" || path === "/menu" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/menu" ? 0.9 : 0.6,
  }));
}
