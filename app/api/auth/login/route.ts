import { NextRequest, NextResponse } from "next/server"
import { authenticateUser, toPublicUser } from "@/lib/server/user-storage"
import { signToken, getAuthCookieOptions } from "@/lib/server/auth-jwt"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>
    const email = typeof body.email === "string" ? body.email.trim() : ""
    const password = typeof body.password === "string" ? body.password : ""

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "请填写邮箱和密码" }, { status: 400 })
    }

    const user = authenticateUser(email, password)
    if (!user) {
      return NextResponse.json({ ok: false, error: "邮箱或密码错误" }, { status: 401 })
    }

    const token = await signToken({ userId: user.id, email: user.email, name: user.name })
    const cookieOpts = getAuthCookieOptions(process.env.NODE_ENV === "production")
    const res = NextResponse.json({ ok: true, user: toPublicUser(user) })
    res.cookies.set(cookieOpts.name, token, cookieOpts)
    return res
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ ok: false, error: "登录失败，请稍后重试" }, { status: 500 })
  }
}
