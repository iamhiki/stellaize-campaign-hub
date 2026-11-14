import { NextResponse, type NextRequest } from "next/server";
import { STEPS } from "@/lib/campaigns";
import { todayKST } from "@/lib/date";
import { DOC_KINDS, MAX_DOC_BYTES, sniff, type DocKind } from "@/lib/files";
import { fail, guard, str } from "@/lib/server/auth";
import { mutate, readDb, type Doc, type Profile } from "@/lib/server/db";
import { deleteFile, putFile } from "@/lib/server/files";

const DOCS_STEP = STEPS.findIndex((s) => s.label === "정산 서류 수급");
const send = (profile: Profile | undefined) => NextResponse.json({ profile: profile ?? null }, { headers: { "Cache-Control": "no-store" } });

/** The creator's own shipping info and which documents they have uploaded. */
export async function GET(req: NextRequest) {
  const g = await guard(req, "creator");
  if (g.deny) return g.deny;
  return send((await readDb()).profiles?.[g.user.id]);
}

/**
 * 기획자 11/14: 주소·연락처·통장사본·신분증을 크리에이터가 직접 올린다. Consent is asked on this form, at the
 * moment the data is handed over, and the time is kept. Once both documents are in, 정산 서류 수급 is checked
 * on the creator's rows, the same as staff checking it by hand.
 */
export async function POST(req: NextRequest) {
  const g = await guard(req, "creator");
  if (g.deny) return g.deny;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, "보낸 내용을 읽지 못했습니다. 다시 시도해 주세요.");
  }
  const legalName = str(form.get("legalName"), 40);
  const phone = str(form.get("phone"), 20);
  const address = str(form.get("address"), 200);
  if (!legalName || !address) return fail(400, "성함과 주소를 넣어 주세요.");
  if (!/^[0-9+\- ]{9,20}$/.test(phone)) return fail(400, "전화번호를 확인해 주세요. 숫자와 - 만 넣습니다.");

  const before = (await readDb()).profiles?.[g.user.id];
  if (!before?.consentAt && form.get("consent") !== "yes") return fail(400, "개인정보 수집·이용에 동의해야 저장할 수 있습니다.");

  const today = todayKST();
  const docs: Partial<Record<DocKind, Doc>> = {};
  for (const kind of DOC_KINDS) {
    const file = form.get(kind);
    if (!(file instanceof File) || file.size === 0) continue;
    if (file.size > MAX_DOC_BYTES) return fail(400, "파일은 5MB 이하만 올릴 수 있습니다.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniff(bytes);
    if (!type) return fail(400, "PDF, JPG, PNG 파일만 올릴 수 있습니다.");
    await putFile(`${g.user.id}/${kind}`, bytes, type);
    docs[kind] = { name: file.name.slice(0, 120), type, at: today };
  }

  return send(
    await mutate((db) => {
      const old = db.profiles?.[g.user.id];
      const profile: Profile = { ...old, legalName, phone, address, consentAt: old?.consentAt ?? new Date().toISOString(), ...docs };
      db.profiles = { ...db.profiles, [g.user.id]: profile };
      if (profile.idDoc && profile.bankCopy)
        for (const c of db.campaigns) for (const e of c.entries) if (e.creatorId === g.user.id && !e.droppedAt && !e.done[DOCS_STEP]) e.done[DOCS_STEP] = today;
      return profile;
    }),
  );
}

/** The creator takes their personal data back: the info and both files are removed. Checked steps stay as they are. */
export async function DELETE(req: NextRequest) {
  const g = await guard(req, "creator");
  if (g.deny) return g.deny;
  for (const kind of DOC_KINDS) await deleteFile(`${g.user.id}/${kind}`);
  await mutate((db) => {
    if (db.profiles) delete db.profiles[g.user.id];
  });
  return send(undefined);
}
