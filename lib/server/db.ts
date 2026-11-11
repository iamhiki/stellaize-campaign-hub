import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Campaign, Notice, Submission } from "../campaigns";
import { todayKST } from "../date";
import { demoCampaigns } from "../demo";

// shortcut: one JSON file on the machine that runs the hub (data/hub.json, not in git). It is enough for a
// team of 3~4 plus their creators on one server process. Supabase (README 기술 스택) replaces this file:
// every read and write goes through readDb/mutate, so nothing else has to know.
const FILE = path.join(process.cwd(), "data", "hub.json");

/** dev = the people building the hub: everything staff can do, plus a read-only look at any creator's screen. */
export type Role = "staff" | "creator" | "dev";
export type User = { id: string; role: Role; name: string; email: string; salt: string; hash: string; createdAt: string };
export type Db = {
  users: User[];
  /** sha256(session token) → who and until when. The token itself only lives in the browser cookie. */
  sessions: Record<string, { userId: string; exp: number }>;
  campaigns: Campaign[];
  submissions: Submission[];
  notices: Notice[];
};

function write(db: Db) {
  mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(db, null, 1));
  renameSync(tmp, FILE); // swap in one step so a crash never leaves half a file
}

/** Reads the file every time: the proxy and the API run as separate bundles, so a cached copy would go stale. */
export function readDb(): Db {
  if (!existsSync(FILE)) write({ users: [], sessions: {}, campaigns: demoCampaigns(todayKST()), submissions: [], notices: [] });
  return JSON.parse(readFileSync(FILE, "utf8"));
}

/** Read, change, save. Synchronous on purpose: nothing else runs in between, so two requests can't overwrite each other. */
export function mutate<T>(change: (db: Db) => T): T {
  const db = readDb();
  const out = change(db);
  write(db);
  return out;
}
