import { NextResponse, type NextRequest } from "next/server";
import { body, checkPassword, fail, guard, hashPassword, startSession, withSession } from "@/lib/server/auth";
import { mutate } from "@/lib/server/db";

export async function POST(req: NextRequest) {
  const g = await guard(req, "any");
  if (g.deny) return g.deny;
  const b = await body(req);
  const current = typeof b.current === "string" ? b.current.slice(0, 200) : "";
  const next = typeof b.next === "string" ? b.next : "";
  if (!checkPassword(current, g.user)) return fail(400, "현재 비밀번호가 맞지 않습니다.");
  if (next.length < 8 || next.length > 200) return fail(400, "새 비밀번호는 8자 이상으로 정해 주세요.");

  // Changing the password signs every other device out; this one gets a fresh session.
  const token = await mutate((db) => {
    const user = db.users.find((u) => u.id === g.user.id)!;
    Object.assign(user, hashPassword(next));
    for (const [k, s] of Object.entries(db.sessions)) if (s.userId === user.id) delete db.sessions[k];
    return startSession(db, user.id);
  });
  return withSession(NextResponse.json({ ok: true }), req, token);
}
