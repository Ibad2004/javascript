// Next.js 16 calls "middleware" a proxy. This is only an early, quick check: it looks at the
// token and never asks the database. The real protection is in the pages (requirePageUser),
// the actions (requireUser) and the queries (owner).
//
// Why have it at all? /tasks has a loading.tsx, so a redirect() from the page is sent after
// streaming starts and the status is 200. From here it is a real 307.
//
// It must NOT send "logged-in" visitors away from /login: a valid token of a deleted account
// would then loop between /login and /tasks. The login page decides that with the database.
import { NextResponse, type NextRequest } from "next/server";
import { loginPath } from "@/lib/safeNext";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/sessionToken";

export async function proxy(request: NextRequest) {
  // Server actions are POSTs. They are left alone, so each one answers with its own check.
  if (request.method !== "GET" && request.method !== "HEAD") return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token !== undefined && (await verifySessionToken(token)) !== null) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  return NextResponse.redirect(new URL(loginPath(`${pathname}${search}`), request.url));
}

export const config = { matcher: ["/tasks/:path*", "/about"] };
