import { NextRequest } from "next/server"
import fs from "fs"
import path from "path"

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

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { title, coreAsins, competitorAsins, marketplace, language, customPrompt } = body

        const apiKey = process.env.OPENROUTER_API_KEY
        const baseUrl = process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1"
        const model = process.env.LLM_MODEL || "google/gemini-2.0-flash-001"

        if (!apiKey) {
            return new Response(JSON.stringify({ error: "未配置 API Key" }), { status: 500 })
        }

        // 创建 SSE 流
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
            async start(controller) {
                const send = (event: string, data: unknown) => {
                    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
                }

                // 确定报告 ID
                const reportsDir = path.join(process.cwd(), "content", "reports")
                if (!fs.existsSync(reportsDir)) {
                    fs.mkdirSync(reportsDir, { recursive: true })
                }
                const existingFiles = fs.readdirSync(reportsDir).filter(f => f.endsWith(".md"))
                const nextId = existingFiles.length + 1
                const reportId = String(nextId)

                send("init", { reportId, totalChapters: CHAPTERS.length })
                send("log", { message: "初始化 LangGraph 工作流..." })
                send("log", { message: `正在分析 ASIN: ${coreAsins}` })
                send("log", { message: `竞品 ASIN: ${competitorAsins}` })

                const langSuffix = language === "zh" ? "用中文" : "in English"
                let fullReport = `# **${title}**\n\n`
                fullReport += `> 分析日期: ${new Date().toLocaleDateString("zh-CN")} | 市场: ${marketplace} | 核心ASIN: ${coreAsins}\n\n---\n\n`

                const startTime = Date.now()

                for (let i = 0; i < CHAPTERS.length; i++) {
                    const chapter = CHAPTERS[i]
                    const progress = Math.round(((i) / CHAPTERS.length) * 100)

                    send("progress", {
                        chapter: i,
                        chapterTitle: chapter.title,
                        status: "processing",
                        overallProgress: progress
                    })
                    send("log", { message: `启动 Agent: ${chapter.title}...` })

                    try {
                        // 构建每个章节的 prompt
                        const chapterPrompt = `你是一位资深的亚马逊运营分析师。请${langSuffix}为以下产品撰写竞品分析报告中的一个章节。

**产品信息:**
- 核心 ASIN: ${coreAsins}
- 竞品 ASIN: ${competitorAsins}
- 市场站点: Amazon ${marketplace}
- 报告标题: ${title}

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
                            const errorText = await response.text()
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

                    // 章节完成
                    const chapterProgress = Math.round(((i + 1) / CHAPTERS.length) * 100)
                    send("progress", {
                        chapter: i,
                        chapterTitle: chapter.title,
                        status: "completed",
                        overallProgress: chapterProgress
                    })
                }

                // 保存报告文件
                const filePath = path.join(reportsDir, `report_${nextId}.md`)
                fs.writeFileSync(filePath, fullReport, "utf-8")

                const elapsed = Math.round((Date.now() - startTime) / 1000)
                send("log", { message: `报告已保存: report_${nextId}.md` })
                send("complete", {
                    reportId,
                    chapters: CHAPTERS.length,
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
        return new Response(JSON.stringify({ error: "报告生成失败" }), { status: 500 })
    }
}
