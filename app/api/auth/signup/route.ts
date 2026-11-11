import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { body, fail, hashPassword, newId, publicUser, sameOrigin, startSession, str, withSession } from "@/lib/server/auth";
import { findByInvite, link } from "@/lib/server/creator";
import { mutate, type Role, type User } from "@/lib/server/db";
import { todayKST } from "@/lib/date";

const sameText = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Two ways in. Staff need the team's join code (STAFF_JOIN_CODE in .env.local), so a stranger can't make a
 * staff account. Creators need the invite link staff made for their row, and joining links them to that row.
 * The developer code (DEV_JOIN_CODE) in the same box makes a developer account instead: staff screens plus a
 * read-only look at creator screens.
 */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "다른 사이트에서 보낸 요청입니다.");
  const b = await body(req);
  const name = str(b.name, 30);
  const email = str(b.email, 120).toLowerCase();
  const password = typeof b.password === "string" ? b.password : "";
  const invite = str(b.invite, 100);
  if (!name) return fail(400, "이름을 입력해 주세요.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, "이메일 주소를 확인해 주세요.");
  if (password.length < 8 || password.length > 200) return fail(400, "비밀번호는 8자 이상으로 정해 주세요.");

  let role: Role = "creator";
  if (!invite) {
    const given = str(b.code, 100);
    const staffCode = process.env.STAFF_JOIN_CODE ?? "";
    const devCode = process.env.DEV_JOIN_CODE ?? "";
    if (!staffCode && !devCode) return fail(403, "팀 가입 코드가 아직 설정되지 않았습니다. 관리자에게 문의해 주세요.");
    if (devCode && sameText(given, devCode)) role = "dev";
    else if (staffCode && sameText(given, staffCode)) role = "staff";
    else return fail(403, "가입 코드가 맞지 않습니다.");
  }

  const out = mutate((db) => {
    if (db.users.some((u) => u.email === email)) return { error: "이미 가입한 이메일입니다. 로그인해 주세요." };
    const found = invite ? findByInvite(db, invite) : null;
    if (invite && !found) return { error: "초대 링크가 만료됐거나 이미 사용됐습니다. 담당자에게 새 링크를 요청해 주세요." };
    const user: User = { id: newId(), role, name, email, ...hashPassword(password), createdAt: todayKST() };
    db.users.push(user);
    if (found) link(found.entry, user.id);
    return { user, token: startSession(db, user.id) };
  });
  if ("error" in out) return fail(400, out.error!);
  return withSession(NextResponse.json({ me: publicUser(out.user) }), req, out.token);
}
