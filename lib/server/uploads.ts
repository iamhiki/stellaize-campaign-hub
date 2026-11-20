import { createHmac, timingSafeEqual } from "node:crypto";
import { UPLOAD_TYPES, extOf, uploadProblem, type FileInfo } from "../uploads";
import { newId } from "./auth";
import { storedSize, uploadTarget } from "./files";

/**
 * Upload tickets (11/20 제출 파일). The server decides who may put a file where, signs that decision, and the
 * browser sends the bytes straight to storage. When the browser then says "done", the signature proves the
 * key was handed out to this account for this row (or campaign), so nobody can claim someone else's upload.
 */
export type Purpose = "sub" | "template";
export type StoredFile = FileInfo & { key: string };

const SECRET = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.VAPID_PRIVATE_KEY?.trim() || process.env.STAFF_JOIN_CODE?.trim() || "campaign-hub-local";
const sign = (parts: (string | number)[]) => createHmac("sha256", SECRET).update(parts.join("|")).digest("base64url");
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** A new key and its ticket, or the reason the file can't go up. */
export async function ticket(userId: string, purpose: Purpose, target: string, name: string, size: number) {
  const problem = uploadProblem(name, size);
  if (problem) return { error: problem };
  const ext = extOf(name);
  const key = `${purpose}/${newId()}.${ext}`;
  const token = sign([userId, purpose, target, key, name, size]);
  const type = UPLOAD_TYPES[ext];
  const local = `/api/uploads?${new URLSearchParams({ key, t: token, p: purpose, g: target, n: name, s: String(size) })}`;
  return { key, token, put: await uploadTarget(key, type, local) };
}

/** Checks a ticket the browser hands back. */
export const ticketOk = (userId: string, purpose: Purpose, target: string, key: string, name: string, size: number, token: string) =>
  typeof token === "string" && same(token, sign([userId, purpose, target, key, name, size])) && key.startsWith(`${purpose}/`);

/**
 * "The upload is done": the ticket matches and the file is really in storage with the size that was announced.
 * Returns what to keep on the record, or null.
 */
export async function claim(userId: string, purpose: Purpose, target: string, f: unknown): Promise<StoredFile | null> {
  const x = f as { key?: unknown; token?: unknown; name?: unknown; size?: unknown } | undefined;
  if (!x || typeof x.key !== "string" || typeof x.name !== "string" || typeof x.size !== "number" || typeof x.token !== "string") return null;
  if (!ticketOk(userId, purpose, target, x.key, x.name, x.size, x.token)) return null;
  const size = await storedSize(x.key);
  if (size == null || size !== x.size) return null;
  return { key: x.key, name: x.name.slice(0, 200), size, type: UPLOAD_TYPES[extOf(x.name)] };
}
