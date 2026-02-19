import { NextRequest, NextResponse } from "next/server"

const ACCESS_COOKIE_NAME = "report_access"

export async function POST(request: NextRequest) {
  const expected = process.env.ACCESS_CODE
  if (!expected?.trim()) {
    return NextResponse.json({ ok: false, error: "访问码未配置" }, { status: 500 })
  }

  let body: { code?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "请提交访问码" }, { status: 400 })
  }

  const code = typeof body.code === "string" ? body.code.trim() : ""
  if (code !== expected) {
    return NextResponse.json({ ok: false, error: "访问码错误" }, { status: 403 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ACCESS_COOKIE_NAME, code, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 天
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  })
  return res
}
