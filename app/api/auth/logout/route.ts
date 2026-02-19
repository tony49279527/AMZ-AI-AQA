import { NextResponse } from "next/server"
import { getAuthCookieName } from "@/lib/server/auth-jwt"

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(getAuthCookieName(), "", { path: "/", maxAge: 0 })
  return res
}
