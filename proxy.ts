import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, userOf } from "@/lib/server/auth";
import { readDb } from "@/lib/server/db";

/**
 * Sends each visitor to the screens for their role before a page renders: staff screens for staff, 내 일정 for
 * creators, both for developers, the login form for everyone else. This is only the redirect. What data a role may read or change
 * is decided again in every API route (lib/server/auth.ts guard), so skipping this file exposes nothing.
 */
export async function proxy(req: NextRequest) {
  const user = userOf(await readDb(), req.cookies.get(COOKIE)?.value);
  const path = req.nextUrl.pathname;
  const to = (p: string) => NextResponse.redirect(new URL(p, req.url));
  const home = user?.role === "creator" ? "/creator" : "/campaigns";

  if (path === "/login" || path === "/signup") return user ? to(home) : NextResponse.next();
  if (!user) return to("/login");
  if (user.role !== "dev" && path.startsWith("/creator") !== (user.role === "creator")) return to(home);
  return NextResponse.next();
}

export const config = {
  matcher: ["/campaigns/:path*", "/today", "/contracts", "/mypage", "/creator", "/login", "/signup"],
};
