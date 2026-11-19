// 이 PC의 data/hub.json 자료(계정, 캠페인, 체크, 제출 링크, 알림)를 Supabase 로 한 번 옮긴다.
//   node scripts/push-to-supabase.mjs
// .env.local 에 SUPABASE_URL, SUPABASE_SECRET_KEY 가 있어야 하고, supabase/schema.sql 을 먼저 실행해 둔다.
// Supabase 에 이미 자료가 있으면 덮어쓰지 않고 멈춘다. data/hub.json 은 그대로 남는다.
import { existsSync, readFileSync } from "node:fs";

const env = Object.fromEntries(
  (existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const BASE = env.SUPABASE_URL?.replace(/(\/rest\/v1)?\/*$/, "");
const KEY = env.SUPABASE_SECRET_KEY;
const FILE = "data/hub.json";

if (!BASE || !KEY) throw new Error(".env.local 에 SUPABASE_URL 과 SUPABASE_SECRET_KEY 를 넣어 주세요.");
if (!existsSync(FILE)) throw new Error(`${FILE} 이 없습니다. 옮길 자료가 없습니다.`);

async function rest(method, query, send, prefer) {
  const res = await fetch(`${BASE}/rest/v1/hub_state${query}`, {
    method,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) },
    body: send === undefined ? undefined : JSON.stringify(send),
  });
  if (!res.ok) throw new Error(`Supabase ${method} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const text = await res.text(); // return=minimal answers 201 with an empty body
  return text ? JSON.parse(text) : null;
}

const [row] = await rest("GET", "?id=eq.1&select=version");
if (row) {
  console.log("Supabase 에 이미 자료가 있어서 옮기지 않았습니다. 덮어쓰려면 Supabase 의 hub_state 행을 지운 뒤 다시 실행하세요.");
  process.exitCode = 1;
} else {
  const data = JSON.parse(readFileSync(FILE, "utf8"));
  await rest("POST", "", { id: 1, data, version: 0 }, "return=minimal");
  console.log(
    `Supabase 로 옮겼습니다: 계정 ${data.users.length}개, 캠페인 ${data.campaigns.length}개, 제출 링크 ${data.submissions.length}개, 알림 ${data.notices.length}개.\n` +
      `이제 허브는 Supabase 를 씁니다. ${FILE} 은 백업으로 그대로 둡니다.`,
  );
}
