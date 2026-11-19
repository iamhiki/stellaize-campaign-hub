import { NextResponse, type NextRequest } from "next/server";
import { body, fail, guard, issueReset, renameUser, str, teamNameTaken } from "@/lib/server/auth";
import { mutate, readDb } from "@/lib/server/db";
import { deleteFile } from "@/lib/server/files";
import { DOC_KINDS } from "@/lib/files";

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
    .map(({ id, name, nickname, email, role, createdAt, lastLoginAt }) => ({ id, name, nickname: nickname ?? "", email, role, createdAt, lastLoginAt: lastLoginAt ?? null }))
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

/** Change someone's name (본명, or a creator's 활동명). Only developers; everyone else sets just their 별명. */
export async function PATCH(req: NextRequest) {
  const g = await guard(req, "dev");
  if (g.deny) return g.deny;
  const b = await body(req);
  const userId = str(b.userId, 40);
  const name = str(b.name, 30);
  if (!name) return fail(400, "이름을 입력해 주세요.");
  const error = await mutate((db) => renameUser(db, userId, name));
  if (error) return fail(400, error);
  return NextResponse.json({ ok: true, name });
}

/**
 * Delete an account (테스트 계정 정리, 그만둔 사람). The person is signed out everywhere. A creator's campaign rows
 * stay, unlinked, so staff can send a new invite; their shipping info and documents are removed. Messages stay as
 * the conversation's record.
 */
export async function DELETE(req: NextRequest) {
  const g = await guard(req, "dev");
  if (g.deny) return g.deny;
  const userId = str((await body(req)).userId, 40);
  if (userId === g.user.id) return fail(400, "내 계정은 여기서 지울 수 없습니다.");
  const gone = await mutate((db) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user) return null;
    db.users = db.users.filter((u) => u.id !== userId);
    for (const [k, s] of Object.entries(db.sessions)) if (s.userId === userId) delete db.sessions[k];
    for (const [k, r] of Object.entries(db.resets ?? {})) if (r.userId === userId) delete db.resets![k];
    delete db.reads?.[userId];
    delete db.profiles?.[userId];
    for (const c of db.campaigns) {
      for (const e of c.entries) if (e.creatorId === userId) e.creatorId = null;
      // Their name stops being a 담당 mark, unless another team account has the same name.
      if (user.role !== "creator" && !teamNameTaken(db, user.name)) c.owners = c.owners.filter((o) => o !== user.name);
    }
    return user;
  });
  if (!gone) return fail(404, "계정을 찾을 수 없습니다.");
  if (gone.role === "creator") for (const kind of DOC_KINDS) await deleteFile(`${userId}/${kind}`).catch(() => {});
  return NextResponse.json({ ok: true });
}
