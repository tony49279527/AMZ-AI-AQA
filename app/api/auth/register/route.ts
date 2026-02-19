import { NextRequest, NextResponse } from "next/server"
import { createUser, toPublicUser } from "@/lib/server/user-storage"
import { signToken, getAuthCookieOptions } from "@/lib/server/auth-jwt"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>
    const email = typeof body.email === "string" ? body.email.trim() : ""
    const password = typeof body.password === "string" ? body.password : ""
    const name = typeof body.name === "string" ? body.name.trim() : ""

    if (!email || !password || !name) {
      return NextResponse.json({ ok: false, error: "请填写邮箱、密码和姓名" }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ ok: false, error: "密码至少 6 位" }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "邮箱格式不正确" }, { status: 400 })
    }

    let user
    try {
      user = createUser(email, password, name)
    } catch (e) {
      if (e instanceof Error && e.message === "EMAIL_EXISTS") {
        return NextResponse.json({ ok: false, error: "该邮箱已被注册" }, { status: 409 })
      }
      throw e
    }

    const token = await signToken({ userId: user.id, email: user.email, name: user.name })
    const cookieOpts = getAuthCookieOptions(process.env.NODE_ENV === "production")
    const res = NextResponse.json({ ok: true, user: toPublicUser(user) })
    res.cookies.set(cookieOpts.name, token, cookieOpts)
    return res
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json({ ok: false, error: "注册失败，请稍后重试" }, { status: 500 })
  }
}
