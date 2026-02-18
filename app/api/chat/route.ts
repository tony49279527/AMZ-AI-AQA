import { NextRequest } from "next/server"
import fs from "fs"
import { enforceApiGuard } from "@/lib/server/api-guard"
import { apiError, withApiAudit } from "@/lib/server/api-response"
import { getReportFilePath, getReportSourcesFilePath, isValidReportId } from "@/lib/server/report-storage"
import type { ReportSourceItem } from "@/lib/report-metadata"

type ChatInputMessage = { role: "user" | "assistant"; content: string }

type ReportSection = {
    title: string
    content: string
}

type RetrievedContext = {
    totalSections: number
    selectedSections: ReportSection[]
}

const MAX_MESSAGES = 20
const MAX_MESSAGE_LENGTH = 4000
const MAX_TOTAL_MESSAGE_CHARS = 24_000

function normalizeModel(model: unknown): string | null {
    if (typeof model !== "string") return null
    const trimmed = model.trim()
    if (!trimmed) return null
    if (!/^[a-zA-Z0-9._/-]{1,100}$/.test(trimmed)) return null
    return trimmed
}

function normalizeInputMessages(input: unknown): ChatInputMessage[] | null {
    if (!Array.isArray(input) || input.length === 0 || input.length > MAX_MESSAGES) {
        return null
    }

    const normalized: ChatInputMessage[] = []
    let totalChars = 0

    for (const item of input) {
        if (!item || typeof item !== "object") return null
        const record = item as Record<string, unknown>

        const role = record.role
        if (role !== "user" && role !== "assistant") return null

        const contentRaw = record.content
        if (typeof contentRaw !== "string") return null
        const content = contentRaw.trim()
        if (!content || content.length > MAX_MESSAGE_LENGTH) return null

        totalChars += content.length
        if (totalChars > MAX_TOTAL_MESSAGE_CHARS) return null

        normalized.push({ role, content })
    }

    return normalized
}

// 加载报告 Markdown 内容
function loadReportContent(reportId: string): string | null {
    try {
        const filePath = getReportFilePath(reportId)
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, "utf-8")
        }
        return null
    } catch {
        return null
    }
}

const SOURCE_CHUNK_SIZE = 2400
const SOURCE_CHUNK_OVERLAP = 300

/** 将长文本切成多段，每段带来源标签 */
function chunkSourceContent(content: string, sourceLabel: string): ReportSection[] {
    if (!content || content.length <= SOURCE_CHUNK_SIZE) {
        return content ? [{ title: sourceLabel, content }] : []
    }
    const sections: ReportSection[] = []
    let start = 0
    let index = 1
    while (start < content.length) {
        let end = start + SOURCE_CHUNK_SIZE
        if (end < content.length) {
            const nextNewline = content.indexOf("\n", end)
            if (nextNewline !== -1 && nextNewline < end + 200) end = nextNewline + 1
        }
        const slice = content.slice(start, end).trim()
        if (slice) {
            sections.push({
                title: `${sourceLabel} (片段${index})`,
                content: slice,
            })
            index++
        }
        start = end - SOURCE_CHUNK_OVERLAP
        if (start >= content.length) break
    }
    return sections
}

function sourceTypeToLabel(source_type: string): string {
    const map: Record<string, string> = {
        product_info: "产品信息",
        reviews: "产品评论",
        reference_site: "参考网站",
        reference_youtube: "参考 YouTube",
        return_report: "退货报告",
        persona: "人群画像",
    }
    return map[source_type] ?? source_type
}

/** 加载报告抓取来源（供智能问答检索） */
function loadReportSources(reportId: string): ReportSourceItem[] | null {
    try {
        const filePath = getReportSourcesFilePath(reportId)
        if (!fs.existsSync(filePath)) return null
        const raw = fs.readFileSync(filePath, "utf-8")
        const items = JSON.parse(raw) as ReportSourceItem[]
        return Array.isArray(items) ? items : null
    } catch {
        return null
    }
}

/** 将报告章节 + 抓取来源转为统一 Section 列表（来源内容按块切分） */
function buildReportAndSourceSections(reportContent: string, sourceItems: ReportSourceItem[] | null): ReportSection[] {
    const reportSections = parseReportSections(reportContent)
    const withPrefix = reportSections.map((s) => ({ title: `报告 - ${s.title}`, content: s.content }))

    if (!sourceItems || sourceItems.length === 0) {
        return withPrefix
    }

    const sourceSections: ReportSection[] = []
    for (const item of sourceItems) {
        const typeLabel = sourceTypeToLabel(item.source_type)
        const shortLabel = item.display_label.length > 40 ? item.display_label.slice(0, 37) + "…" : item.display_label
        const sourceLabel = `抓取资料 - ${typeLabel} · ${shortLabel}`
        const chunks = chunkSourceContent(item.content, sourceLabel)
        sourceSections.push(...chunks)
    }

    return [...withPrefix, ...sourceSections]
}

function parseReportSections(reportContent: string): ReportSection[] {
    const lines = reportContent.split("\n")
    const sections: ReportSection[] = []

    let currentTitle = "报告概览"
    let currentBody: string[] = []

    for (const line of lines) {
        if (line.startsWith("## ")) {
            if (currentBody.join("\n").trim()) {
                sections.push({
                    title: currentTitle,
                    content: currentBody.join("\n").trim(),
                })
            }
            currentTitle = line.replace(/^##\s+/, "").trim()
            currentBody = []
        } else {
            currentBody.push(line)
        }
    }

    if (currentBody.join("\n").trim()) {
        sections.push({
            title: currentTitle,
            content: currentBody.join("\n").trim(),
        })
    }

    return sections
}

function extractKeywords(query: string): string[] {
    const normalized = query.toLowerCase()
    const tokens = normalized
        .split(/[^a-z0-9\u4e00-\u9fff]+/g)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2)

    return Array.from(new Set(tokens)).slice(0, 24)
}

function rankSectionsByQuery(sections: ReportSection[], query: string): ReportSection[] {
    const keywords = extractKeywords(query)
    if (keywords.length === 0) {
        return sections
    }

    const scored = sections.map((section) => {
        const titleLower = section.title.toLowerCase()
        const contentLower = section.content.toLowerCase()
        let score = 0
        for (const keyword of keywords) {
            if (titleLower.includes(keyword)) score += 5
            if (contentLower.includes(keyword)) score += 1
        }
        return { section, score }
    })

    scored.sort((a, b) => b.score - a.score)

    const hasPositiveScore = scored.some((item) => item.score > 0)
    if (!hasPositiveScore) {
        return sections
    }

    return scored.map((item) => item.section)
}

function selectRelevantContext(
    reportContent: string,
    messages: ChatInputMessage[],
    sourceItems: ReportSourceItem[] | null
): RetrievedContext {
    const allSections = buildReportAndSourceSections(reportContent, sourceItems)
    if (allSections.length === 0) {
        return { totalSections: 0, selectedSections: [] }
    }

    const latestUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content ?? ""
    const rankedSections = rankSectionsByQuery(allSections, latestUserMessage)

    const maxSections = 12
    const maxChars = 22_000

    const selectedSections: ReportSection[] = []
    let usedChars = 0

    for (const section of rankedSections) {
        if (selectedSections.length >= maxSections) break

        const nextChars = section.title.length + section.content.length
        if (selectedSections.length > 0 && usedChars + nextChars > maxChars) {
            continue
        }

        selectedSections.push(section)
        usedChars += nextChars
    }

    if (selectedSections.length === 0) {
        selectedSections.push(...allSections.slice(0, Math.min(5, allSections.length)))
    }

    return {
        totalSections: allSections.length,
        selectedSections,
    }
}

// 构建 system prompt
function buildSystemPrompt(context: RetrievedContext, hasSourceData: boolean): string {
    const selectedContent = context.selectedSections
        .map((section) => `## ${section.title}\n\n${section.content}`)
        .join("\n\n---\n\n")

    const dataScope = hasSourceData
        ? "以下内容包含**分析报告**与**生成报告时抓取的全部资料**（产品信息、评论、参考网站、YouTube 字幕、退货报告、人群画像等）。"
        : "以下为分析报告内容。"

    return `你是一个专业的亚马逊产品分析助手。你的职责是**严格基于下方提供的报告与抓取资料**回答用户的问题。

## 核心规则（必须遵守）
1. **严格基于提供的内容回答**：你的所有回答必须来自下方提供的报告与抓取资料。禁止编造数据或引用外部信息。
2. **如实标注不确定性**：若提供的片段中无相关信息，明确说明"当前检索内容未覆盖该信息"，而非猜测。
3. **引用来源**：当引用具体数据或结论时，在该段落末尾标注来源，例如 [来源: 报告 - 市场与客群洞察]、[来源: 抓取资料 - 参考网站 reddit.com]、[来源: 产品评论]。每个回答至少标注一个来源。
4. **拒绝无关问题**：若用户问题与报告/产品分析完全无关，礼貌提示本系统仅回答与报告及背后资料相关的问题。

## 图表展示协议 (json:chart)
当你需要通过直观的方式（如价格对比、评分分布、趋势分析）展示数据时，可以使用特殊的代码块生成图表。
**格式示例**:
\`\`\`json:chart
{
  "type": "bar" | "line" | "radar" | "pie",
  "title": "图表显示标题",
  "data": [
    { "name": "核心产品", "value": 45.9 },
    { "name": "竞品A", "value": 49.9 }
  ],
  "xKey": "name", // 横坐标字段
  "yKeys": ["value"] // 纵坐标字段数组（支持多线/多柱）
}
\`\`\`
**注意**: 
- 仅在报告中有明确数值支持时生成图表。
- 图表下方应配合详细的文本分析。

## 回答风格
- 使用清晰、专业的中文，适当保留英文关键术语（如 ASIN, Listing, A+）
- 对复杂问题使用 **结构化回答**（列表、表格、分点说明）
- 在适当时给出 **可操作的建议**，而非仅描述现状
- 如果用户问到关于产品图片的问题，基于报告中的产品特点和用户痛点给出详细的拍摄/设计建议

## 可用内容（报告 + 抓取资料检索片段）
${dataScope}
共 ${context.totalSections} 个片段，当前提供 ${context.selectedSections.length} 个与用户问题最相关的片段。
若用户问题超出这些片段范围，请明确说明“当前检索内容未覆盖该信息”。

${selectedContent}

---
以上是当前可用的检索片段。请严格基于这些信息回答，并标注来源（报告章节或抓取资料名称）。`
}

export async function POST(request: NextRequest) {
    return withApiAudit(request, "chat:complete", async ({ requestId }) => {
        const guardError = enforceApiGuard(request, { route: "chat:complete", maxRequests: 40, windowMs: 60_000, requestId })
        if (guardError) return guardError

        try {
            const body = (await request.json()) as Record<string, unknown>
            const reportId = typeof body.reportId === "string" ? body.reportId.trim() : ""
            const messages = normalizeInputMessages(body.messages)
            const requestModel = normalizeModel(body.model)

            if (!messages || !reportId) {
                return apiError("Missing messages or reportId", { status: 400, code: "MISSING_REQUIRED_FIELDS", requestId })
            }

            if (!isValidReportId(reportId)) {
                return apiError("Invalid reportId", { status: 400, code: "INVALID_REPORT_ID", requestId })
            }

            const reportContent = loadReportContent(reportId)
            if (!reportContent) {
                return apiError("Report not found", { status: 404, code: "REPORT_NOT_FOUND", requestId })
            }

            const sourceItems = loadReportSources(reportId)
            const retrievedContext = selectRelevantContext(reportContent, messages, sourceItems)
            const hasSourceData = Array.isArray(sourceItems) && sourceItems.length > 0

            const apiKey = process.env.OPENROUTER_API_KEY
            const baseUrl = process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1"
            const model = requestModel || process.env.LLM_MODEL || "anthropic/claude-sonnet-4.5"

            if (!apiKey) {
                return apiError("API key not configured", { status: 500, code: "LLM_API_KEY_MISSING", requestId })
            }

            const fullMessages = [
                { role: "system", content: buildSystemPrompt(retrievedContext, hasSourceData) },
                ...messages,
            ]

            const llmResponse = await fetch(`${baseUrl}/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                    "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || process.env.NEXT_PUBLIC_APP_URL || "https://amzaiagent.com",
                    "X-Title": "AmaQ Ops - AI Report System",
                },
                body: JSON.stringify({
                    model,
                    messages: fullMessages,
                    stream: true,
                    temperature: 0.7,
                    max_tokens: 4096,
                }),
            })

            if (!llmResponse.ok) {
                const errorText = await llmResponse.text()
                console.error("LLM API error:", llmResponse.status, errorText)
                return apiError(
                    process.env.NODE_ENV === "production"
                        ? "语言服务暂时不可用，请稍后重试"
                        : `LLM API error: ${llmResponse.status}`,
                    {
                        status: 502,
                        code: "LLM_UPSTREAM_ERROR",
                        requestId,
                        details: process.env.NODE_ENV === "production" ? undefined : errorText,
                    }
                )
            }

            const encoder = new TextEncoder()
            const decoder = new TextDecoder()
            const reader = llmResponse.body?.getReader()

            const readable = new ReadableStream({
                async start(controller) {
                    if (!reader) {
                        controller.close()
                        return
                    }

                    let buffer = ""

                    try {
                        while (true) {
                            const { done, value } = await reader.read()
                            if (done) break

                            buffer += decoder.decode(value, { stream: true })

                            const lines = buffer.split("\n")
                            buffer = lines.pop() || ""

                            for (const line of lines) {
                                const trimmed = line.trim()
                                if (!trimmed || trimmed === "data: [DONE]") {
                                    if (trimmed === "data: [DONE]") {
                                        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
                                    }
                                    continue
                                }

                                if (trimmed.startsWith("data: ")) {
                                    const jsonStr = trimmed.slice(6)
                                    try {
                                        const parsed = JSON.parse(jsonStr)
                                        const content = parsed.choices?.[0]?.delta?.content
                                        if (content) {
                                            controller.enqueue(
                                                encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                                            )
                                        }
                                    } catch {
                                        // ignore parse error from upstream chunk
                                    }
                                }
                            }
                        }

                        if (buffer.trim()) {
                            const trimmed = buffer.trim()
                            if (trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
                                const jsonStr = trimmed.slice(6)
                                try {
                                    const parsed = JSON.parse(jsonStr)
                                    const content = parsed.choices?.[0]?.delta?.content
                                    if (content) {
                                        controller.enqueue(
                                            encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                                        )
                                    }
                                } catch {
                                    // ignore parse error from trailing chunk
                                }
                            }
                        }

                        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
                        controller.close()
                    } catch (error) {
                        console.error("Stream processing error:", error)
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`)
                        )
                        controller.close()
                    }
                },
            })

            return new Response(readable, {
                headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                },
            })
        } catch (error) {
            console.error("Chat API error:", error)
            return apiError("Internal server error", {
                status: 500,
                code: "CHAT_INTERNAL_ERROR",
                requestId,
                details: error instanceof Error ? error.message : "Unknown error",
            })
        }
    })
}
