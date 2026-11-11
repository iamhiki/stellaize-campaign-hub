import { NextResponse, type NextRequest } from "next/server";
import { body, checkPassword, fail, publicUser, recordTry, sameOrigin, startSession, str, throttled, withSession } from "@/lib/server/auth";
import { mutate, readDb } from "@/lib/server/db";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "다른 사이트에서 보낸 요청입니다.");
  const b = await body(req);
  const email = str(b.email, 120).toLowerCase();
  const password = typeof b.password === "string" ? b.password.slice(0, 200) : "";
  if (throttled(email)) return fail(429, "여러 번 틀렸습니다. 1분 뒤에 다시 시도해 주세요.");

  const user = readDb().users.find((u) => u.email === email);
  const ok = !!user && checkPassword(password, user);
  recordTry(email, ok);
  // The same message either way, so the form doesn't reveal which emails have accounts.
  if (!user || !ok) return fail(401, "이메일 또는 비밀번호가 맞지 않습니다.");

  const token = mutate((db) => startSession(db, user.id));
  return withSession(NextResponse.json({ me: publicUser(user) }), req, token);
}
