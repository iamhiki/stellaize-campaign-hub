import { createHash } from "node:crypto";
import { mutate, readDb, supabase, type Message } from "./db";

/**
 * Where 크리에이터 ↔ 담당자 messages live. With Supabase: their own tables (supabase/chat.sql), one row per message,
 * so sending one doesn't rewrite the whole hub row. Without: the hub's file, as before (db.messages, db.reads).
 * Who may read or write a thread is decided in app/api/chat, not here.
 */
export type ChatMessage = { id: string; from: "staff" | "creator"; name: string; text: string; at: string };

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

type Row = { id: string; sender: "staff" | "creator"; name: string; body: string; created_at: string };
const fromRow = (r: Row): ChatMessage => ({ id: r.id, from: r.sender, name: r.name, text: r.body, at: r.created_at });

export async function thread(entryId: string): Promise<ChatMessage[]> {
  if (supabase) return ((await rest(`hub_messages?entry_id=eq.${q(entryId)}&select=id,sender,name,body,created_at&order=created_at.asc&limit=2000`)) as Row[]).map(fromRow);
  return ((await readDb()).messages ?? []).filter((m) => m.entryId === entryId).map(({ id, from, name, text, at }) => ({ id, from, name, text, at }));
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

/** A deleted campaign takes its threads with it. The file copy is cleared in the campaigns route's own save. */
export async function dropCampaign(campaignId: string) {
  if (!supabase) return;
  await rest(`hub_messages?campaign_id=eq.${q(campaignId)}`, { method: "DELETE" });
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
