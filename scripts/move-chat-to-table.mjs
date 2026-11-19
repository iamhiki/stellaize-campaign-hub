// 허브 자료(hub_state 한 행)에 들어 있던 대화를 따로 만든 표(hub_messages, hub_chat_reads)로 한 번 옮긴다.
//   node scripts/move-chat-to-table.mjs
// supabase/chat.sql 을 먼저 실행해 둔다. 여러 번 실행해도 같은 메시지가 두 번 들어가지 않는다.
// 옮긴 뒤에는 hub_state 에서 대화를 지운다(다른 저장과 겹치면 다시 시도한다).
import { existsSync, readFileSync } from "node:fs";

const env = Object.fromEntries(
  (existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const BASE = env.SUPABASE_URL?.replace(/(\/rest\/v1)?\/*$/, "");
const KEY = env.SUPABASE_SECRET_KEY;
if (!BASE || !KEY) throw new Error(".env.local 에 SUPABASE_URL 과 SUPABASE_SECRET_KEY 를 넣어 주세요.");

async function rest(method, path, send, prefer) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    method,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) },
    body: send === undefined ? undefined : JSON.stringify(send),
  });
  if (!res.ok) throw new Error(`Supabase ${method} ${path.split("?")[0]} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// The tables must exist first.
await rest("GET", "hub_messages?select=id&limit=1").catch(() => {
  throw new Error("hub_messages 표가 없습니다. Supabase SQL Editor 에서 supabase/chat.sql 을 먼저 실행해 주세요.");
});

for (let i = 0; i < 6; i++) {
  const [row] = await rest("GET", "hub_state?id=eq.1&select=data,version");
  const messages = row.data.messages ?? [];
  const reads = row.data.reads ?? {};
  if (!messages.length && !Object.keys(reads).length) {
    console.log("옮길 대화가 없습니다. 이미 옮겼거나 아직 대화가 없습니다.");
    process.exitCode = 0;
    break;
  }
  if (messages.length)
    await rest("POST", "hub_messages?on_conflict=id", messages.map((m) => ({ id: m.id, campaign_id: m.campaignId, entry_id: m.entryId, sender: m.from, user_id: m.userId, name: m.name, body: m.text, created_at: m.at })), "resolution=ignore-duplicates,return=minimal");
  const readRows = Object.entries(reads).flatMap(([user_id, byEntry]) => Object.entries(byEntry).map(([entry_id, read_at]) => ({ user_id, entry_id, read_at })));
  if (readRows.length) await rest("POST", "hub_chat_reads?on_conflict=user_id,entry_id", readRows, "resolution=merge-duplicates,return=minimal");

  const { messages: _m, reads: _r, ...rest_ } = row.data;
  const saved = await rest("PATCH", `hub_state?id=eq.1&version=eq.${row.version}&select=version`, { data: rest_, version: row.version + 1 }, "return=representation");
  if (saved.length) {
    console.log(`대화를 옮겼습니다: 메시지 ${messages.length}개, 읽음 기록 ${readRows.length}개.`);
    break;
  }
}
