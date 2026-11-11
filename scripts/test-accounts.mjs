// 임시 테스트 계정을 만들고 지운다. 허브가 쓰는 저장소(.env.local 에 Supabase 가 있으면 Supabase, 없으면 data/hub.json)를 직접 고친다.
//   node scripts/test-accounts.mjs create   담당자 1명 + 크리에이터 2명을 만들고 비밀번호를 한 번 보여 준다
//   node scripts/test-accounts.mjs list     지금 있는 테스트 계정
//   node scripts/test-accounts.mjs delete   테스트 계정, 그 로그인 세션, 크리에이터 연결을 지운다
// 테스트 계정은 이메일이 @test.local 로 끝나는 계정이다. 실제 계정은 건드리지 않는다.
import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";

const MARK = "@test.local";
const env = Object.fromEntries(
  (existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const BASE = env.SUPABASE_URL?.replace(/\/+$/, "");
const KEY = env.SUPABASE_SECRET_KEY;
const remote = !!BASE && !!KEY;
const FILE = "data/hub.json";

async function rest(method, query, send, prefer) {
  const res = await fetch(`${BASE}/rest/v1/hub_state${query}`, {
    method,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) },
    body: send === undefined ? undefined : JSON.stringify(send),
  });
  if (!res.ok) throw new Error(`Supabase ${method} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

/** Same rule as lib/server/db.ts mutate: on Supabase the save only goes through if nobody saved in between. */
async function mutate(change) {
  if (!remote) {
    if (!existsSync(FILE)) throw new Error("data/hub.json 이 없습니다. 허브를 한 번 켜서(npm run dev) 화면을 연 뒤 다시 실행해 주세요.");
    const db = JSON.parse(readFileSync(FILE, "utf8"));
    const out = change(db);
    writeFileSync(`${FILE}.tmp`, JSON.stringify(db, null, 1));
    renameSync(`${FILE}.tmp`, FILE);
    return out;
  }
  for (let i = 0; i < 6; i++) {
    const [row] = await rest("GET", "?id=eq.1&select=data,version");
    if (!row) throw new Error("Supabase 에 아직 자료가 없습니다. 허브를 한 번 켜서 화면을 연 뒤 다시 실행해 주세요.");
    const out = change(row.data);
    const saved = await rest("PATCH", `?id=eq.1&version=eq.${row.version}&select=version`, { data: row.data, version: row.version + 1 }, "return=representation");
    if (saved.length) return out;
  }
  throw new Error("다른 저장과 겹쳐 저장하지 못했습니다. 다시 실행해 주세요.");
}

const isTest = (u) => u.email.endsWith(MARK);
const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10); // KST
const where = remote ? "Supabase" : FILE;
const cmd = process.argv[2];

if (cmd === "create") {
  // One random password for this batch, shown once. Only its scrypt hash is stored, like every other account.
  const password = randomBytes(9).toString("base64url");
  const made = await mutate((db) => {
    const out = [];
    const add = (role, name, email, entry) => {
      if (db.users.some((u) => u.email === email)) return;
      const salt = randomBytes(16).toString("hex");
      const user = { id: randomBytes(9).toString("base64url"), role, name, email, salt, hash: scryptSync(password, salt, 64).toString("hex"), createdAt: today };
      db.users.push(user);
      if (entry) Object.assign(entry, { creatorId: user.id, invite: null });
      out.push(`${role === "staff" ? "담당자    " : "크리에이터"}  ${email}  (${name})`);
    };
    add("staff", "테스트 담당자", `staff${MARK}`);
    // Each test creator takes the first row nobody has joined yet, in two different campaigns when there are two.
    const free = db.campaigns.map((c) => c.entries.find((e) => !e.creatorId && !e.droppedAt)).filter(Boolean).slice(0, 2);
    free.forEach((e, i) => add("creator", e.name, `creator${i + 1}${MARK}`, e));
    return out;
  });
  if (made.length === 0) console.log(`테스트 계정이 이미 있습니다 (${where}). 비밀번호를 잊었으면 delete 후 다시 create 하세요.`);
  else console.log(`${where} 에 테스트 계정을 만들었습니다.\n\n${made.join("\n")}\n\n비밀번호(모두 같음): ${password}\n지금만 보여 줍니다. 지울 때: node scripts/test-accounts.mjs delete`);
} else if (cmd === "delete") {
  const n = await mutate((db) => {
    const gone = new Set(db.users.filter(isTest).map((u) => u.id));
    db.users = db.users.filter((u) => !gone.has(u.id));
    for (const [k, s] of Object.entries(db.sessions)) if (gone.has(s.userId)) delete db.sessions[k];
    for (const c of db.campaigns) for (const e of c.entries) if (gone.has(e.creatorId)) e.creatorId = null;
    return gone.size;
  });
  console.log(`${where} 에서 테스트 계정 ${n}개를 지웠습니다. 테스트하면서 체크한 단계와 제출한 링크는 캠페인에 그대로 남습니다.`);
} else if (cmd === "list") {
  const rows = await mutate((db) => db.users.filter(isTest).map((u) => `${u.role}  ${u.email}  (${u.name})  ${u.createdAt}`));
  console.log(rows.length ? rows.join("\n") : `테스트 계정이 없습니다 (${where}).`);
} else {
  console.log("사용법: node scripts/test-accounts.mjs create | list | delete");
}
