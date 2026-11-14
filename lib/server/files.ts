import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { supabase } from "./db";

// Uploaded documents (신분증, 통장사본) sit next to the rest of the data: a private Supabase Storage bucket when
// Supabase is connected, otherwise data/files on this machine. Nothing here is reachable by URL; every read
// goes through /api/files, which checks who is asking.
const BUCKET = "creator-docs";
const DIR = path.join(process.cwd(), "data", "files");
const local = (key: string) => path.join(DIR, key.replace(/[^A-Za-z0-9_-]/g, "_"));

const call = (pathname: string, init: RequestInit = {}) =>
  fetch(`${supabase!.base}/storage/v1/${pathname}`, { cache: "no-store", ...init, headers: { apikey: supabase!.key, Authorization: `Bearer ${supabase!.key}`, ...init.headers } });

let bucketReady = false;
async function ensureBucket() {
  if (bucketReady) return;
  const res = await call("bucket", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }) });
  // Already there from an earlier run is the normal case.
  if (!res.ok && !/exist/i.test(await res.text())) throw new Error(`Supabase Storage bucket ${res.status}`);
  bucketReady = true;
}

export async function putFile(key: string, bytes: Uint8Array, type: string) {
  if (!supabase) {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(local(key), bytes);
    return;
  }
  await ensureBucket();
  const res = await call(`object/${BUCKET}/${key}`, { method: "POST", headers: { "Content-Type": type, "x-upsert": "true" }, body: bytes as BodyInit });
  if (!res.ok) throw new Error(`Supabase Storage upload ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export async function getFile(key: string): Promise<Uint8Array | null> {
  if (!supabase) return existsSync(local(key)) ? readFileSync(local(key)) : null;
  const res = await call(`object/${BUCKET}/${key}`);
  return res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
}

export async function deleteFile(key: string) {
  if (!supabase) return rmSync(local(key), { force: true });
  await call(`object/${BUCKET}/${key}`, { method: "DELETE" });
}
