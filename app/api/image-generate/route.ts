import { NextRequest } from "next/server"
import { enforceApiGuard } from "@/lib/server/api-guard"
import { apiError, withApiAudit } from "@/lib/server/api-response"
import { DEFAULT_IMAGE_MODEL } from "@/lib/constants"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const MAX_PROMPT_LENGTH = 4000
const MAX_REFERENCE_IMAGES = 5
const MAX_IMAGE_DATAURL_LENGTH = 5_000_000 // ~5MB base64

function normalizeModel(model: unknown): string {
  if (typeof model !== "string") return DEFAULT_IMAGE_MODEL
  const trimmed = model.trim()
  if (!trimmed || !/^[a-zA-Z0-9._/-]{1,120}$/.test(trimmed)) return DEFAULT_IMAGE_MODEL
  return trimmed
}

function normalizeAspectRatio(ratio: unknown): string | undefined {
  if (typeof ratio !== "string") return undefined
  const v = ratio.trim()
  const allowed = ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "5:4", "4:5", "21:9"]
  return allowed.includes(v) ? v : undefined
}

/** 构建 user content：文案 + 参考图（可选） */
function buildUserContent(prompt: string, referenceImages: string[]): { type: "text"; text: string } | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> {
  const text = `请根据以下「图片建议」生成符合亚马逊主图或 A+ 场景要求的图片。若有参考图，请结合参考图风格与构图进行创作。\n\n【图片建议】\n${prompt.slice(0, MAX_PROMPT_LENGTH)}`
  if (!referenceImages || referenceImages.length === 0) {
    return { type: "text", text }
  }
  const parts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [{ type: "text", text }]
  for (const url of referenceImages.slice(0, MAX_REFERENCE_IMAGES)) {
    if (typeof url === "string" && url.startsWith("data:") && url.length < MAX_IMAGE_DATAURL_LENGTH) {
      parts.push({ type: "image_url", image_url: { url } })
    }
  }
  return parts
}

export async function POST(request: NextRequest) {
  return withApiAudit(request, "image-generate", async ({ requestId }) => {
    const guardError = enforceApiGuard(request, { route: "image-generate", maxRequests: 30, windowMs: 60_000, requestId })
    if (guardError) return guardError

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return apiError("未配置 OPENROUTER_API_KEY", { status: 500, code: "LLM_API_KEY_MISSING", requestId })
    }

    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return apiError("请求体必须是 JSON", { status: 400, code: "INVALID_JSON", requestId })
    }

    const promptRaw = body.prompt
    if (typeof promptRaw !== "string" || !promptRaw.trim()) {
      return apiError("缺少 prompt（图片建议/描述）", { status: 400, code: "MISSING_PROMPT", requestId })
    }
    const prompt = promptRaw.trim()

    const referenceImages: string[] = Array.isArray(body.referenceImages)
      ? (body.referenceImages as string[]).filter((u): u is string => typeof u === "string" && u.startsWith("data:"))
      : []
    const model = normalizeModel(body.model)
    const aspect_ratio = normalizeAspectRatio(body.aspect_ratio)

    const userContent = buildUserContent(prompt, referenceImages)

    const payload: Record<string, unknown> = {
      model,
      messages: [{ role: "user", content: userContent }],
      modalities: ["image", "text"],
      stream: false,
    }
    if (aspect_ratio) {
      (payload as Record<string, unknown>).image_config = { aspect_ratio }
    }

    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || process.env.NEXT_PUBLIC_APP_URL || "https://amzaiagent.com",
          "X-Title": "AI Report - Image Generate",
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errText = await res.text()
        return apiError(
          process.env.NODE_ENV === "production" ? "图片生成服务暂时不可用" : `OpenRouter ${res.status}: ${errText.slice(0, 200)}`,
          { status: 502, code: "UPSTREAM_ERROR", requestId }
        )
      }

      const result = (await res.json()) as {
        choices?: Array<{
          message?: {
            content?: string
            images?: Array<{ type?: string; image_url?: { url?: string }; imageUrl?: { url?: string } }>
          }
        }>
      }

      const message = result.choices?.[0]?.message
      const rawImages = message?.images ?? []
      const images = rawImages
        .map((img: { image_url?: { url?: string }; imageUrl?: { url?: string }; url?: string }) =>
          img.image_url?.url ?? img.imageUrl?.url ?? (typeof img.url === "string" ? img.url : undefined)
        )
        .filter((u): u is string => typeof u === "string" && (u.startsWith("data:") || u.startsWith("https://")))

      const hint = images.length === 0 ? "模型未返回图片，请尝试更换模型或简化描述；若报错请检查 OPENROUTER_API_KEY 是否配置。" : undefined

      return new Response(JSON.stringify({ images, ...(hint ? { message: hint } : {}) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      return apiError(process.env.NODE_ENV === "production" ? "图片生成失败" : msg, { status: 500, code: "IMAGE_GENERATE_FAILED", requestId })
    }
  })
}
