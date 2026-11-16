import { describe, expect, it } from "vitest";
import { isAuthorizedCronRequest } from "./cron-auth";

const secret = "a".repeat(48);

describe("isAuthorizedCronRequest", () => {
  it("menerima bearer secret yang tepat", () => {
    expect(
      isAuthorizedCronRequest(
        new Headers({ authorization: `Bearer ${secret}` }),
        secret,
      ),
    ).toBe(true);
  });

  it("menolak header kosong, skema lain, dan secret yang salah", () => {
    expect(isAuthorizedCronRequest(new Headers(), secret)).toBe(false);
    expect(
      isAuthorizedCronRequest(
        new Headers({ authorization: `Basic ${secret}` }),
        secret,
      ),
    ).toBe(false);
    expect(
      isAuthorizedCronRequest(
        new Headers({ authorization: `Bearer ${"b".repeat(48)}` }),
        secret,
      ),
    ).toBe(false);
  });
});
