import { NextResponse, type NextRequest } from "next/server";
import {
  body,
  COOKIE,
  fail,
  guard,
  publicUser,
  str,
  teamNameTaken,
  userOf,
} from "@/lib/server/auth";
import { mutate, readDb } from "@/lib/server/db";

/** Who is signed in, or null. The header and the forms ask this; it never fails for a signed-out visitor. */
export async function GET(req: NextRequest) {
  const user = userOf(await readDb(), req.cookies.get(COOKIE)?.value);
  return NextResponse.json(
    { me: user ? publicUser(user) : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Change my name (마이페이지). A team member's name is also their 담당 mark on campaigns, so that moves with it. */
export async function PATCH(req: NextRequest) {
  const g = await guard(req, "any");
  if (g.deny) return g.deny;
  const name = str((await body(req)).name, 30);
  if (!name) return fail(400, "이름을 입력해 주세요.");
  const out = await mutate((db) => {
    const user = db.users.find((u) => u.id === g.user.id)!;
    if (user.name === name) return { user };
    if (user.role !== "creator") {
      if (teamNameTaken(db, name, user.id))
        return {
          error:
            "같은 이름의 팀원이 이미 있습니다. 성을 붙이는 등 구분되게 적어 주세요.",
        };
      // Another team account with the old name would still own these, so only move them when none is left.
      if (!teamNameTaken(db, user.name, user.id))
        for (const c of db.campaigns)
          c.owners = c.owners.map((o) => (o === user.name ? name : o));
    }
    user.name = name;
    return { user };
  });
  if ("error" in out) return fail(400, out.error!);
  return NextResponse.json({ me: publicUser(out.user!) });
}
