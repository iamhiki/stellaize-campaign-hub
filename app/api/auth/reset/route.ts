import { NextResponse, type NextRequest } from "next/server";
import { body, fail, hashPassword, resetValid, sameOrigin, startSession, takeReset, withSession } from "@/lib/server/auth";
import { mutate, readDb } from "@/lib/server/db";

/** Whether a reset link (?t=) is still good, so the page can say so before anyone types a password. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t") ?? "";
  return NextResponse.json({ valid: !!token && resetValid(await readDb(), token) });
}

/** Sets the new password from a one-time link, signs the account out everywhere, and signs this browser in. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "다른 사이트에서 보낸 요청입니다.");
  const b = await body(req);
  const token = typeof b.token === "string" ? b.token.slice(0, 200) : "";
  const password = typeof b.password === "string" ? b.password : "";
  if (password.length < 8 || password.length > 200) return fail(400, "새 비밀번호는 8자 이상으로 정해 주세요.");

  const session = await mutate((db) => {
    const user = takeReset(db, token);
    if (!user) return null;
    Object.assign(user, hashPassword(password));
    for (const [k, s] of Object.entries(db.sessions)) if (s.userId === user.id) delete db.sessions[k];
    return { token: startSession(db, user.id), role: user.role };
  });
  if (!session) return fail(400, "이 링크는 이미 썼거나 기한이 지났습니다. 새 링크를 받아 주세요.");
  return withSession(NextResponse.json({ ok: true, home: session.role === "creator" ? "/creator" : "/campaigns" }), req, session.token);
}
