import { createHash, timingSafeEqual } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/server/api-response"
import { getClientIp } from "@/lib/server/request-utils"
import { getUserFromRequest } from "@/lib/server/auth-jwt"

type RateLimitBucket = {
  count: number
  resetAt: number
}

type GuardOptions = {
  route: string
  maxRequests?: number
  windowMs?: number
  requestId?: string
}

declare global {
  var __apiRateLimitStore: Map<string, RateLimitBucket> | undefined
}

const rateLimitStore = globalThis.__apiRateLimitStore ?? new Map<string, RateLimitBucket>()
globalThis.__apiRateLimitStore = rateLimitStore

function getRequestToken(request: NextRequest): string | null {
  const apiToken = request.headers.get("x-api-token")
  if (apiToken) return apiToken.trim()

  const authHeader = request.headers.get("authorization")
  if (!authHeader?.toLowerCase().startsWith("bearer ")) return null

  return authHeader.slice(7).trim() || null
}

function safeCompareToken(input: string, expected: string): boolean {
  const inputHash = createHash("sha256").update(input).digest()
  const expectedHash = createHash("sha256").update(expected).digest()
  return timingSafeEqual(inputHash, expectedHash)
}

function hasValidAccessCookie(request: NextRequest): boolean {
  const accessCode = process.env.ACCESS_CODE
  if (!accessCode?.trim()) return false
  const cookie = request.cookies.get("report_access")?.value
  return !!cookie && cookie === accessCode
}

async function requireApiToken(request: NextRequest, requestId: string): Promise<NextResponse | null> {
  // 1. 浏览器用户：通过访问码 Cookie 验证
  if (hasValidAccessCookie(request)) return null

  // 2. 已登录用户：通过 JWT auth_token 验证
  const authUser = await getUserFromRequest(request)
  if (authUser) return null

  // 3. 程序化调用：通过 API Token 验证
  const expectedToken = process.env.API_ACCESS_TOKEN
  if (!expectedToken) {
    if (process.env.NODE_ENV === "production" && !process.env.ACCESS_CODE?.trim()) {
      return apiError("Server misconfigured: neither API_ACCESS_TOKEN nor ACCESS_CODE is set", {
        status: 500,
        code: "SERVER_MISCONFIGURED",
        requestId,
      })
    }
    return null
  }

  const requestToken = getRequestToken(request)
  if (!requestToken || !safeCompareToken(requestToken, expectedToken)) {
    return apiError("Unauthorized", {
      status: 401,
      code: "UNAUTHORIZED",
      requestId,
    })
  }

  return null
}

function enforceRateLimit(request: NextRequest, options: GuardOptions): NextResponse | null {
  const requestId = options.requestId ?? "unknown"
  const now = Date.now()
  const windowMs = options.windowMs ?? 60_000
  const maxRequests = options.maxRequests ?? 60
  const ip = getClientIp(request)
  const key = `${options.route}:${ip}`

  if (rateLimitStore.size > 5_000) {
    for (const [bucketKey, bucket] of rateLimitStore.entries()) {
      if (bucket.resetAt <= now) {
        rateLimitStore.delete(bucketKey)
      }
    }
  }

  const current = rateLimitStore.get(key)
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }

  if (current.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    const response = apiError("Too many requests, please retry later", {
      status: 429,
      code: "RATE_LIMITED",
      requestId,
    })
    response.headers.set("Retry-After", String(retryAfterSeconds))
    return response
  }

  current.count += 1
  rateLimitStore.set(key, current)
  return null
}

export async function enforceApiGuard(request: NextRequest, options: GuardOptions): Promise<NextResponse | null> {
  const requestId = options.requestId ?? "unknown"
  const authError = await requireApiToken(request, requestId)
  if (authError) return authError

  return enforceRateLimit(request, options)
}
