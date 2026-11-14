import { type NextRequest } from "next/server";
import { DOC_KINDS, DOC_LABEL, type DocKind } from "@/lib/files";
import { fail, guard } from "@/lib/server/auth";
import { readDb } from "@/lib/server/db";
import { getFile } from "@/lib/server/files";

const EXT = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" } as Record<string, string>;

/**
 * One uploaded document (신분증·사업자등록증, 통장사본). Staff may open any creator's; a creator only their own.
 * Always a download, never shown inline, so an uploaded file can't run as a page on this site.
 */
export async function GET(req: NextRequest) {
  const g = await guard(req, "any");
  if (g.deny) return g.deny;
  const kind = req.nextUrl.searchParams.get("kind") as DocKind;
  const owner = g.user.role === "creator" ? g.user.id : (req.nextUrl.searchParams.get("user") ?? "");
  if (!DOC_KINDS.includes(kind) || !owner) return fail(400, "파일을 찾을 수 없습니다.");
  const profile = (await readDb()).profiles?.[owner];
  const doc = profile?.[kind];
  const bytes = doc && (await getFile(`${owner}/${kind}`));
  if (!profile || !doc || !bytes) return fail(404, "파일을 찾을 수 없습니다.");
  const name = encodeURIComponent(`${profile.legalName}-${DOC_LABEL[kind]}.${EXT[doc.type] ?? "bin"}`);
  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": doc.type,
      "Content-Disposition": `attachment; filename*=UTF-8''${name}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
