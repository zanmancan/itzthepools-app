// app/api/test/post-login-redirect/route.ts
import { NextResponse } from "next/server";

function isProd() {
  return process.env.NODE_ENV === "production";
}

export async function GET(request: Request) {
  if (isProd()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const url = new URL(request.url);
  const dest = url.searchParams.get("dest") || "/";

  // Just redirect—cookie was set in login-as.
  return NextResponse.redirect(new URL(dest, url.origin), { status: 302 });
}
