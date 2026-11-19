import { after, NextResponse, type NextRequest } from "next/server";
import { canSee } from "@/lib/campaigns";
import { body, fail, guard, newId, str } from "@/lib/server/auth";
import { add, latest, liveConfig, markRead, ping, readsOf, thread, threadKey, unread, unreadDirect, type ChatMessage } from "@/lib/server/chat";
import { readDb, type Db, type User } from "@/lib/server/db";
import { notify } from "@/lib/server/push";
import type { Campaign } from "@/lib/campaigns";

/**
 * 대화. Two kinds of thread:
 * - 크리에이터 ↔ 담당자 (기획자 11/19: 사이트 안에서 크리에이터와 채팅), one per creator row. Staff and developers reach
 *   the rows of campaigns they may see; a creator reaches only their own rows.
 * - 1:1 팀원 대화 (11/19): two 담당자 who are both 담당 on some campaign. A developer may talk with anyone (개발자,
 *   담당자, 크리에이터) to try things; a creator only sees such a thread once a developer has written in it.
 * - 캠페인 팀방 (11/19): one per campaign, for the 담당자 on it. Made automatically; developers may open any of them.
 * Every new message also goes out as an app notification (lib/server/push.ts) to the room's other people.
 * Screens hear about new messages through a live signal (lib/server/chat.ts) when it's set up, and also ask
 * again now and then, so a missed signal or a missing setup only makes messages slower, never lost.
 */
const MAX_TEXT = 2000;
const staffSide = (u: User) => u.role !== "creator";
const headers = { "Cache-Control": "no-store" };
const ROLE = { staff: "담당자", dev: "개발자", creator: "크리에이터" } as const;

type Thread = {
  id: string;
  kind: "creator" | "team";
  campaignId: string;
  /** What this viewer sees as the thread's name, and the line under it. */
  title: string;
  sub: string;
  /** The other person's 별명 (1:1 only), shown in gray next to the name. */
  nick: string;
  joined: boolean;
  dropped: boolean;
  /** Whether a message is this viewer's own (sits on the right). */
  mine: (m: ChatMessage) => boolean;
  /** 팀방: a room for several team members. */
  group: boolean;
  /** For creator rows: a campaign this viewer is 담당 on (the 대화 list shows those first). */
  myCampaign: boolean;
  /**
   * Whose reading counts as "읽음" for this viewer's messages. Each one who hasn't read a message adds 1 to the
   * number next to it, as in 카카오톡. `anyOf`: one count for all of them (the creator sees the team as one side).
   */
  readers: string[];
  anyOf: boolean;
  /** Everyone in the room, for app notifications (the sender is left out when sending). */
  audience: string[];
};

/** Team accounts named in a campaign's 담당. */
const ownersOf = (db: Db, c: Campaign) => db.users.filter((u) => staffSide(u) && c.owners.includes(u.name));

// ---- 1:1 threads: id "dm.<user id>.<user id>", ids sorted, so both people land on the same one ----
const directId = (a: string, b: string) => `dm.${[a, b].sort().join(".")}`;
const directIds = (id: string) => {
  const p = id.split(".");
  return p.length === 3 && p[0] === "dm" ? [p[1], p[2]] : null;
};
const shareCampaign = (db: Db, a: User, b: User) => db.campaigns.some((c) => c.owners.includes(a.name) && c.owners.includes(b.name));
/** Whether these two may talk 1:1. */
function mayTalk(db: Db, a: User, b: User) {
  if (a.id === b.id) return false;
  if (a.role === "dev" || b.role === "dev") return true;
  return a.role === "staff" && b.role === "staff" && shareCampaign(db, a, b);
}
const direct = (user: User, other: User): Thread => ({
  id: directId(user.id, other.id),
  kind: "team",
  campaignId: "",
  title: other.name,
  sub: ROLE[other.role],
  nick: other.nickname ?? "",
  joined: true,
  dropped: false,
  mine: (m) => m.userId === user.id,
  group: false,
  myCampaign: false,
  readers: [other.id],
  anyOf: false,
  audience: [user.id, other.id],
});

// ---- 캠페인 팀방: id "team.<campaign id>" ----
const groupId = (campaignId: string) => `team.${campaignId}`;
const mayOpenGroup = (user: User, c: Campaign) => staffSide(user) && canSee(c, user.name) && (user.role === "dev" || c.owners.includes(user.name));
function group(db: Db, user: User, c: Campaign): Thread {
  const members = ownersOf(db, c);
  return {
    id: groupId(c.id),
    kind: "team",
    campaignId: c.id,
    title: c.name,
    sub: `담당자방 · ${members.map((u) => u.name).join(", ") || "아직 가입한 담당자 없음"}`,
    nick: "",
    joined: true,
    dropped: false,
    mine: (m) => m.userId === user.id,
    group: true,
    myCampaign: c.owners.includes(user.name),
    readers: members.filter((u) => u.id !== user.id).map((u) => u.id),
    anyOf: false,
    audience: members.map((u) => u.id),
  };
}

/** Every thread this user may open. A creator's 1:1 threads with developers are added once they hold a message. */
function threadsOf(db: Db, user: User): Thread[] {
  const rows: Thread[] = db.campaigns.flatMap((campaign) =>
    campaign.entries
      .filter((entry) => (staffSide(user) ? canSee(campaign, user.name) : entry.creatorId === user.id && !entry.droppedAt))
      .map((entry) => ({
        id: entry.id,
        kind: "creator" as const,
        campaignId: campaign.id,
        title: staffSide(user) ? entry.name : campaign.name,
        sub: staffSide(user) ? campaign.name : "",
        nick: "",
        joined: !!entry.creatorId,
        dropped: !!entry.droppedAt,
        mine: (m: ChatMessage) => m.from === (staffSide(user) ? "staff" : "creator"),
        group: false,
        myCampaign: staffSide(user) && campaign.owners.includes(user.name),
        // Staff: whether the creator read it (no account yet → never). Creator: whether anyone on the team did.
        readers: staffSide(user) ? [entry.creatorId ?? ""] : ownersOf(db, campaign).map((u) => u.id),
        anyOf: !staffSide(user),
        audience: [entry.creatorId ?? "", ...ownersOf(db, campaign).map((u) => u.id)].filter(Boolean),
      })),
  );
  const people = user.role === "creator" ? [] : db.users.filter((u) => mayTalk(db, user, u));
  // A 팀방 is listed once at least two team accounts are 담당 on the campaign (developers see every one with any).
  const groups = db.campaigns.filter((c) => mayOpenGroup(user, c) && ownersOf(db, c).length >= (user.role === "dev" ? 1 : 2)).map((c) => group(db, user, c));
  return [...rows, ...groups, ...people.map((u) => direct(user, u))];
}

/** One thread by id, if this user may open it: also 1:1 threads not listed yet (a creator's, before the first message). */
function threadOf(db: Db, user: User, id: string): Thread | null {
  if (id.startsWith("team.")) {
    const c = db.campaigns.find((x) => groupId(x.id) === id);
    return c && mayOpenGroup(user, c) ? group(db, user, c) : null;
  }
  const pair = directIds(id);
  if (!pair) return threadsOf(db, user).find((t) => t.id === id) ?? null;
  if (!pair.includes(user.id)) return null;
  const other = db.users.find((u) => u.id === (pair[0] === user.id ? pair[1] : pair[0]));
  return other && mayTalk(db, user, other) ? direct(user, other) : null;
}

/** A creator's 1:1 threads with developers. Listed only when there is something in them. */
const creatorDirect = (db: Db, user: User) => (user.role === "creator" ? db.users.filter((u) => u.role === "dev").map((u) => direct(user, u)) : []);

/** Unread counts for these threads, each kind counted its own way. */
async function countsOf(user: User, all: Thread[]) {
  const rows = all.filter((t) => t.kind === "creator").map((t) => t.id);
  const team = all.filter((t) => t.kind === "team").map((t) => t.id);
  const [a, b] = await Promise.all([unread(user.id, rows, staffSide(user) ? "creator" : "staff"), unreadDirect(user.id, team)]);
  return { ...a, ...b };
}

/** The thread as the screen gets it: whose each message is, and how far the other side has read (읽음 표시). */
async function forScreen(t: Thread, ms: ChatMessage[]) {
  const reads = Object.fromEntries((await readsOf(t.id)).map((r) => [r.userId, r.at]));
  const times = t.readers.map((id) => reads[id] ?? null);
  // readAts: how far each reader got (null = not yet). The screen counts, per message of mine, who is behind it.
  const readAts = t.anyOf ? [times.filter((x): x is string => !!x).sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null] : times;
  return {
    messages: ms.map((m) => ({ id: m.id, from: m.from, name: m.name, text: m.text, at: m.at, mine: t.mine(m) })),
    readAts,
    joined: t.joined,
    kind: t.kind,
  };
}

/**
 * ?entry=ID → that thread, marked read for this user. Without it → what the header bell and the row badges need:
 * unread counts, which threads they are in, and the keys of every thread this user may open (for the live signal).
 */
export async function GET(req: NextRequest) {
  const g = await guard(req, "any");
  if (g.deny) return g.deny;
  const id = req.nextUrl.searchParams.get("entry") ?? "";
  const db = await readDb();

  if (!id) {
    const extra = creatorDirect(db, g.user);
    const all = [...threadsOf(db, g.user), ...extra];
    const counts = await countsOf(g.user, all);

    // ?list=1 → every thread this user may open, newest conversation first, for the 대화 tab.
    if (req.nextUrl.searchParams.get("list")) {
      const last = await latest(all.map((t) => t.id));
      const threads = all
        .filter((t) => !extra.includes(t) || last[t.id])
        .map((t) => ({
          entryId: t.id,
          kind: t.kind,
          group: t.group,
          myCampaign: t.myCampaign,
          campaignId: t.campaignId,
          title: t.title,
          sub: t.sub,
          nick: t.nick,
          joined: t.joined,
          dropped: t.dropped,
          n: counts[t.id] ?? 0,
          last: last[t.id] ? { text: last[t.id].text, at: last[t.id].at, mine: t.mine(last[t.id]) } : null,
        }))
        .sort((a, b) => (b.last?.at ?? "").localeCompare(a.last?.at ?? "") || a.sub.localeCompare(b.sub, "ko") || a.title.localeCompare(b.title, "ko"));
      return NextResponse.json({ threads }, { headers });
    }

    const threads = all.filter((t) => counts[t.id]).map((t) => ({ entryId: t.id, campaignId: t.campaignId, title: t.title, sub: t.sub, n: counts[t.id] }));
    const keys = Object.fromEntries(all.map((t) => [threadKey(t.id), t.id]));
    return NextResponse.json({ unread: counts, threads, keys, live: liveConfig }, { headers });
  }

  const t = threadOf(db, g.user, id);
  if (!t) return fail(404, "이 대화를 볼 수 없습니다.");
  const messages = await thread(id);
  const newest = messages.filter((m) => !t.mine(m)).at(-1);
  if (newest && (await countsOf(g.user, [t]))[id]) {
    await markRead(g.user.id, id, newest.at);
    await ping(id); // the sender's screen drops its "1"
  }
  return NextResponse.json(await forScreen(t, messages), { headers });
}

export async function POST(req: NextRequest) {
  const g = await guard(req, "any");
  if (g.deny) return g.deny;
  const b = await body(req);
  const id = str(b.entryId, 120);
  const text = typeof b.text === "string" ? b.text.trim() : "";
  if (!text) return fail(400, "보낼 내용을 입력해 주세요.");
  if (text.length > MAX_TEXT) return fail(400, `한 번에 ${MAX_TEXT}자까지 보낼 수 있습니다.`);

  const t = threadOf(await readDb(), g.user, id);
  if (!t) return fail(404, "이 대화에 보낼 수 없습니다.");
  const at = new Date().toISOString();
  await add({ id: newId(), campaignId: t.campaignId, entryId: id, from: staffSide(g.user) ? "staff" : "creator", userId: g.user.id, name: g.user.name, text, at });
  await ping(id);
  // App notification to the others in the room, after the answer has gone back (it never slows sending down).
  const to = t.audience.filter((u) => u !== g.user.id);
  const where = t.group ? `${t.title} 담당자방` : t.kind === "creator" ? (staffSide(g.user) ? t.sub : t.title) : "";
  after(() => notify(to, { title: where ? `${g.user.name} · ${where}` : g.user.name, body: text.slice(0, 140), url: `/chat#${encodeURIComponent(id)}`, tag: id }));
  return NextResponse.json(await forScreen(t, await thread(id)));
}
