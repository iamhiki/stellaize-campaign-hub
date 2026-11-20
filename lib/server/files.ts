import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { supabase } from "./db";
import { MAX_UPLOAD_BYTES } from "../uploads";

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

// ---- 제출본·기획안 양식 (11/20) ----
// A second private bucket, with the per-file limit set on the bucket itself. Big files never pass through this
// server (Vercel stops at 4.5MB a request): the browser puts them straight into storage with a one-time upload
// address, and downloads go out through a short-lived signed address. On this machine (no Supabase) the hub
// server takes and serves them itself under data/uploads.
const HUB = "hub-files";
const UP_DIR = path.join(process.cwd(), "data", "uploads");
const upLocal = (key: string) => path.join(UP_DIR, key.replace(/[^A-Za-z0-9._-]/g, "_"));
let hubReady = false;
async function ensureHub() {
  if (hubReady) return;
  const res = await call("bucket", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: HUB, name: HUB, public: false, file_size_limit: MAX_UPLOAD_BYTES }) });
  if (!res.ok && !/exist/i.test(await res.text())) throw new Error(`Supabase Storage bucket ${res.status}`);
  hubReady = true;
}

/** Where the browser sends the file: a one-time Supabase address, or this server's own upload route. */
export async function uploadTarget(key: string, type: string, localUrl: string): Promise<{ url: string; headers: Record<string, string> }> {
  if (!supabase) return { url: localUrl, headers: { "Content-Type": type } };
  await ensureHub();
  const res = await call(`object/upload/sign/${HUB}/${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  if (!res.ok) throw new Error(`Supabase Storage upload sign ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const { url } = (await res.json()) as { url: string };
  return { url: `${supabase.base}/storage/v1${url}`, headers: { "Content-Type": type, "x-upsert": "false" } };
}

/** The stored file's size, or null when nothing is there (the upload never finished). */
export async function storedSize(key: string): Promise<number | null> {
  if (!supabase) return existsSync(upLocal(key)) ? statSync(upLocal(key)).size : null;
  // HEAD answers compressed without a length; the info call gives the stored size.
  const res = await call(`object/info/${HUB}/${key}`);
  if (!res.ok) return null;
  const size = ((await res.json()) as { size?: number }).size;
  return typeof size === "number" ? size : null;
}

/** This machine only: keep what the browser sent (app/api/uploads PUT). */
export function writeUpload(key: string, bytes: Uint8Array) {
  mkdirSync(UP_DIR, { recursive: true });
  writeFileSync(upLocal(key), bytes);
}
export const readUpload = (key: string) => (existsSync(upLocal(key)) ? readFileSync(upLocal(key)) : null);

/** A download address that works for `seconds` and saves the file under `name`; null on this machine (serve it here). */
export async function downloadAddress(key: string, name: string, seconds: number): Promise<string | null> {
  if (!supabase) return null;
  const res = await call(`object/sign/${HUB}/${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: seconds }) });
  if (!res.ok) throw new Error(`Supabase Storage sign ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const { signedURL } = (await res.json()) as { signedURL: string };
  return `${supabase.base}/storage/v1${signedURL}${signedURL.includes("?") ? "&" : "?"}download=${encodeURIComponent(name)}`;
}

export async function removeUpload(key: string) {
  if (!supabase) return rmSync(upLocal(key), { force: true });
  await call(`object/${HUB}/${key}`, { method: "DELETE" });
}
