import { SignJWT, jwtVerify } from "jose"
import { randomBytes } from "crypto"
import type { NextRequest } from "next/server"

export interface JwtPayload {
  userId: string
  email: string
  name: string
}

const ALG = "HS256"
const COOKIE_NAME = "auth_token"
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

let cachedSecret: Uint8Array | null = null

function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret
  const envSecret = process.env.AUTH_SECRET
  cachedSecret = new TextEncoder().encode(envSecret || randomBytes(32).toString("hex"))
  return cachedSecret
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    const p = payload as unknown as Record<string, unknown>
    if (typeof p.userId !== "string" || typeof p.email !== "string") return null
    return { userId: p.userId as string, email: p.email as string, name: (p.name as string) ?? "" }
  } catch {
    return null
  }
}

export function getAuthCookieOptions(isProduction: boolean) {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  }
}

export function getAuthCookieName(): string {
  return COOKIE_NAME
}

export async function getUserFromRequest(request: NextRequest): Promise<JwtPayload | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}
