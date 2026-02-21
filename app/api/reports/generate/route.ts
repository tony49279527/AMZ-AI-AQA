import { NextRequest } from "next/server"
import { enforceApiGuard } from "@/lib/server/api-guard"
import { apiError, withApiAudit } from "@/lib/server/api-response"
import {
    allocateReportId,
    ensureReportsDir,
    getReportMetaFilePath,
    getReportSourcesFilePath,
    writeFileAtomically,
} from "@/lib/server/report-storage"
import { ALLOWED_MARKETPLACES, getReportMaxTokens } from "@/lib/constants"
import {
    fetchAmazonDataFromRapidAPI,
    fetchCombinedReviewsFromRapidAPI,
    fetchReferenceWebContentByKeywordExtended,
    fetchReferenceYouTubeTranscriptByKeywordExtended,
} from "@/lib/server/data-sources"
import { ReportDataFile, ReportMetadata, ReportSourceItem, toLanguageLabel } from "@/lib/report-metadata"

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

/** 上传文件解析为纯文本（TXT / CSV / Excel），失败或空则返回占位符 */
async function parseUploadedFileToText(file: File | null, noPlaceholder: string): Promise<string> {
    if (!file || file.size === 0) return noPlaceholder
    const name = (file.name || "").toLowerCase()
    const buf = await file.arrayBuffer()

    // Excel：.xlsx 用 read-excel-file 解析为文本（xlsx 库有 CVE 漏洞，已替换）
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        try {
            const readXlsxFile = (await import("read-excel-file")).default
            const rows = await readXlsxFile(Buffer.from(buf))
            const text = rows.map(row => row.map(cell => cell ?? "").join("\t")).join("\n")
            return (text && text.trim()) ? text.trim().slice(0, 500_000) : noPlaceholder
        } catch {
            return noPlaceholder
        }
    }

    // TXT / CSV：按文本解码
    let raw: string
    try {
        raw = new TextDecoder("utf-8").decode(buf)
    } catch {
        return noPlaceholder
    }
    const trimmed = raw.trim()
    if (!trimmed) return noPlaceholder

    if (name.endsWith(".csv")) {
        const lines = trimmed.split(/\r?\n/).filter((l) => l.trim())
        const text = lines
            .map((line) => {
                const cells = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""))
                return cells.join(" ")
            })
            .join("\n")
        return text || noPlaceholder
    }

    return trimmed.slice(0, 500_000)
}

const SYSTEM_PROMPT = `你是一位顶级的市场分析专家，尤其擅长亚马逊等电商平台的深度竞品分析。你的任务是基于提供的多维度信息（产品信息、用户评论、参考网站内容、YouTube 视频内容），为主产品撰写一份全面、深入、结构清晰且数据驱动的竞品分析报告。

请严格遵循用户提供的报告框架。报告必须使用要求的语言撰写，语言专业流畅，论点需有数据支撑（引用评论关键词、网站内容要点等）。使用带结构、排版清晰的、改用表格用表格，该用外语（英语、德语、日语、法语、意大利语等）用外语（英语、德语、日语、法语、意大利语等），该用中文用中文的报告，确保最终输出是一份完整、连贯，排版美观，结构清晰，合理使用表格的竞品分析报告文档。`

const MAX_TITLE_LENGTH = 200
const MAX_CUSTOM_PROMPT_LENGTH = 4000
const MAX_ASIN_COUNT = 50
const MAX_REFERENCE_COUNT = 50
const ASIN_REGEX = /^[A-Z0-9]{10}$/
const LANGUAGE_CODE_REGEX = /^[a-z]{2}(?:-[A-Z]{2})?$/

const ALLOWED_MARKETPLACES_SET = new Set<string>(ALLOWED_MARKETPLACES)

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

/** 从一段文本里抽出合法 10 位 ASIN（去掉空格、逗号等后只保留字母数字，再筛出正好 10 位的） */
function parseAsinList(input: unknown): string[] | null {
    if (typeof input !== "string") return null

    const tokens = input
        .split(/[\n,，;\t \/]+/)
        .map((item) => item.trim().toUpperCase().replace(/[^A-Z0-9]/g, ""))
        .filter((s) => s.length === 10)

    const unique = Array.from(new Set(tokens))
    if (unique.length === 0 || unique.length > MAX_ASIN_COUNT) return null
    return unique
}

function normalizeMarketplace(input: unknown): string | null {
    if (typeof input !== "string") return null
    let normalized = input.trim().toUpperCase()
    if (normalized === "GB") normalized = "UK"
    if (!ALLOWED_MARKETPLACES_SET.has(normalized)) return null
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

function normalizeReportLanguage(input: unknown): string {
    if (typeof input !== "string") return "英文"
    const t = input.trim()
    return t || "英文"
}

function buildUserPrompt(params: {
    reportLanguage: string
    mainAsins: string
    competitorAsins: string
    productsInfoText: string
    combinedReviews: string
    combinedWebContent: string
    combinedTranscript: string
    returnReportText: string
    personaReportText: string
    customPrompt: string
}): string {
    const t = `请基于以下提供的【混合数据源】，并根据指定的【主产品 ASIN】和【竞品 ASIN 列表】，撰写一份详细的竞品分析报告。报告需要严格按照指定的框架进行，并且总字数不少于 5000 字，可根据内容需要写 8000-15000 字（或要求的其他语言等价长度）。

**重要指令 - 如何处理混合数据:**

报告语言要求是中文和 ${params.reportLanguage}

1. **识别主/竞品**:
    * **主产品 ASIN**: ${params.mainAsins} （请以此 ASIN 为核心进行分析）
    * **竞品 ASIN 列表**: ${params.competitorAsins} （请将这些 ASIN 作为对比对象）

2. **数据源说明**:
    * **Products Info**: 这是一个混合文本，包含了主产品和所有竞品的产品信息（标题、规格、描述等）。你需要从中提取并区分属于主产品和各个竞品的信息。
    * **Products Reviews**: 这是一个混合文本，包含了主产品和所有竞品的评论。你需要从中提取并区分针对主产品和各个竞品的评论要点。
    * **Reference Sites**: 这是关于通用产品类别的参考网站内容，可能不直接区分 ASIN，用于提供市场背景、技术信息和用户场景。
    * **Reference YouTube**: 这是关于通用产品类别的 YouTube 字幕内容，可能不直接区分 ASIN，用于提供视觉演示、使用方法和用户反馈。
    * **Retours（亚马逊退货报告）**:
      \`\`\`
      ${params.returnReportText}
      \`\`\`
      - 如果上面的内容为 "NO_RETURN_REPORT"，表示本次没有提供退货报告，你需要忽略退货报告相关分析，不要因此报错或反复追问。
    * **Persona（亚马逊人群报告）**:
      \`\`\`
      ${params.personaReportText}
      \`\`\`
      - 如果上面的内容为 "NO_PERSONA_REPORT"，表示本次没有提供人群报告，你需要忽略人群画像相关分析，不要因此报错或反复追问。

3. **分析逻辑**:
    在报告中，必须明确指出哪些信息 / 评论 / 优缺点是针对主产品的，哪些是针对具体某个竞品的。请尽力从混合文本中进行推断和分离；如果信息难以明确归属，请谨慎说明。

**报告框架:**

${params.customPrompt}

**输入数据:**

* **主产品 ASIN**: \`${params.mainAsins}\`
* **竞品 ASINs**: \`${params.competitorAsins}\`

* **产品信息 (\`Products Info\` - 混合)**:
    \`\`\`
${params.productsInfoText}
    \`\`\`
* **产品评论 (\`Products Reviews\` - 混合)**:
    \`\`\`
${params.combinedReviews}
    \`\`\`
* **参考网站内容 (\`Reference Sites\` - 通用)**:
    \`\`\`
${params.combinedWebContent}
    \`\`\`
* **参考 YouTube 字幕 (\`Reference YouTube\` - 通用)**:
    \`\`\`
${params.combinedTranscript}
    \`\`\`
* **亚马逊的人群画像描述 (\`Persona\` - 通用，占位符已处理)**:
    \`\`\`
${params.personaReportText}
    \`\`\`

**再次强调:**
* 如果退货报告或人群报告的内容为占位字符串（如 "NO_RETURN_REPORT" 或 "NO_PERSONA_REPORT"），请视为该数据源不存在，正常完成其它部分分析，不要报错或反复追问。
* 报告必须深入、详细，总字数不少于 5000 汉字，建议 8000-15000 字，长报告请完整输出不要截断。
* 核心挑战在于从混合的 \`Products Info\` 和 \`Products Reviews\` 文本中准确分离出属于主产品和各竞品的信息。请尽力完成此任务，并在报告中清晰标注信息来源（主品 / 各竞品 ASIN），输出排版美观、结构清晰，并合理使用表格的竞品分析报告。
* 报告语言要求是中文和 ${params.reportLanguage}`
    return t
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
        const guardError = await enforceApiGuard(request, { route: "reports:generate", maxRequests: 12, windowMs: 60_000, requestId })
        if (guardError) return guardError

        try {
            const contentType = request.headers.get("content-type") || ""
            let body: Record<string, unknown>
            let returnsFile: File | null = null
            let audienceFile: File | null = null

            if (contentType.includes("multipart/form-data")) {
                const formData = await request.formData()
                const payloadRaw = formData.get("payload")
                if (typeof payloadRaw !== "string" || !payloadRaw.trim()) {
                    return apiError("未收到表单数据（payload 为空），请刷新页面后重试", { status: 400, code: "MISSING_PAYLOAD", requestId })
                }
                try {
                    body = JSON.parse(payloadRaw) as Record<string, unknown>
                } catch {
                    return apiError("表单数据格式错误，请刷新页面后重试", { status: 400, code: "INVALID_PAYLOAD", requestId })
                }
                const rf = formData.get("returnsFile")
                const af = formData.get("audienceFile")
                if (rf instanceof File) returnsFile = rf
                if (af instanceof File) audienceFile = af
            } else {
                body = (await request.json()) as Record<string, unknown>
            }

            const title = normalizeTrimmedString(body.title, MAX_TITLE_LENGTH)
            const coreAsinList = parseAsinList(body.coreAsins)
            const competitorAsinList = parseAsinList(body.competitorAsins)
            const marketplace = normalizeMarketplace(body.marketplace)
            const language = normalizeLanguageCode(body.language)
            const reportLanguage = normalizeReportLanguage(body.reportLanguage)
            const customPrompt = normalizeCustomPrompt(body.customPrompt) || "请按常规竞品分析结构撰写：市场与客群、竞品对比、退货与差评分析、Listing 优化、产品建议、关键词与拓展、总结。"
            const requestModel = body.model
            const websiteCount = normalizePositiveInt(body.websiteCount, 10, 1, MAX_REFERENCE_COUNT)
            const youtubeCount = normalizePositiveInt(body.youtubeCount, 10, 1, MAX_REFERENCE_COUNT)

            const missing: string[] = []
            if (!title) missing.push("报告标题")
            if (!coreAsinList) missing.push("主品 ASIN")
            if (!competitorAsinList) missing.push("竞品 ASIN")
            if (!marketplace) missing.push("站点")
            if (missing.length > 0) {
                return apiError("请填写必填项：" + missing.join("、"), { status: 400, code: "MISSING_REQUIRED_FIELDS", requestId, details: { missing } })
            }
            const coreAsins = coreAsinList.join(", ")
            const competitorAsins = competitorAsinList.join(", ")

            const apiKey = process.env.OPENROUTER_API_KEY
            const baseUrl = process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1"
            const model = normalizeModel(requestModel) || process.env.LLM_MODEL || "anthropic/claude-sonnet-4.5"

            if (!apiKey) {
                return apiError("未配置 API Key", { status: 500, code: "LLM_API_KEY_MISSING", requestId })
            }

            const signal = request.signal
            const encoder = new TextEncoder()
            const stream = new ReadableStream({
                async start(controller) {
                    const send = (event: string, data: unknown) => {
                        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
                    }

                    const reportsDir = ensureReportsDir()
                    const { reportId, filePath } = allocateReportId(reportsDir)
                    const metaFilePath = getReportMetaFilePath(reportId)

                    send("init", { reportId, totalChapters: 1, chapters: [{ id: "report", title: "报告生成" }] })
                    send("progress", { chapter: 0, chapterTitle: "报告生成", status: "processing", overallProgress: 5 })
                    send("log", { message: "开始拉取数据并生成报告…" })
                    send("log", { message: `主品: ${coreAsins} | 竞品: ${competitorAsins} | 站点: ${marketplace}` })

                    const startTime = Date.now()

                    if (signal.aborted) {
                        send("error", { message: "已取消" })
                        controller.close()
                        return
                    }

                    const returnReportText = await parseUploadedFileToText(returnsFile, "NO_RETURN_REPORT")
                    const personaReportText = await parseUploadedFileToText(audienceFile, "NO_PERSONA_REPORT")
                    send("log", { message: "✅ 上传文件已解析（如有）" })
                    send("progress", { chapter: 0, chapterTitle: "报告生成", status: "processing", overallProgress: 10 })

                    let productsInfoText = ""
                    const allAsins = [...coreAsinList, ...competitorAsinList]
                    if (allAsins.length > 0) {
                        send("log", { message: "正在拉取产品信息…" })
                        productsInfoText = await fetchAmazonDataFromRapidAPI(allAsins, marketplace, { maxProducts: 20 }) || "（暂无产品数据）"
                        send("log", { message: "✅ 产品信息已就绪" })
                    } else {
                        productsInfoText = "（暂无产品数据）"
                    }

                    if (signal.aborted) {
                        send("error", { message: "已取消" })
                        controller.close()
                        return
                    }
                    send("progress", { chapter: 0, chapterTitle: "报告生成", status: "processing", overallProgress: 25 })

                    let combinedReviews = ""
                    if (allAsins.length > 0) {
                        send("log", { message: "正在拉取评论…" })
                        combinedReviews = await fetchCombinedReviewsFromRapidAPI(allAsins, marketplace, { maxPerAsin: 100 }) || "（暂无评论数据）"
                        send("log", { message: "✅ 评论已就绪" })
                    } else {
                        combinedReviews = "（暂无评论数据）"
                    }

                    if (signal.aborted) {
                        send("error", { message: "已取消" })
                        controller.close()
                        return
                    }
                    send("progress", { chapter: 0, chapterTitle: "报告生成", status: "processing", overallProgress: 45 })

                    // 根据产品关键词自动搜索参考网站并抓取内容（不依赖用户填写的链接）
                    let combinedWebContent = ""
                    const webSourceItems: ReportSourceItem[] = []
                    if (productsInfoText && websiteCount > 0) {
                        send("log", { message: "正在根据产品关键词搜索参考网站…" })
                        const webResult = await fetchReferenceWebContentByKeywordExtended(productsInfoText, websiteCount, { maxUrls: 15, maxPerUrl: 5000 })
                        combinedWebContent = webResult.combined || ""
                        for (const it of webResult.items) {
                            webSourceItems.push({
                                source_type: "reference_site",
                                source_key: it.url,
                                display_label: it.display_label,
                                content: it.content,
                                char_count: it.char_count,
                            })
                        }
                        if (combinedWebContent) send("log", { message: "✅ 参考网页已就绪" })
                    }

                    // 根据产品关键词自动搜索 YouTube 视频并抓取字幕
                    let combinedTranscript = ""
                    const youtubeSourceItems: ReportSourceItem[] = []
                    if (productsInfoText && youtubeCount > 0) {
                        send("log", { message: "正在根据产品关键词搜索 YouTube 视频…" })
                        const ytResult = await fetchReferenceYouTubeTranscriptByKeywordExtended(productsInfoText, youtubeCount)
                        combinedTranscript = ytResult.combined || ""
                        for (const it of ytResult.items) {
                            youtubeSourceItems.push({
                                source_type: "reference_youtube",
                                source_key: it.url,
                                display_label: it.title,
                                content: it.content,
                                char_count: it.char_count,
                            })
                        }
                        if (combinedTranscript) send("log", { message: "✅ YouTube 字幕已就绪" })
                    }

                    const modelLabel = typeof body.modelLabel === "string" && body.modelLabel.trim() ? body.modelLabel.trim() : model
                    send("progress", { chapter: 0, chapterTitle: "报告生成", status: "processing", overallProgress: 60 })
                    send("log", { message: `正在生成报告（${modelLabel}）…` })
                    send("progress", { chapter: 0, chapterTitle: "报告生成", status: "processing", overallProgress: 70 })

                    const userPrompt = buildUserPrompt({
                        reportLanguage,
                        mainAsins: coreAsins,
                        competitorAsins,
                        productsInfoText,
                        combinedReviews,
                        combinedWebContent: combinedWebContent || "（本次未提供参考网站内容）",
                        combinedTranscript: combinedTranscript || "（本次未提供 YouTube 字幕）",
                        returnReportText,
                        personaReportText,
                        customPrompt,
                    })

                    let fullReport = ""
                    let possiblyTruncated = false
                    try {
                        const response = await fetchWithRetry(`${baseUrl}/chat/completions`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${apiKey}`,
                                "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                                "X-Title": "AI Report Generation System",
                            },
                            body: JSON.stringify({
                                model,
                                messages: [
                                    { role: "system", content: SYSTEM_PROMPT },
                                    { role: "user", content: userPrompt },
                                ],
                                temperature: 0.7,
                                max_tokens: getReportMaxTokens(model),
                            }),
                        })
                        if (signal.aborted) {
                            send("error", { message: "已取消" })
                            controller.close()
                            return
                        }
                        if (!response.ok) {
                            const errText = await response.text()
                            send("log", { message: `生成报告时出错: ${response.status}`, error: true })
                            send("error", { message: errText.slice(0, 200) })
                            controller.close()
                            return
                        }
                        const result = (await response.json()) as {
                            choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
                        }
                        const choice = result.choices?.[0]
                        fullReport = choice?.message?.content?.trim() || ""
                        const finishReason = choice?.finish_reason ?? ""
                        possiblyTruncated = finishReason === "length"
                        if (!fullReport) {
                            send("log", { message: "模型未返回内容", error: true })
                            send("error", { message: "模型未返回内容" })
                            controller.close()
                            return
                        }
                        if (possiblyTruncated) {
                            send("log", { message: "⚠️ 报告可能因模型输出长度限制未完全生成，建议换用支持更长输出的模型重新生成", error: true })
                        }
                    } catch (err) {
                        const errMsg = err instanceof Error ? err.message : "Unknown error"
                        send("log", { message: `生成异常: ${errMsg}`, error: true })
                        send("error", { message: errMsg })
                        controller.close()
                        return
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
                        source: "system",
                        possiblyTruncated: possiblyTruncated || undefined,
                    }
                    writeFileAtomically(metaFilePath, JSON.stringify(metadata, null, 2))

                    // 持久化抓取来源（供数据源 Tab 展示与智能问答检索）
                    const sourceItems: ReportSourceItem[] = []
                    if (productsInfoText && productsInfoText !== "（暂无产品数据）") {
                        sourceItems.push({
                            source_type: "product_info",
                            source_key: "products",
                            display_label: "产品信息（主品+竞品）",
                            content: productsInfoText,
                            char_count: productsInfoText.length,
                        })
                    }
                    if (combinedReviews && combinedReviews !== "（暂无评论数据）") {
                        sourceItems.push({
                            source_type: "reviews",
                            source_key: "reviews",
                            display_label: "产品评论（主品+竞品）",
                            content: combinedReviews,
                            char_count: combinedReviews.length,
                        })
                    }
                    sourceItems.push(...webSourceItems, ...youtubeSourceItems)
                    if (returnReportText && returnReportText !== "NO_RETURN_REPORT") {
                        sourceItems.push({
                            source_type: "return_report",
                            source_key: "file",
                            display_label: "亚马逊退货报告",
                            content: returnReportText,
                            char_count: returnReportText.length,
                        })
                    }
                    if (personaReportText && personaReportText !== "NO_PERSONA_REPORT") {
                        sourceItems.push({
                            source_type: "persona",
                            source_key: "file",
                            display_label: "店铺受众画像",
                            content: personaReportText,
                            char_count: personaReportText.length,
                        })
                    }
                    const sourcesFilePath = getReportSourcesFilePath(reportId)
                    writeFileAtomically(sourcesFilePath, JSON.stringify(sourceItems, null, 0))

                    const elapsed = Math.round((Date.now() - startTime) / 1000)
                    send("log", { message: "报告已保存" })
                    send("progress", { chapter: 0, chapterTitle: "报告生成", status: "completed", overallProgress: 100 })
                    send("complete", { reportId, chapters: 1, elapsed, fileSize: fullReport.length })

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
