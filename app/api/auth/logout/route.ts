import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, endSession, fail, sameOrigin } from "@/lib/server/auth";
import { mutate } from "@/lib/server/db";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "다른 사이트에서 보낸 요청입니다.");
  mutate((db) => endSession(db, req.cookies.get(COOKIE)?.value));
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE);
  return res;
}
