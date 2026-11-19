import { NextResponse, type NextRequest } from "next/server";
import { body, fail, issueReset, sameOrigin, str } from "@/lib/server/auth";
import { mutate } from "@/lib/server/db";
import { mailReady, sendMail } from "@/lib/server/mail";

const LIFE = 30 * 60_000; // a mailed link works for 30 minutes

// One request per email per minute, so the form can't be used to flood someone's inbox. In memory, like login tries.
const recent = new Map<string, number>();

/** Whether 비밀번호 찾기 can mail a link yet (RESEND_API_KEY and MAIL_FROM set). */
export function GET() {
  return NextResponse.json({ mail: mailReady });
}

/**
 * 비밀번호 찾기: mails a one-time link to the account's address. The answer is the same whether or not the address
 * has an account, so the form doesn't reveal who signed up.
 */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "다른 사이트에서 보낸 요청입니다.");
  if (!mailReady) return fail(503, "아직 메일을 보낼 수 없습니다. 개발자에게 비밀번호 재설정 링크를 요청해 주세요.");
  const email = str((await body(req)).email, 120).toLowerCase();
  if (!email) return fail(400, "이메일을 입력해 주세요.");
  const last = recent.get(email);
  if (last && Date.now() - last < 60_000) return NextResponse.json({ ok: true });
  recent.set(email, Date.now());

  const found = await mutate((db) => {
    const user = db.users.find((u) => u.email === email);
    return user ? { name: user.name, token: issueReset(db, user.id, LIFE) } : null;
  });
  if (found) {
    const link = `${req.nextUrl.origin}/reset?t=${found.token}`;
    await sendMail({
      to: email,
      cc: [],
      subject: "[스텔라이즈 캠페인 허브] 비밀번호 재설정",
      text: `${found.name} 님, 아래 링크에서 새 비밀번호를 정해 주세요. 링크는 30분 동안 한 번만 쓸 수 있습니다.\n\n${link}\n\n비밀번호 찾기를 누른 적이 없다면 이 메일은 무시해도 됩니다.`,
    });
  }
  return NextResponse.json({ ok: true });
}
