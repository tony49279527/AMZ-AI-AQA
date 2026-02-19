import { randomUUID } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { getClientIp } from "@/lib/server/request-utils"

type ApiErrorOptions = {
  status: number
  code: string
  requestId: string
  details?: unknown
}

type AuditContext = {
  requestId: string
}

export function getOrCreateRequestId(request: NextRequest): string {
  const incoming = request.headers.get("x-request-id")?.trim()
  if (incoming) {
    const sanitized = incoming.replace(/[^\w\-.:]/g, "").slice(0, 128)
    return sanitized || randomUUID()
  }
  return randomUUID()
}

export function apiError(message: string, options: ApiErrorOptions): NextResponse {
  const body: Record<string, unknown> = {
    error: message,
    code: options.code,
    requestId: options.requestId,
  }

  if (options.details !== undefined) {
    body.details = options.details
  }

  return NextResponse.json(body, {
    status: options.status,
    headers: {
      "x-request-id": options.requestId,
    },
  })
}

export async function withApiAudit(
  request: NextRequest,
  route: string,
  handler: (context: AuditContext) => Promise<Response>
): Promise<Response> {
  const requestId = getOrCreateRequestId(request)
  const startedAt = Date.now()
  let status = 500

  try {
    const response = await handler({ requestId })
    status = response.status
    if (!response.headers.get("x-request-id")) {
      response.headers.set("x-request-id", requestId)
    }
    return response
  } catch (error) {
    console.error(`[api:${route}] unhandled error`, error)
    const response = apiError("Internal Server Error", {
      status: 500,
      code: "INTERNAL_ERROR",
      requestId,
    })
    status = response.status
    return response
  } finally {
    const durationMs = Date.now() - startedAt
    const ip = getClientIp(request)
    console.info(
      `[api] method=${request.method} route=${route} status=${status} durationMs=${durationMs} requestId=${requestId} ip=${ip}`
    )
  }
}
