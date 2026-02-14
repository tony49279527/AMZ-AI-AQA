import { NextRequest } from "next/server"
import fs from "fs"
import { enforceApiGuard } from "@/lib/server/api-guard"
import { apiError, withApiAudit } from "@/lib/server/api-response"
import { getReportFilePath, isValidReportId } from "@/lib/server/report-storage"

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

function selectRelevantContext(reportContent: string, messages: ChatInputMessage[]): RetrievedContext {
    const sections = parseReportSections(reportContent)
    if (sections.length === 0) {
        return { totalSections: 0, selectedSections: [] }
    }

    const latestUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content ?? ""
    const rankedSections = rankSectionsByQuery(sections, latestUserMessage)

    const maxSections = 6
    const maxChars = 12_000

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
        selectedSections.push(...sections.slice(0, Math.min(3, sections.length)))
    }

    return {
        totalSections: sections.length,
        selectedSections,
    }
}

// 构建 system prompt
function buildSystemPrompt(context: RetrievedContext): string {
    const selectedContent = context.selectedSections
        .map((section) => `## ${section.title}\n\n${section.content}`)
        .join("\n\n---\n\n")

    return `你是一个专业的亚马逊产品分析助手。你的职责是**严格基于以下分析报告**回答用户的问题。

## 核心规则（必须遵守）
1. **严格基于报告回答**：你的所有回答必须来自下方提供的报告内容。禁止编造数据或引用外部信息。
2. **如实标注不确定性**：如果报告中没有相关信息，你必须明确说明"报告中未涉及此内容"，而非猜测。
3. **引用来源**：当引用报告中的具体数据或结论时，在该段落末尾标注 [来源: 章节名称]。每个回答至少标注一个来源。
4. **拒绝无关问题**：如果用户的问题与报告内容完全无关（如闲聊、编程、其他领域问题），礼貌提示用户本系统仅回答与报告相关的问题。

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

## 分析报告内容（检索片段）
共 ${context.totalSections} 个章节，当前提供 ${context.selectedSections.length} 个相关章节片段。
如果用户问题超出这些片段范围，你必须明确说明“当前检索片段未覆盖该信息”。

${selectedContent}

---
以上是当前可用的报告检索片段。请严格基于这些信息回答用户的问题，不要引用任何外部数据。`
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

            const apiKey = process.env.OPENROUTER_API_KEY
            const baseUrl = process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1"
            const model = requestModel || process.env.LLM_MODEL || "google/gemini-2.0-flash-001"

            if (!apiKey) {
                return apiError("API key not configured", { status: 500, code: "LLM_API_KEY_MISSING", requestId })
            }

            const retrievedContext = selectRelevantContext(reportContent, messages)
            const fullMessages = [
                { role: "system", content: buildSystemPrompt(retrievedContext) },
                ...messages,
            ]

            const llmResponse = await fetch(`${baseUrl}/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                    "HTTP-Referer": "https://amzaiagent.com",
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
                return apiError(`LLM API error: ${llmResponse.status}`, {
                    status: 502,
                    code: "LLM_UPSTREAM_ERROR",
                    requestId,
                    details: errorText,
                })
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
