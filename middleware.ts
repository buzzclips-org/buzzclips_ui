import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(
      new URL("/auth/login?status=user-not-logged-in", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/profile", "/profile/edit", "/video/upload", "/my-videos"],
};
