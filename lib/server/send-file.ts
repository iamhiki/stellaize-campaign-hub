import { NextResponse } from "next/server";
import { downloadAddress, readUpload } from "./files";

/**
 * Hand out one stored upload as a download. With Supabase: a redirect to a signed address that works for
 * `seconds` (the file never passes through this server, whose answers stop at 4.5MB on Vercel). On this machine:
 * the bytes themselves. Always a download with nosniff, so an uploaded file can't run as a page on this site.
 */
export async function sendStored(key: string, name: string, type: string, seconds: number) {
  const far = await downloadAddress(key, name, seconds);
  if (far) return NextResponse.redirect(far, { status: 302, headers: { "Cache-Control": "no-store" } });
  const bytes = readUpload(key);
  if (!bytes) return new NextResponse("파일을 찾을 수 없습니다.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return new NextResponse(bytes as BodyInit, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
