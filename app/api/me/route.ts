import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, publicUser, userOf } from "@/lib/server/auth";
import { readDb } from "@/lib/server/db";

/** Who is signed in, or null. The header and the forms ask this; it never fails for a signed-out visitor. */
export async function GET(req: NextRequest) {
  const user = userOf(await readDb(), req.cookies.get(COOKIE)?.value);
  return NextResponse.json({ me: user ? publicUser(user) : null }, { headers: { "Cache-Control": "no-store" } });
}
