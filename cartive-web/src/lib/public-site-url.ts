export function getPublicSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return null;

  const url = new URL(configured);
  if (url.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL harus menggunakan HTTPS di production.");
  }
  return url;
}
