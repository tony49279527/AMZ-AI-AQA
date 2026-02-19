import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/server/auth-jwt"
import { getSessions, createSession, deleteSession, updateSessionTitle } from "@/lib/server/chat-storage"
import { isValidReportId } from "@/lib/server/report-storage"

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 })

  const reportId = request.nextUrl.searchParams.get("reportId") ?? ""
  if (!isValidReportId(reportId)) {
    return NextResponse.json({ ok: false, error: "无效的 reportId" }, { status: 400 })
  }

  try {
    const sessions = getSessions(user.userId, reportId)
    return NextResponse.json({ ok: true, sessions })
  } catch (e) {
    console.error("chat-storage sessions GET error:", e)
    return NextResponse.json({ ok: false, error: "读取会话失败" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 })

  const body = await request.json() as Record<string, unknown>
  const reportId = typeof body.reportId === "string" ? body.reportId : ""
  const title = typeof body.title === "string" ? body.title : "新对话"

  if (!isValidReportId(reportId)) {
    return NextResponse.json({ ok: false, error: "无效的 reportId" }, { status: 400 })
  }

  try {
    const session = createSession(user.userId, reportId, title)
    return NextResponse.json({ ok: true, session })
  } catch (e) {
    console.error("chat-storage sessions POST error:", e)
    return NextResponse.json({ ok: false, error: "创建会话失败" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 })

  const reportId = request.nextUrl.searchParams.get("reportId") ?? ""
  const sessionId = request.nextUrl.searchParams.get("sessionId") ?? ""

  if (!isValidReportId(reportId) || !sessionId) {
    return NextResponse.json({ ok: false, error: "参数不完整" }, { status: 400 })
  }

  try {
    deleteSession(user.userId, reportId, sessionId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("chat-storage sessions DELETE error:", e)
    return NextResponse.json({ ok: false, error: "删除会话失败" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 })

  const body = await request.json() as Record<string, unknown>
  const reportId = typeof body.reportId === "string" ? body.reportId : ""
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : ""
  const title = typeof body.title === "string" ? body.title : ""

  if (!isValidReportId(reportId) || !sessionId || !title) {
    return NextResponse.json({ ok: false, error: "参数不完整" }, { status: 400 })
  }

  try {
    updateSessionTitle(user.userId, reportId, sessionId, title)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("chat-storage sessions PATCH error:", e)
    return NextResponse.json({ ok: false, error: "更新会话失败" }, { status: 500 })
  }
}
