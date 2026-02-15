import { NextRequest } from "next/server"
import { enforceApiGuard } from "@/lib/server/api-guard"
import { apiError, withApiAudit } from "@/lib/server/api-response"
import {
    allocateReportId,
    ensureReportsDir,
    getReportMetaFilePath,
    writeFileAtomically,
} from "@/lib/server/report-storage"
import { ReportDataFile, ReportMetadata, toLanguageLabel } from "@/lib/report-metadata"

// 带重试的 fetch（指数退避 + 超时控制）
async function fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries = 3,
    timeoutMs = 90000
): Promise<Response> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), timeoutMs)

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            })
            clearTimeout(timer)

            // 429 (Rate Limit) 或 5xx 错误可重试
            if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000
                console.warn(`[Retry ${attempt}/${maxRetries}] Status ${response.status}, waiting ${Math.round(delay)}ms...`)
                await new Promise(r => setTimeout(r, delay))
                continue
            }
            return response
        } catch (error) {
            clearTimeout(timer)
            if (attempt >= maxRetries) throw error
            const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000
            const errMsg = error instanceof Error ? error.message : "Unknown"
            console.warn(`[Retry ${attempt}/${maxRetries}] ${errMsg}, waiting ${Math.round(delay)}ms...`)
            await new Promise(r => setTimeout(r, delay))
        }
    }
    throw new Error("fetchWithRetry: exhausted all retries")
}

const CHAPTERS = [
    { id: "market", title: "一、市场与客群洞察", prompt: "分析该产品的目标市场、核心客群画像、用户痛点、以及使用场景。包括市场规模趋势和用户搜索行为分析。" },
    { id: "competitor", title: "二、竞品分析与我方策略", prompt: "对比我方产品与竞品的优劣势，分析竞品的定价策略、评分、review数量、市场份额。给出我方差异化策略建议。" },
    { id: "returns", title: "三、退货报告分析", prompt: "基于产品分析常见的退货原因、差评要点、以及用户抱怨集中的问题。给出降低退货率的策略。" },
    { id: "listing", title: "四、Listing全面优化方案", prompt: "为产品的亚马逊Listing提供优化建议，包括标题优化、五点描述、A+内容、关键词策略、图片建议等。" },
    { id: "product", title: "五、产品及周边优化建议", prompt: "从产品本身的设计、功能、包装、配件等方面提出改进建议。分析可拓展的周边产品和捆绑销售机会。" },
    { id: "keywords", title: "六、关联场景词/产品拓展", prompt: "挖掘与产品相关的长尾关键词、场景词、关联搜索词。分析拓展新品类或新场景的机会。" },
    { id: "summary", title: "报告总结", prompt: "用结构化方式总结所有章节的关键发现和行动建议。重点突出最具商业价值的3-5个建议。" },
]

const MAX_TITLE_LENGTH = 200
const MAX_CUSTOM_PROMPT_LENGTH = 4000
const MAX_ASIN_COUNT = 20
const MAX_REFERENCE_COUNT = 50
const ASIN_REGEX = /^[A-Z0-9]{10}$/
const LANGUAGE_CODE_REGEX = /^[a-z]{2}(?:-[A-Z]{2})?$/

const ALLOWED_MARKETPLACES = new Set([
    "US", "CA", "MX", "BR",
    "UK", "DE", "FR", "IT", "ES", "NL", "SE", "PL", "TR",
    "JP", "AU", "SG", "IN", "SA", "AE",
])

function normalizeModel(model: unknown): string | null {
    if (typeof model !== "string") return null
    const trimmed = model.trim()
    if (!trimmed) return null
    if (!/^[a-zA-Z0-9._/-]{1,100}$/.test(trimmed)) return null
    return trimmed
}

function normalizePositiveInt(value: unknown, fallback: number, min: number, max: number): number {
    const parsed = Number.parseInt(String(value), 10)
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback
    return Math.min(max, Math.max(min, parsed))
}

function normalizeTrimmedString(input: unknown, maxLength: number): string | null {
    if (typeof input !== "string") return null
    const trimmed = input.trim()
    if (!trimmed || trimmed.length > maxLength) return null
    return trimmed
}

function parseAsinList(input: unknown): string[] | null {
    if (typeof input !== "string") return null

    const unique = Array.from(new Set(
        input
            .split(/[\n,，;\t ]+/)
            .map((item) => item.trim())
            .filter(Boolean)
            .map((item) => item.toUpperCase())
    ))

    if (unique.length === 0 || unique.length > MAX_ASIN_COUNT) return null
    if (!unique.every((asin) => ASIN_REGEX.test(asin))) return null
    return unique
}

function normalizeMarketplace(input: unknown): string | null {
    if (typeof input !== "string") return null
    const normalized = input.trim().toUpperCase()
    if (!ALLOWED_MARKETPLACES.has(normalized)) return null
    return normalized
}

function normalizeLanguageCode(input: unknown): string {
    if (typeof input !== "string") return "zh"
    const normalized = input.trim()
    if (!LANGUAGE_CODE_REGEX.test(normalized)) return "zh"
    return normalized
}

function normalizeCustomPrompt(input: unknown): string | undefined {
    if (typeof input !== "string") return undefined
    const trimmed = input.trim()
    if (!trimmed) return undefined
    return trimmed.slice(0, MAX_CUSTOM_PROMPT_LENGTH)
}

function buildSystemCollectedDataFiles(
    coreAsins: string[],
    competitorAsins: string[],
    websiteCount: number,
    youtubeCount: number
): ReportDataFile[] {
    const nowDate = new Date().toISOString().split("T")[0]
    const files: ReportDataFile[] = []

    coreAsins.forEach((asin, index) => {
        files.push({
            id: `core-${index + 1}`,
            category: "亚马逊数据",
            name: `Amazon Product Page (${asin})`,
            size: "N/A",
            icon: "fa-shopping-cart text-slate-400",
            addedAt: nowDate,
            source: "系统采集",
        })
    })

    competitorAsins.forEach((asin, index) => {
        files.push({
            id: `competitor-${index + 1}`,
            category: "竞品数据",
            name: `Competitor Analysis (${asin})`,
            size: "N/A",
            icon: "fa-chart-line text-slate-400",
            addedAt: nowDate,
            source: "系统采集",
        })
    })

    files.push({
        id: "web-references",
        category: "网站参考",
        name: `Web References (${websiteCount} sources)`,
        size: "N/A",
        icon: "fa-globe text-slate-400",
        addedAt: nowDate,
        source: "系统采集",
    })

    files.push({
        id: "youtube-references",
        category: "YouTube",
        name: `YouTube References (${youtubeCount} videos)`,
        size: "N/A",
        icon: "fa-youtube text-slate-400",
        addedAt: nowDate,
        source: "系统采集",
    })

    return files
}

export async function POST(request: NextRequest) {
    return withApiAudit(request, "reports:generate", async ({ requestId }) => {
        const guardError = enforceApiGuard(request, { route: "reports:generate", maxRequests: 12, windowMs: 60_000, requestId })
        if (guardError) return guardError

        try {
            const body = (await request.json()) as Record<string, unknown>
            const title = normalizeTrimmedString(body.title, MAX_TITLE_LENGTH)
            const coreAsinList = parseAsinList(body.coreAsins)
            const competitorAsinList = parseAsinList(body.competitorAsins)
            const marketplace = normalizeMarketplace(body.marketplace)
            const language = normalizeLanguageCode(body.language)
            const customPrompt = normalizeCustomPrompt(body.customPrompt)
            const requestModel = body.model
            const websiteCount = normalizePositiveInt(body.websiteCount, 10, 1, MAX_REFERENCE_COUNT)
            const youtubeCount = normalizePositiveInt(body.youtubeCount, 10, 1, MAX_REFERENCE_COUNT)

            if (!title || !coreAsinList || !competitorAsinList || !marketplace) {
                return apiError("Missing required fields", { status: 400, code: "MISSING_REQUIRED_FIELDS", requestId })
            }
            const coreAsins = coreAsinList.join(", ")
            const competitorAsins = competitorAsinList.join(", ")

            const apiKey = process.env.OPENROUTER_API_KEY
            const baseUrl = process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1"
            const model = normalizeModel(requestModel) || process.env.LLM_MODEL || "google/gemini-2.0-flash-001"

            if (!apiKey) {
                return apiError("未配置 API Key", { status: 500, code: "LLM_API_KEY_MISSING", requestId })
            }

            const encoder = new TextEncoder()
            const stream = new ReadableStream({
                async start(controller) {
                    const send = (event: string, data: unknown) => {
                        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
                    }

                    const reportsDir = ensureReportsDir()
                    const { reportId, filePath } = allocateReportId(reportsDir)
                    const metaFilePath = getReportMetaFilePath(reportId)

                    // 根据传入的 agents 配置过滤章节
                    const activeAgents = (body.agents as Record<string, { enabled: boolean }>) || {}
                    const filteredChapters = CHAPTERS.filter(chapter => {
                        // 如果传入了配置，则检查对应 ID 是否启用。默认启用。
                        if (activeAgents[chapter.id] !== undefined) {
                            return activeAgents[chapter.id].enabled
                        }
                        return true
                    })

                    if (filteredChapters.length === 0) {
                        send("error", { message: "未选择任何有效的分析章节" })
                        controller.close()
                        return
                    }

                    send("init", {
                        reportId,
                        totalChapters: filteredChapters.length,
                        chapters: filteredChapters.map(c => ({ id: c.id, title: c.title }))
                    })
                    send("log", { message: "初始化 LangGraph 工作流..." })
                    send("log", { message: `正在分析 ASIN: ${coreAsins}` })
                    send("log", { message: `竞品 ASIN: ${competitorAsins}` })
                    send("log", { message: `参考源配置: 网站 ${websiteCount} 个 / YouTube ${youtubeCount} 个` })
                    send("log", { message: `LLM 模型: ${model}` })

                    const langSuffix = language === "zh" ? "用中文" : "in English"
                    let fullReport = `# **${title}**\n\n`
                    fullReport += `> 分析日期: ${new Date().toLocaleDateString("zh-CN")} | 市场: ${marketplace} | 核心ASIN: ${coreAsins}\n\n---\n\n`

                    const startTime = Date.now()

                    for (let i = 0; i < filteredChapters.length; i++) {
                        const chapter = filteredChapters[i]
                        const progress = Math.round(((i) / filteredChapters.length) * 100)

                        send("progress", {
                            chapter: i,
                            chapterTitle: chapter.title,
                            status: "processing",
                            overallProgress: progress
                        })
                        send("log", { message: `启动 Agent: ${chapter.title}...` })

                        try {
                            const chapterPrompt = `你是一位资深的亚马逊运营分析师。请${langSuffix}为以下产品撰写竞品分析报告中的一个章节。

**产品信息:**
- 核心 ASIN: ${coreAsins}
- 竞品 ASIN: ${competitorAsins}
- 市场站点: Amazon ${marketplace}
- 报告标题: ${title}
- 参考网站数量: ${websiteCount}
- 参考 YouTube 数量: ${youtubeCount}

**当前章节:** ${chapter.title}
**章节要求:** ${chapter.prompt}

${customPrompt ? `**用户额外要求:** ${customPrompt}` : ""}

**输出要求:**
1. 使用 Markdown 格式
2. 包含具体的数据分析（可以基于合理推断）
3. 每个要点用加粗标题 + 详细说明
4. 在适当位置提供可执行的建议
5. 字数控制在 400-800 字
6. 不要重复章节标题，直接输出内容`

                            const response = await fetchWithRetry(`${baseUrl}/chat/completions`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${apiKey}`,
                                    "HTTP-Referer": "http://localhost:3000",
                                    "X-Title": "AI Report Generation System",
                                },
                                body: JSON.stringify({
                                    model,
                                    messages: [
                                        { role: "system", content: "你是一个专业的亚马逊竞品分析师，擅长撰写详细、有洞察力的市场分析报告。" },
                                        { role: "user", content: chapterPrompt },
                                    ],
                                    temperature: 0.7,
                                    max_tokens: 2000,
                                }),
                            })

                            if (!response.ok) {
                                await response.text()
                                send("log", { message: `⚠️ 章节 ${chapter.title} 生成失败: ${response.status}`, error: true })
                                fullReport += `## ${chapter.title}\n\n> ⚠️ 章节生成失败 (${response.status})\n\n`
                            } else {
                                const result = await response.json()
                                const content = result.choices?.[0]?.message?.content || ""

                                fullReport += `## ${chapter.title}\n\n${content}\n\n---\n\n`
                                send("log", { message: `✅ ${chapter.title} 完成 (${content.length} 字)` })
                            }
                        } catch (err) {
                            const errMsg = err instanceof Error ? err.message : "Unknown error"
                            send("log", { message: `⚠️ ${chapter.title} 生成异常: ${errMsg}`, error: true })
                            fullReport += `## ${chapter.title}\n\n> ⚠️ 生成异常\n\n`
                        }

                        const chapterProgress = Math.round(((i + 1) / filteredChapters.length) * 100)
                        send("progress", {
                            chapter: i,
                            chapterTitle: chapter.title,
                            status: "completed",
                            overallProgress: chapterProgress
                        })
                    }

                    writeFileAtomically(filePath, fullReport)

                    const metadata: ReportMetadata = {
                        reportId,
                        title,
                        coreAsins: coreAsinList,
                        competitorAsins: competitorAsinList,
                        marketplace,
                        language: toLanguageLabel(language),
                        model,
                        websiteCount,
                        youtubeCount,
                        customPrompt: typeof customPrompt === "string" ? customPrompt : undefined,
                        createdAt: new Date().toISOString().split("T")[0],
                        updatedAt: new Date().toISOString(),
                        dataFiles: buildSystemCollectedDataFiles(coreAsinList, competitorAsinList, websiteCount, youtubeCount),
                    }
                    writeFileAtomically(metaFilePath, JSON.stringify(metadata, null, 2))

                    const elapsed = Math.round((Date.now() - startTime) / 1000)
                    send("log", { message: `报告已保存: report_${reportId}.md` })
                    send("complete", {
                        reportId,
                        chapters: filteredChapters.length,
                        elapsed,
                        fileSize: fullReport.length,
                    })

                    controller.close()
                },
            })

            return new Response(stream, {
                headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                },
            })
        } catch (error) {
            console.error("Report generation error:", error)
            return apiError("报告生成失败", { status: 500, code: "REPORT_GENERATION_FAILED", requestId })
        }
    })
}
