import { NextResponse, type NextRequest } from "next/server";
import { body, fail, guard, issueReset, str } from "@/lib/server/auth";
import { mutate, readDb } from "@/lib/server/db";

const LIFE = 24 * 3600_000; // a link a developer hands over (카톡 등) works for a day

/**
 * Developers only (11/19 비밀번호·아이디 찾기): every account's name and login mail, so a developer can tell a
 * teammate their ID, and a one-time link to set a new password while no mail service is connected.
 */
export async function GET(req: NextRequest) {
  const g = await guard(req, "dev");
  if (g.deny) return g.deny;
  const db = await readDb();
  const accounts = db.users
    .map(({ id, name, email, role, createdAt }) => ({ id, name, email, role, createdAt }))
    .sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name, "ko"));
  return NextResponse.json({ accounts }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const g = await guard(req, "dev");
  if (g.deny) return g.deny;
  const userId = str((await body(req)).userId, 40);
  const token = await mutate((db) => (db.users.some((u) => u.id === userId) ? issueReset(db, userId, LIFE) : null));
  if (!token) return fail(404, "계정을 찾을 수 없습니다.");
  return NextResponse.json({ link: `${req.nextUrl.origin}/reset?t=${token}` });
}
