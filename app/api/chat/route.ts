import { NextRequest } from "next/server"
import fs from "fs"
import path from "path"

// 加载报告 Markdown 内容
function loadReportContent(reportId: string): string | null {
    try {
        const filePath = path.join(process.cwd(), "content", "reports", `report_${reportId}.md`)
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, "utf-8")
        }
        return null
    } catch {
        return null
    }
}

// 构建 system prompt
function buildSystemPrompt(reportContent: string): string {
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

## 分析报告内容

${reportContent}

---
以上就是完整的分析报告内容。请严格基于这些信息回答用户的问题，不要引用任何外部数据。`
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { messages, reportId, model: requestModel } = body as {
            messages: { role: "user" | "assistant"; content: string }[]
            reportId: string
            model?: string
        }

        if (!messages || !reportId) {
            return new Response(JSON.stringify({ error: "Missing messages or reportId" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            })
        }

        // 加载报告内容
        const reportContent = loadReportContent(reportId)
        if (!reportContent) {
            return new Response(JSON.stringify({ error: "Report not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            })
        }

        const apiKey = process.env.OPENROUTER_API_KEY
        const baseUrl = process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1"
        // 优先使用前端传来的模型，其次 env 变量，最后默认值
        const model = requestModel || process.env.LLM_MODEL || "google/gemini-2.0-flash-001"

        if (!apiKey) {
            return new Response(JSON.stringify({ error: "API key not configured" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            })
        }

        // 构建完整消息列表
        const fullMessages = [
            { role: "system", content: buildSystemPrompt(reportContent) },
            ...messages,
        ]

        // 调用 OpenRouter API (OpenAI 兼容格式)
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
            return new Response(
                JSON.stringify({ error: `LLM API error: ${llmResponse.status}`, details: errorText }),
                { status: 502, headers: { "Content-Type": "application/json" } }
            )
        }

        // 转发 SSE 流
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

                        // 按行分割处理 SSE
                        const lines = buffer.split("\n")
                        buffer = lines.pop() || "" // 保留不完整的最后一行

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
                                    // 忽略 JSON 解析错误
                                }
                            }
                        }
                    }

                    // 处理 buffer 中剩余的数据
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
                                // ignore
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
        return new Response(
            JSON.stringify({
                error: "Internal server error",
                details: error instanceof Error ? error.message : "Unknown error",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        )
    }
}
