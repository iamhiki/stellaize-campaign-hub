import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Campaign, Notice, Submission } from "../campaigns";
import { todayKST } from "../date";
import { demoCampaigns } from "../demo";

/** dev = the people building the hub: everything staff can do, plus a read-only look at any creator's screen. */
export type Role = "staff" | "creator" | "dev";
/** name: 본명 (creators: 활동명), changed only by a developer. nickname: 별명, the person sets it on 마이페이지.
 * lastLoginAt: ISO time of the last sign-in (any new session). Missing for accounts that haven't signed in since 11/19. */
export type User = { id: string; role: Role; name: string; email: string; salt: string; hash: string; createdAt: string; lastLoginAt?: string; nickname?: string };
/** A file a creator uploaded. The bytes live in lib/server/files.ts storage under `${userId}/${kind}`. */
export type Doc = { name: string; type: string; at: string };
/**
 * What a creator typed in for shipping and settlement (기획자 11/14: 크리에이터가 직접 올리면 편하다).
 * Personal data: sent only to staff and to the creator it belongs to.
 */
export type Profile = { legalName: string; phone: string; address: string; consentAt: string; idDoc?: Doc; bankCopy?: Doc };
export type Db = {
  users: User[];
  /** sha256(session token) → who and until when. The token itself only lives in the browser cookie. */
  sessions: Record<string, { userId: string; exp: number }>;
  campaigns: Campaign[];
  submissions: Submission[];
  notices: Notice[];
  /** creator user id → their shipping info and documents. Missing in data saved before 11/14. */
  profiles?: Record<string, Profile>;
  /** sha256(password reset token) → whose password and until when. One use each. Missing in data saved before 11/19. */
  resets?: Record<string, { userId: string; exp: number }>;
  /** 크리에이터 ↔ 담당자 대화, one thread per creator row (기획자 11/19). Missing in data saved before 11/19. */
  messages?: Message[];
  /** user id → entry id → the time (ISO) that user last read that thread. */
  reads?: Record<string, Record<string, string>>;
  /** sha256(share token) → which hand-in an advertiser may download, until when (광고주에게 넘기기, 11/20). */
  shares?: Record<string, { subId: string; exp: number; by: string }>;
  /** Devices that asked for app notifications (마이페이지 알림 켜기, 11/19). Missing in data saved before 11/19. */
  pushSubs?: PushSub[];
};
/** One browser's web push address. The keys only let the push service deliver to it; they open nothing else. */
export type PushSub = { endpoint: string; keys: { p256dh: string; auth: string }; userId: string; at: string };
export type Message = { id: string; campaignId: string; entryId: string; from: "staff" | "creator"; userId: string; name: string; text: string; at: string };

const fresh = (): Db => ({ users: [], sessions: {}, campaigns: demoCampaigns(todayKST()), submissions: [], notices: [] });

// Two places the hub can keep its data. With SUPABASE_URL and SUPABASE_SECRET_KEY set (.env.local), Supabase;
// without them, a file on this machine, so the hub still runs on a PC with no account anywhere.
// Every read and write goes through readDb/mutate, so nothing else knows which one is in use.
const BASE = process.env.SUPABASE_URL?.trim().replace(/(\/rest\/v1)?\/*$/, ""); // a pasted ".../rest/v1/" still works
const KEY = process.env.SUPABASE_SECRET_KEY?.trim();
const remote = !!BASE && !!KEY;
/** Where uploaded files go (lib/server/files.ts): the same Supabase project, or null for this machine's disk. */
export const supabase = remote ? { base: BASE!, key: KEY! } : null;

// ---- Supabase ----
// shortcut: the whole Db is one jsonb row (table hub_state, supabase/schema.sql), not a table per kind of
// record. That keeps every rule in lib/ops.ts and the routes as it is, and suits a beta with a handful of
// campaigns. Its ceiling: each request reads and each change rewrites the whole row, so move to real tables
// (and Supabase RLS for 대외비 campaigns) before the data grows past a few hundred campaigns.
type Row = { data: Db; version: number };

async function rest(method: "GET" | "POST" | "PATCH", query: string, send?: unknown, prefer?: string): Promise<Row[]> {
  const res = await fetch(`${BASE}/rest/v1/hub_state${query}`, {
    method,
    cache: "no-store",
    // The secret key skips row level security, which is why it stays on the server and the table has no policies.
    headers: { apikey: KEY!, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) },
    body: send === undefined ? undefined : JSON.stringify(send),
  });
  if (!res.ok) throw new Error(`Supabase ${method} hub_state ${res.status}: ${(await res.text()).slice(0, 300)}`);
  // The first-run insert answers 201 with an empty body (no return=representation), which res.json() rejects.
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

const ONE = "?id=eq.1&select=data,version";

async function load(): Promise<Row> {
  const [row] = await rest("GET", ONE);
  if (row) return row;
  // First run on an empty table. Two servers starting together both try; the second insert is ignored.
  await rest("POST", "", { id: 1, data: fresh(), version: 0 }, "resolution=ignore-duplicates");
  const [made] = await rest("GET", ONE);
  if (!made) throw new Error("Supabase hub_state 테이블에 첫 행을 만들지 못했습니다. supabase/schema.sql 을 실행했는지 확인해 주세요.");
  return made;
}

// ---- file ----
const FILE = path.join(process.cwd(), "data", "hub.json");

function write(db: Db) {
  mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(db, null, 1));
  renameSync(tmp, FILE); // swap in one step so a crash never leaves half a file
}

/** Reads the file every time: the proxy and the API run as separate bundles, so a cached copy would go stale. */
function readFile(): Db {
  if (!existsSync(FILE)) write(fresh());
  return JSON.parse(readFileSync(FILE, "utf8"));
}

export async function readDb(): Promise<Db> {
  return remote ? (await load()).data : readFile();
}

/**
 * Read, change, save, without two requests overwriting each other.
 * `change` must only touch the db it is given: on Supabase it runs again on a fresh copy when another request
 * saved in between (the save only goes through if the row's version is still the one that was read).
 */
export async function mutate<T>(change: (db: Db) => T): Promise<T> {
  if (!remote) {
    // No await between read and write, so nothing else in this process runs in between.
    const db = readFile();
    const out = change(db);
    write(db);
    return out;
  }
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data, version } = await load();
    const out = change(data);
    const saved = await rest("PATCH", `?id=eq.1&version=eq.${version}&select=version`, { data, version: version + 1 }, "return=representation");
    if (saved.length > 0) return out;
  }
  throw new Error("다른 저장과 여러 번 겹쳐 저장하지 못했습니다. 다시 시도해 주세요.");
}
