import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/server/auth-jwt"
import { getMessages, saveMessages, type ChatMessageRecord } from "@/lib/server/chat-storage"
import { isValidReportId } from "@/lib/server/report-storage"

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 })

  const reportId = request.nextUrl.searchParams.get("reportId") ?? ""
  const sessionId = request.nextUrl.searchParams.get("sessionId") ?? ""

  if (!isValidReportId(reportId) || !sessionId) {
    return NextResponse.json({ ok: false, error: "参数不完整" }, { status: 400 })
  }

  try {
    const messages = getMessages(user.userId, reportId, sessionId)
    return NextResponse.json({ ok: true, messages })
  } catch (e) {
    console.error("chat-storage messages GET error:", e)
    return NextResponse.json({ ok: false, error: "读取消息失败" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 })

  const body = await request.json() as Record<string, unknown>
  const reportId = typeof body.reportId === "string" ? body.reportId : ""
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : ""
  const messages = Array.isArray(body.messages) ? body.messages as ChatMessageRecord[] : null

  if (!isValidReportId(reportId) || !sessionId || !messages) {
    return NextResponse.json({ ok: false, error: "参数不完整" }, { status: 400 })
  }

  try {
    saveMessages(user.userId, reportId, sessionId, messages)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("chat-storage messages POST error:", e)
    return NextResponse.json({ ok: false, error: "保存消息失败" }, { status: 500 })
  }
}
