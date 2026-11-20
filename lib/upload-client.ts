"use client";
import { uploadProblem } from "./uploads";

/**
 * Put one file into storage (11/20 제출 파일): ask /api/uploads for a ticket, send the bytes straight to the address
 * it gives (Supabase, or this server when there is no Supabase), reporting progress. Resolves to what the
 * hand-in or template call needs, or throws an Error whose message can be shown as is.
 */
export type Uploaded = { key: string; token: string; name: string; size: number };

export async function uploadFile(file: File, where: { purpose: "sub"; entryId: string; step: number } | { purpose: "template"; campaignId: string }, onProgress?: (pct: number) => void): Promise<Uploaded> {
  const problem = uploadProblem(file.name, file.size);
  if (problem) throw new Error(problem);
  const res = await fetch("/api/uploads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...where, name: file.name, size: file.size }) }).catch(() => null);
  const t = res && (await res.json().catch(() => null));
  if (!res?.ok || !t?.put) throw new Error(t?.error ?? "파일을 올릴 준비를 하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  await new Promise<void>((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("PUT", t.put.url);
    for (const [k, v] of Object.entries(t.put.headers as Record<string, string>)) x.setRequestHeader(k, v);
    x.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    x.onload = () => (x.status >= 200 && x.status < 300 ? resolve() : reject(new Error(x.status === 413 ? "파일이 너무 큽니다." : "파일을 올리지 못했습니다. 연결을 확인하고 다시 시도해 주세요.")));
    x.onerror = () => reject(new Error("파일을 올리지 못했습니다. 연결을 확인하고 다시 시도해 주세요."));
    x.send(file);
  });
  return { key: t.key, token: t.token, name: file.name, size: file.size };
}
