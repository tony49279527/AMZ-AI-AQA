import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

const ACCESS_COOKIE_NAME = "report_access"
const AUTH_COOKIE_NAME = "auth_token"

let cachedSecret: Uint8Array | null = null

function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret
  const envSecret = process.env.AUTH_SECRET
  if (!envSecret) return new Uint8Array(0)
  cachedSecret = new TextEncoder().encode(envSecret)
  return cachedSecret
}

async function isValidAuthToken(token: string): Promise<boolean> {
  const secret = getSecret()
  if (secret.length === 0) return false
  try {
    const { payload } = await jwtVerify(token, secret)
    return typeof payload.userId === "string" && typeof payload.email === "string"
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const accessCode = process.env.ACCESS_CODE
  if (!accessCode || accessCode.trim() === "") {
    return NextResponse.next()
  }

  const path = request.nextUrl.pathname

  if (
    path.startsWith("/api/") ||
    path === "/access" ||
    path === "/login" ||
    path === "/register"
  ) {
    return NextResponse.next()
  }

  const accessCookie = request.cookies.get(ACCESS_COOKIE_NAME)?.value
  if (accessCookie === accessCode) {
    return NextResponse.next()
  }

  const authCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value
  if (authCookie && await isValidAuthToken(authCookie)) {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL("/access", request.url), 307)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|logo|apple-icon|fa/).*)"],
}
