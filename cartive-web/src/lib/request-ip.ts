import { isIP } from "node:net";

type RequestIpEnvironment = {
  vercel?: string;
  nodeEnv?: string;
};

export function getTrustedRequestIp(
  headers: Headers,
  environment: RequestIpEnvironment,
) {
  if (environment.vercel === "1") {
    const vercelIp = headers.get("x-vercel-forwarded-for")?.trim();
    return vercelIp && isIP(vercelIp) ? vercelIp : null;
  }

  const cloudflareIp = headers.get("cf-connecting-ip")?.trim();
  if (cloudflareIp && isIP(cloudflareIp)) return cloudflareIp;

  if (environment.nodeEnv !== "production") {
    const forwardedIp = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    return forwardedIp && isIP(forwardedIp) ? forwardedIp : "local";
  }

  return null;
}
