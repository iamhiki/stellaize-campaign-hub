import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { readDb, type Db, type Role, type User } from "./db";

export const COOKIE = "hub_session";
const WEEK = 7 * 24 * 3600;

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  return { salt, hash: scryptSync(password, salt, 64).toString("hex") };
}

export function checkPassword(password: string, user: Pick<User, "salt" | "hash">) {
  const given = scryptSync(password, user.salt, 64);
  const stored = Buffer.from(user.hash, "hex");
  return given.length === stored.length && timingSafeEqual(given, stored);
}

const digest = (token: string) => createHash("sha256").update(token).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");
export const newId = () => randomBytes(9).toString("base64url");

/** Call inside mutate(). Returns the token to put in the cookie. */
export function startSession(db: Db, userId: string) {
  const now = Date.now();
  for (const [k, s] of Object.entries(db.sessions)) if (s.exp < now) delete db.sessions[k];
  const token = newToken();
  db.sessions[digest(token)] = { userId, exp: now + WEEK * 1000 };
  return token;
}

/**
 * One-time link to set a new password (비밀번호 찾기, 11/19). Only the digest is stored, like sessions. A new link
 * replaces any older one for the same account. Call inside mutate().
 */
export function issueReset(db: Db, userId: string, ms: number) {
  const now = Date.now();
  db.resets ??= {};
  for (const [k, r] of Object.entries(db.resets)) if (r.exp < now || r.userId === userId) delete db.resets[k];
  const token = newToken();
  db.resets[digest(token)] = { userId, exp: now + ms };
  return token;
}

/** The account a reset link belongs to, if it is still good. Call inside mutate(): the link is used up. */
export function takeReset(db: Db, token: string): User | null {
  const key = digest(token);
  const r = db.resets?.[key];
  if (!r) return null;
  delete db.resets![key];
  if (r.exp < Date.now()) return null;
  return db.users.find((u) => u.id === r.userId) ?? null;
}

/** Whether a reset link is still good, without using it up (to show the form or an expired message). */
export function resetValid(db: Db, token: string) {
  const r = db.resets?.[digest(token)];
  return !!r && r.exp >= Date.now();
}

export function endSession(db: Db, token: string | undefined) {
  if (token) delete db.sessions[digest(token)];
}

export function userOf(db: Db, token: string | undefined): User | null {
  if (!token) return null;
  const s = db.sessions[digest(token)];
  if (!s || s.exp < Date.now()) return null;
  return db.users.find((u) => u.id === s.userId) ?? null;
}

/** What the browser may know about an account. */
export const publicUser = (u: User) => ({ id: u.id, role: u.role, name: u.name, email: u.email });

export const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/** A browser on another site can't make these requests: the Origin header has to be this site. */
export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

/** The signed-in user with the given role, or the response to send back instead. Changes also need sameOrigin. */
export async function guard(req: NextRequest, role: Role | "any"): Promise<{ user: User; deny?: undefined } | { deny: NextResponse; user?: undefined }> {
  if (req.method !== "GET" && !sameOrigin(req)) return { deny: fail(403, "다른 사이트에서 보낸 요청입니다.") };
  const user = userOf(await readDb(), req.cookies.get(COOKIE)?.value);
  if (!user) return { deny: fail(401, "로그인이 필요합니다.") };
  const allowed = role === "any" || user.role === role || (role === "staff" && user.role === "dev");
  if (!allowed) return { deny: fail(403, "이 화면을 볼 권한이 없습니다.") };
  return { user };
}

export function withSession(res: NextResponse, req: NextRequest, token: string) {
  // The team may open the hub over plain http on the company network, so Secure only when the request was https.
  const https = req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  res.cookies.set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: WEEK, secure: https });
  return res;
}

export async function body(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const v = await req.json();
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

export const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Five wrong passwords for one email → wait a minute. In memory: a restart clears it, which is fine for this.
const tries = new Map<string, { n: number; until: number }>();
export function throttled(email: string) {
  const t = tries.get(email);
  return !!t && t.n >= 5 && t.until > Date.now();
}
export function recordTry(email: string, ok: boolean) {
  if (ok) return void tries.delete(email);
  const t = tries.get(email);
  const n = t && t.until > Date.now() ? t.n + 1 : 1;
  tries.set(email, { n, until: Date.now() + 60_000 });
}
