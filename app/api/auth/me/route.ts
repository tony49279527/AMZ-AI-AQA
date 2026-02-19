import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/server/auth-jwt"

export async function GET(request: NextRequest) {
  const payload = await getUserFromRequest(request)
  if (!payload) {
    return NextResponse.json({ ok: false, user: null }, { status: 401 })
  }
  return NextResponse.json({
    ok: true,
    user: { id: payload.userId, email: payload.email, name: payload.name },
  })
}
