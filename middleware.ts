import { NextRequest, NextResponse } from "next/server"

const ACCESS_COOKIE_NAME = "report_access"

export function middleware(request: NextRequest) {
  const accessCode = process.env.ACCESS_CODE
  if (!accessCode || accessCode.trim() === "") {
    return NextResponse.next()
  }

  const path = request.nextUrl.pathname
  if (path === "/access" || path.startsWith("/api/access-verify")) {
    return NextResponse.next()
  }

  const cookie = request.cookies.get(ACCESS_COOKIE_NAME)?.value
  if (cookie === accessCode) {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL("/access", request.url), 307)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|logo|apple-icon).*)"],
}
