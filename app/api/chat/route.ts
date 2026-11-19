import { NextResponse, type NextRequest } from "next/server";
import { canSee, type Campaign, type Entry } from "@/lib/campaigns";
import { body, fail, guard, newId, str } from "@/lib/server/auth";
import { mutate, readDb, type Db, type Message, type User } from "@/lib/server/db";

/**
 * 크리에이터 ↔ 담당자 대화 (기획자 11/19: 사이트 안에서 크리에이터와 채팅). One thread per creator row.
 * Staff and developers reach the rows of campaigns they may see; a creator reaches only their own rows.
 * No live connection: screens ask again every few seconds while a thread is open.
 *
 * shortcut: messages sit in the same one-row store as everything else (lib/server/db.ts). Fine for a beta;
 * move them to their own table before threads run into the thousands of messages.
 */
const MAX_TEXT = 2000;
const KEEP = 500; // newest messages kept per thread

const staffSide = (u: User) => u.role !== "creator";

/** The row a user may talk about, or null. */
function threadOf(db: Db, user: User, entryId: string): { campaign: Campaign; entry: Entry } | null {
  for (const campaign of db.campaigns) {
    const entry = campaign.entries.find((e) => e.id === entryId);
    if (!entry) continue;
    if (staffSide(user)) return canSee(campaign, user.name) ? { campaign, entry } : null;
    return entry.creatorId === user.id && !entry.droppedAt ? { campaign, entry } : null;
  }
  return null;
}

/** Messages from the other side since this user last read the thread. */
function unreadIn(db: Db, user: User, entryId: string) {
  const since = db.reads?.[user.id]?.[entryId] ?? "";
  const other = staffSide(user) ? "creator" : "staff";
  return (db.messages ?? []).filter((m) => m.entryId === entryId && m.from === other && m.at > since).length;
}

const view = (db: Db, entryId: string) =>
  (db.messages ?? []).filter((m) => m.entryId === entryId).map(({ id, from, name, text, at }) => ({ id, from, name, text, at }));

/**
 * ?entry=ID → that thread, marked read for this user. Without it → unread counts for every row this user may
 * talk about, for the badges on the progress table and the creator's schedule.
 */
export async function GET(req: NextRequest) {
  const g = await guard(req, "any");
  if (g.deny) return g.deny;
  const entryId = req.nextUrl.searchParams.get("entry") ?? "";
  const db = await readDb();
  const headers = { "Cache-Control": "no-store" };

  if (!entryId) {
    const unread: Record<string, number> = {};
    for (const c of db.campaigns)
      for (const e of c.entries) {
        if (!threadOf(db, g.user, e.id)) continue;
        const n = unreadIn(db, g.user, e.id);
        if (n) unread[e.id] = n;
      }
    return NextResponse.json({ unread }, { headers });
  }

  const t = threadOf(db, g.user, entryId);
  if (!t) return fail(404, "이 대화를 볼 수 없습니다.");
  if (unreadIn(db, g.user, entryId)) {
    const now = new Date().toISOString();
    await mutate((d) => {
      d.reads ??= {};
      (d.reads[g.user.id] ??= {})[entryId] = now;
    });
  }
  return NextResponse.json({ messages: view(db, entryId), joined: !!t.entry.creatorId }, { headers });
}

export async function POST(req: NextRequest) {
  const g = await guard(req, "any");
  if (g.deny) return g.deny;
  const b = await body(req);
  const entryId = str(b.entryId, 120);
  const text = typeof b.text === "string" ? b.text.trim() : "";
  if (!text) return fail(400, "보낼 내용을 입력해 주세요.");
  if (text.length > MAX_TEXT) return fail(400, `한 번에 ${MAX_TEXT}자까지 보낼 수 있습니다.`);

  const out = await mutate((db) => {
    const t = threadOf(db, g.user, entryId);
    if (!t) return null;
    const at = new Date().toISOString();
    const message: Message = { id: newId(), campaignId: t.campaign.id, entryId, from: staffSide(g.user) ? "staff" : "creator", userId: g.user.id, name: g.user.name, text, at };
    db.messages = [...(db.messages ?? []), message];
    const thread = db.messages.filter((m) => m.entryId === entryId);
    if (thread.length > KEEP) {
      const drop = new Set(thread.slice(0, thread.length - KEEP).map((m) => m.id));
      db.messages = db.messages.filter((m) => !drop.has(m.id));
    }
    db.reads ??= {};
    (db.reads[g.user.id] ??= {})[entryId] = at; // your own message counts as read
    return { messages: view(db, entryId), joined: !!t.entry.creatorId };
  });
  return out ? NextResponse.json(out) : fail(404, "이 대화에 보낼 수 없습니다.");
}
