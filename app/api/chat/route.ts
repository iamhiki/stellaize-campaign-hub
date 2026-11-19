import { NextResponse, type NextRequest } from "next/server";
import { canSee, type Campaign, type Entry } from "@/lib/campaigns";
import { body, fail, guard, newId, str } from "@/lib/server/auth";
import { add, latest, liveConfig, markRead, ping, thread, threadKey, unread } from "@/lib/server/chat";
import { readDb, type Db, type User } from "@/lib/server/db";

/**
 * 크리에이터 ↔ 담당자 대화 (기획자 11/19: 사이트 안에서 크리에이터와 채팅). One thread per creator row.
 * Staff and developers reach the rows of campaigns they may see; a creator reaches only their own rows.
 * Screens hear about new messages through a live signal (lib/server/chat.ts) when it's set up, and also ask
 * again now and then, so a missed signal or a missing setup only makes messages slower, never lost.
 */
const MAX_TEXT = 2000;
const staffSide = (u: User) => u.role !== "creator";
const headers = { "Cache-Control": "no-store" };

/** Every row this user may talk about. */
function threadsOf(db: Db, user: User): { campaign: Campaign; entry: Entry }[] {
  return db.campaigns.flatMap((campaign) =>
    campaign.entries
      .filter((entry) => (staffSide(user) ? canSee(campaign, user.name) : entry.creatorId === user.id && !entry.droppedAt))
      .map((entry) => ({ campaign, entry })),
  );
}
const threadOf = (db: Db, user: User, entryId: string) => threadsOf(db, user).find((t) => t.entry.id === entryId) ?? null;

/**
 * ?entry=ID → that thread, marked read for this user. Without it → what the header bell and the row badges need:
 * unread counts, which threads they are in, and the keys of every thread this user may open (for the live signal).
 */
export async function GET(req: NextRequest) {
  const g = await guard(req, "any");
  if (g.deny) return g.deny;
  const entryId = req.nextUrl.searchParams.get("entry") ?? "";
  const db = await readDb();
  const other = staffSide(g.user) ? "creator" : "staff";

  // ?list=1 → every thread this user may open, newest conversation first, for the 대화 tab.
  if (req.nextUrl.searchParams.get("list")) {
    const all = threadsOf(db, g.user);
    const ids = all.map((t) => t.entry.id);
    const [counts, last] = await Promise.all([unread(g.user.id, ids, other), latest(ids)]);
    const threads = all
      .map((t) => ({
        entryId: t.entry.id,
        campaignId: t.campaign.id,
        campaign: t.campaign.name,
        creator: t.entry.name,
        joined: !!t.entry.creatorId,
        dropped: !!t.entry.droppedAt,
        n: counts[t.entry.id] ?? 0,
        last: last[t.entry.id] ? { text: last[t.entry.id].text, at: last[t.entry.id].at, from: last[t.entry.id].from } : null,
      }))
      .sort((a, b) => (b.last?.at ?? "").localeCompare(a.last?.at ?? "") || a.campaign.localeCompare(b.campaign, "ko") || a.creator.localeCompare(b.creator, "ko"));
    return NextResponse.json({ threads }, { headers });
  }

  if (!entryId) {
    const all = threadsOf(db, g.user);
    const counts = await unread(g.user.id, all.map((t) => t.entry.id), other);
    const threads = all
      .filter((t) => counts[t.entry.id])
      .map((t) => ({ entryId: t.entry.id, campaignId: t.campaign.id, campaign: t.campaign.name, creator: t.entry.name, n: counts[t.entry.id] }));
    const keys = Object.fromEntries(all.map((t) => [threadKey(t.entry.id), t.entry.id]));
    return NextResponse.json({ unread: counts, threads, keys, live: liveConfig }, { headers });
  }

  const t = threadOf(db, g.user, entryId);
  if (!t) return fail(404, "이 대화를 볼 수 없습니다.");
  const messages = await thread(entryId);
  const newest = messages.filter((m) => m.from === other).at(-1);
  if (newest && (await unread(g.user.id, [entryId], other))[entryId]) await markRead(g.user.id, entryId, newest.at);
  return NextResponse.json({ messages, joined: !!t.entry.creatorId }, { headers });
}

export async function POST(req: NextRequest) {
  const g = await guard(req, "any");
  if (g.deny) return g.deny;
  const b = await body(req);
  const entryId = str(b.entryId, 120);
  const text = typeof b.text === "string" ? b.text.trim() : "";
  if (!text) return fail(400, "보낼 내용을 입력해 주세요.");
  if (text.length > MAX_TEXT) return fail(400, `한 번에 ${MAX_TEXT}자까지 보낼 수 있습니다.`);

  const t = threadOf(await readDb(), g.user, entryId);
  if (!t) return fail(404, "이 대화에 보낼 수 없습니다.");
  const at = new Date().toISOString();
  await add({ id: newId(), campaignId: t.campaign.id, entryId, from: staffSide(g.user) ? "staff" : "creator", userId: g.user.id, name: g.user.name, text, at });
  await ping(entryId);
  return NextResponse.json({ messages: await thread(entryId), joined: !!t.entry.creatorId });
}
