import "server-only";

import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import {
  hashToken,
  SESSION_COOKIE,
} from "@/lib/security";

export async function getCurrentMember() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = getDb();
  return db.session
    .findUnique({
      where: { tokenHash: hashToken(token) },
      select: {
        expiresAt: true,
        verifiedAt: true,
        member: {
          select: {
            id: true,
            waNumber: true,
            waVerifiedAt: true,
            deletedAt: true,
          },
        },
      },
    })
    .then(async (session) => {
      if (
        !session ||
        session.expiresAt <= new Date() ||
        !session.verifiedAt ||
        session.member.deletedAt
      ) {
        if (session) {
          await db.session.deleteMany({
            where: { tokenHash: hashToken(token) },
          });
        }
        return null;
      }

      return session.member;
    });
}
