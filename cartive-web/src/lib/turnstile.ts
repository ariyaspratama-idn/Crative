import "server-only";

export type TurnstileAction = "login" | "claim";

type TurnstileResult =
  | { valid: true }
  | { valid: false; unavailable: boolean };

type SiteverifyResponse = {
  success?: boolean;
  action?: string;
};

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function turnstileFailureResponse(unavailable: boolean) {
  return Response.json(
    {
      data: null,
      error: {
        code: unavailable ? "TURNSTILE_UNAVAILABLE" : "BOT_CHECK_FAILED",
        message: unavailable
          ? "Pemeriksaan keamanan belum tersedia. Coba lagi nanti."
          : "Pemeriksaan keamanan belum berhasil. Selesaikan kembali lalu coba lagi.",
      },
    },
    { status: unavailable ? 503 : 403, headers: { "Cache-Control": "no-store" } },
  );
}

export async function verifyTurnstileToken(
  token: string,
  action: TurnstileAction,
): Promise<TurnstileResult> {
  if (process.env.NODE_ENV !== "production") return { valid: true };

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { valid: false, unavailable: true };
  if (!token || token.length > 2048) return { valid: false, unavailable: false };

  let response: Response;
  try {
    response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return { valid: false, unavailable: true };
  }

  if (!response.ok) return { valid: false, unavailable: true };

  let result: SiteverifyResponse;
  try {
    result = (await response.json()) as SiteverifyResponse;
  } catch {
    return { valid: false, unavailable: true };
  }

  return result.success === true && result.action === action
    ? { valid: true }
    : { valid: false, unavailable: false };
}
