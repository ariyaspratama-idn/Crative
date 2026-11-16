import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "@/lib/public-site-url";

export default function robots(): MetadataRoute.Robots {
  if (
    process.env.CARTIVE_DEPLOYMENT_ENV === "staging" ||
    process.env.VERCEL_ENV === "preview"
  ) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  const siteUrl = getPublicSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/kartu", "/profil", "/pesanan", "/keranjang", "/checkout"],
    },
    ...(siteUrl ? { sitemap: new URL("/sitemap.xml", siteUrl).toString() } : {}),
  };
}
