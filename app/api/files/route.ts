import { type NextRequest } from "next/server";
import { DOC_KINDS, DOC_LABEL, type DocKind } from "@/lib/files";
import { fail, guard } from "@/lib/server/auth";
import { readDb } from "@/lib/server/db";
import { getFile } from "@/lib/server/files";
import { sendStored } from "@/lib/server/send-file";
import { canSee } from "@/lib/campaigns";

const EXT = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" } as Record<string, string>;

/**
 * One uploaded document (신분증·사업자등록증, 통장사본). Staff may open any creator's; a creator only their own.
 * Always a download, never shown inline, so an uploaded file can't run as a page on this site.
 */
export async function GET(req: NextRequest) {
  const g = await guard(req, "any");
  if (g.deny) return g.deny;
  const q = req.nextUrl.searchParams;

  // ?sub=ID → an uploaded 기획안·가편안·수정본 (11/20). Staff who may see the campaign, or the creator who sent it.
  if (q.get("sub")) {
    const db = await readDb();
    const s = db.submissions.find((x) => x.id === q.get("sub"));
    const c = s && db.campaigns.find((x) => x.id === s.campaignId);
    const entry = c?.entries.find((e) => e.id === s?.entryId);
    const may = !!c && (g.user.role === "creator" ? entry?.creatorId === g.user.id : canSee(c, g.user.name));
    if (!s?.file?.key || !may) return fail(404, "파일을 찾을 수 없습니다.");
    return sendStored(s.file.key, s.file.name, s.file.type, 120);
  }
  // ?template=CAMPAIGN → 기획안 양식. Staff who may see it, or a creator on that campaign.
  if (q.get("template") === "default") {
    const t = (await readDb()).defaultTemplate;
    if (!t?.key || g.user.role === "creator") return fail(404, "양식을 찾을 수 없습니다.");
    return sendStored(t.key, t.name, t.type, 120);
  }
  if (q.get("template")) {
    const db = await readDb();
    const c = db.campaigns.find((x) => x.id === q.get("template"));
    const may = !!c && (g.user.role === "creator" ? c.entries.some((e) => e.creatorId === g.user.id && !e.droppedAt) : canSee(c, g.user.name));
    // The campaign's own template, else the team's 기본 양식.
    const t = c?.template ?? db.defaultTemplate;
    if (!t?.key || !may) return fail(404, "양식을 찾을 수 없습니다.");
    return sendStored(t.key, t.name, t.type, 120);
  }

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
