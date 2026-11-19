import { NextResponse, type NextRequest } from "next/server";
import { body, COOKIE, fail, guard, publicUser, str, userOf } from "@/lib/server/auth";
import { mutate, readDb } from "@/lib/server/db";

/** Who is signed in, or null. The header and the forms ask this; it never fails for a signed-out visitor. */
export async function GET(req: NextRequest) {
  const user = userOf(await readDb(), req.cookies.get(COOKIE)?.value);
  return NextResponse.json({ me: user ? publicUser(user) : null }, { headers: { "Cache-Control": "no-store" } });
}

/** Set my 별명 (마이페이지). Empty clears it. The name itself only a developer changes (/api/accounts PATCH). */
export async function PATCH(req: NextRequest) {
  const g = await guard(req, "any");
  if (g.deny) return g.deny;
  const b = await body(req);
  if (typeof b.nickname !== "string") return fail(400, "별명을 입력해 주세요.");
  const nickname = str(b.nickname, 20);
  const user = await mutate((db) => {
    const u = db.users.find((x) => x.id === g.user.id)!;
    if (nickname) u.nickname = nickname;
    else delete u.nickname;
    return u;
  });
  return NextResponse.json({ me: publicUser(user) });
}
