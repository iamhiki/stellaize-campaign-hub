import { createHash } from "node:crypto";
import { mutate, readDb, supabase, type Message } from "./db";

/**
 * Where 크리에이터 ↔ 담당자 messages live. With Supabase: their own tables (supabase/chat.sql), one row per message,
 * so sending one doesn't rewrite the whole hub row. Without: the hub's file, as before (db.messages, db.reads).
 * Who may read or write a thread is decided in app/api/chat, not here.
 */
export type ChatMessage = { id: string; from: "staff" | "creator"; userId: string; name: string; text: string; at: string };

const KEEP_FILE = 500; // newest messages kept per thread in the file

async function rest(path: string, init: RequestInit = {}) {
  const res = await fetch(`${supabase!.base}/rest/v1/${path}`, {
    cache: "no-store",
    ...init,
    headers: { apikey: supabase!.key, Authorization: `Bearer ${supabase!.key}`, "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) throw new Error(`Supabase ${init.method ?? "GET"} ${path.split("?")[0]} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
const q = encodeURIComponent;

type Row = { id: string; sender: "staff" | "creator"; user_id: string; name: string; body: string; created_at: string };
const fromRow = (r: Row): ChatMessage => ({ id: r.id, from: r.sender, userId: r.user_id, name: r.name, text: r.body, at: r.created_at });

export async function thread(entryId: string): Promise<ChatMessage[]> {
  if (supabase) return ((await rest(`hub_messages?entry_id=eq.${q(entryId)}&select=id,sender,user_id,name,body,created_at&order=created_at.asc&limit=2000`)) as Row[]).map(fromRow);
  return ((await readDb()).messages ?? []).filter((m) => m.entryId === entryId).map(({ id, from, userId, name, text, at }) => ({ id, from, userId, name, text, at }));
}

export async function add(m: Message) {
  if (supabase) {
    await rest("hub_messages", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ id: m.id, campaign_id: m.campaignId, entry_id: m.entryId, sender: m.from, user_id: m.userId, name: m.name, body: m.text, created_at: m.at }) });
    return;
  }
  await mutate((db) => {
    db.messages = [...(db.messages ?? []), m];
    const mine = db.messages.filter((x) => x.entryId === m.entryId);
    if (mine.length > KEEP_FILE) {
      const drop = new Set(mine.slice(0, mine.length - KEEP_FILE).map((x) => x.id));
      db.messages = db.messages.filter((x) => !drop.has(x.id));
    }
  });
}

/** This user has read the thread up to `at` (the newest message they were shown). */
export async function markRead(userId: string, entryId: string, at: string) {
  if (supabase) {
    await rest("hub_chat_reads?on_conflict=user_id,entry_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ user_id: userId, entry_id: entryId, read_at: at }) });
    return;
  }
  await mutate((db) => {
    db.reads ??= {};
    (db.reads[userId] ??= {})[entryId] = at;
  });
}

/** Who has read this thread up to when (for 읽음 표시). */
export async function readsOf(entryId: string): Promise<{ userId: string; at: string }[]> {
  if (supabase) return ((await rest(`hub_chat_reads?entry_id=eq.${q(entryId)}&select=user_id,read_at`)) as { user_id: string; read_at: string }[]).map((r) => ({ userId: r.user_id, at: r.read_at }));
  return Object.entries((await readDb()).reads ?? {}).flatMap(([userId, r]) => (r[entryId] ? [{ userId, at: r[entryId] }] : []));
}

/** Per thread, the messages from `sender` (the other side) this user hasn't read. Threads with none are left out. */
export async function unread(userId: string, entryIds: string[], sender: "staff" | "creator"): Promise<Record<string, number>> {
  if (!entryIds.length) return {};
  if (supabase) {
    const rows = (await rest("rpc/hub_unread", { method: "POST", body: JSON.stringify({ p_user: userId, p_entries: entryIds, p_sender: sender }) })) as { entry_id: string; n: number }[];
    return Object.fromEntries(rows.map((r) => [r.entry_id, Number(r.n)]));
  }
  const db = await readDb();
  const reads = db.reads?.[userId] ?? {};
  const want = new Set(entryIds);
  const out: Record<string, number> = {};
  for (const m of db.messages ?? []) if (want.has(m.entryId) && m.from === sender && m.at > (reads[m.entryId] ?? "")) out[m.entryId] = (out[m.entryId] ?? 0) + 1;
  return out;
}

/**
 * Per 1:1 thread (팀원 대화), the messages from anyone but this user that they haven't read. Both people are on the
 * team side there, so "the other side" is the other person, not a sender kind. Few threads per person, so plain reads.
 */
export async function unreadDirect(userId: string, ids: string[]): Promise<Record<string, number>> {
  if (!ids.length) return {};
  let reads: Record<string, string>;
  let rows: { entryId: string; at: string }[];
  if (supabase) {
    const list = `(${ids.map((i) => `"${i}"`).join(",")})`;
    const [r, m] = (await Promise.all([
      rest(`hub_chat_reads?user_id=eq.${q(userId)}&entry_id=in.${q(list)}&select=entry_id,read_at`),
      rest(`hub_messages?entry_id=in.${q(list)}&user_id=neq.${q(userId)}&select=entry_id,created_at&limit=5000`),
    ])) as [{ entry_id: string; read_at: string }[], { entry_id: string; created_at: string }[]];
    reads = Object.fromEntries(r.map((x) => [x.entry_id, x.read_at]));
    rows = m.map((x) => ({ entryId: x.entry_id, at: x.created_at }));
  } else {
    const db = await readDb();
    const want = new Set(ids);
    reads = db.reads?.[userId] ?? {};
    rows = (db.messages ?? []).filter((m) => want.has(m.entryId) && m.userId !== userId).map((m) => ({ entryId: m.entryId, at: m.at }));
  }
  const out: Record<string, number> = {};
  // Supabase returns timestamps as "+00:00", the file keeps "Z"; compare as times, not text.
  for (const m of rows) if (!reads[m.entryId] || Date.parse(m.at) > Date.parse(reads[m.entryId])) out[m.entryId] = (out[m.entryId] ?? 0) + 1;
  return out;
}

/**
 * The newest message of each thread among `entryIds`, for the 대화 tab's list.
 * shortcut: reads the newest 2000 messages overall and keeps the first of each thread. A thread whose last message
 * is older than that shows without a preview; give hub_messages a "last message per thread" view if that starts to happen.
 */
export async function latest(entryIds: string[]): Promise<Record<string, ChatMessage>> {
  const want = new Set(entryIds);
  const out: Record<string, ChatMessage> = {};
  const rows: (ChatMessage & { entryId: string })[] = supabase
    ? ((await rest("hub_messages?select=id,entry_id,sender,user_id,name,body,created_at&order=created_at.desc&limit=2000")) as (Row & { entry_id: string })[]).map((r) => ({ ...fromRow(r), entryId: r.entry_id }))
    : [...((await readDb()).messages ?? [])].reverse().map(({ id, entryId, from, userId, name, text, at }) => ({ id, entryId, from, userId, name, text, at }));
  for (const { entryId, ...m } of rows) if (want.has(entryId) && !out[entryId]) out[entryId] = m;
  return out;
}

/**
 * Whether anyone wrote in a campaign's rooms (creator rooms and 담당자방). Such a campaign can't be deleted
 * (11/19: 대화 기록은 남아야 나중에 뒷말이 없다); once it ends its rooms move to the 끝난 캠페인 folder instead.
 */
export async function hasMessages(campaignId: string): Promise<boolean> {
  if (supabase) return ((await rest(`hub_messages?campaign_id=eq.${q(campaignId)}&select=id&limit=1`)) as unknown[]).length > 0;
  return ((await readDb()).messages ?? []).some((m) => m.campaignId === campaignId);
}

// ---- live "new message" signal (Supabase Realtime broadcast) ----
// The signal carries no text and no names, only an opaque key per thread; screens then ask app/api/chat, which
// checks who may read what. A screen learns the keys of the threads it may open from GET /api/chat.
export const TOPIC = "hub-chat";
const PUBLISHABLE = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
/** What a browser needs to listen for the signal, or null when it isn't set up (screens then just ask every few seconds). */
export const liveConfig = supabase && PUBLISHABLE ? { url: supabase.base, key: PUBLISHABLE, topic: TOPIC } : null;

export const threadKey = (entryId: string) =>
  createHash("sha256")
    .update(`${supabase?.key ?? "file"}:${entryId}`)
    .digest("base64url")
    .slice(0, 22);

/** Tell open screens that a thread has a new message. Best effort: a missed signal is caught by the slow fallback check. */
export async function ping(entryId: string) {
  if (!supabase) return;
  try {
    const res = await fetch(`${supabase.base}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { apikey: supabase.key, Authorization: `Bearer ${supabase.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ topic: TOPIC, event: "msg", payload: { k: threadKey(entryId) }, private: false }] }),
    });
    if (!res.ok) console.error(`대화 실시간 신호 실패 ${res.status}: ${(await res.text()).slice(0, 200)}`);
  } catch (e) {
    console.error("대화 실시간 신호 실패", e);
  }
}
