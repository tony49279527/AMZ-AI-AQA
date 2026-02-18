import { createHash, timingSafeEqual } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/server/api-response"
import { getClientIp } from "@/lib/server/request-utils"

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

function requireApiToken(request: NextRequest, requestId: string): NextResponse | null {
  const expectedToken = process.env.API_ACCESS_TOKEN
  if (!expectedToken) {
    if (process.env.NODE_ENV === "production") {
      return apiError("Server misconfigured: API_ACCESS_TOKEN is missing", {
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

export function enforceApiGuard(request: NextRequest, options: GuardOptions): NextResponse | null {
  const requestId = options.requestId ?? "unknown"
  const authError = requireApiToken(request, requestId)
  if (authError) return authError

  return enforceRateLimit(request, options)
}
