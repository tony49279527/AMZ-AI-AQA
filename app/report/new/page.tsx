"use client"

import type React from "react"

import { useState, useCallback, useRef, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { buildClientApiHeaders } from "@/lib/client-api"
import { buildClientApiError, formatClientErrorMessage } from "@/lib/client-api-error"
import { DEFAULT_LLM_MODEL, LLM_MODEL_OPTIONS } from "@/lib/constants"
import { parseAsinListFromText } from "@/lib/utils"

interface FileUpload {
  file: File | null
  preview: string | null
  name: string
  size: number
  type: string
}

export default function NewReportPage() {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [reportId, setReportId] = useState<string | null>(null)
  const [logs, setLogs] = useState<{ time: string; message: string; error?: boolean }[]>([])
  const [chapterStatuses, setChapterStatuses] = useState<Record<number, string>>({})
  const [completionData, setCompletionData] = useState<{ chapters: number; elapsed: number } | null>(null)
  const [dynamicChapters, setDynamicChapters] = useState<{ id: string; title: string }[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)
  const logEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (logs.length > 0 && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [logs.length])

  // Form state
  const [coreAsins, setCoreAsins] = useState("")
  const [competitorAsins, setCompetitorAsins] = useState("")
  const [marketplace, setMarketplace] = useState("US")
  const [title, setTitle] = useState("")
  const [language, setLanguage] = useState("zh")
  const [llmModel, setLlmModel] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_LLM_MODEL
    try {
      const stored = localStorage.getItem("app_settings")
      if (stored) {
        const parsed = JSON.parse(stored) as { llm?: { defaultModel?: string } }
        const model = parsed?.llm?.defaultModel
        if (typeof model === "string" && model.trim()) return model.trim()
      }
    } catch { /* ignore */ }
    return DEFAULT_LLM_MODEL
  })
  const [websiteCount, setWebsiteCount] = useState("10")
  const [youtubeCount, setYoutubeCount] = useState("10")
  const [customPromptTab, setCustomPromptTab] = useState<"A" | "B" | "C">("A")
  const [customPromptA, setCustomPromptA] = useState("")
  const [customPromptB, setCustomPromptB] = useState("")
  const [customPromptC, setCustomPromptC] = useState("")
  const [webUrls, setWebUrls] = useState("")
  const [returnsFile, setReturnsFile] = useState<FileUpload | null>(null)
  const [audienceFile, setAudienceFile] = useState<FileUpload | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleFileUpload = useCallback((type: "returns" | "audience", event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      const upload: FileUpload = {
        file, preview: reader.result as string,
        name: file.name, size: file.size, type: file.type,
      }
      if (type === "returns") setReturnsFile(upload)
      else setAudienceFile(upload)
    }
    reader.readAsDataURL(file)
  }, [])

  const canSubmit = coreAsins.trim() && competitorAsins.trim() && title.trim()

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitError(null)
    setIsGenerating(true)
    setProgress(0)
    setLogs([])
    setChapterStatuses({})

    const addLog = (message: string, error?: boolean) => {
      setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), message, error }])
    }

    addLog("开始生成报告...")
    const controller = new AbortController()
    abortControllerRef.current = controller

    const reportLanguageMap: Record<string, string> = {
      zh: "中文", en: "英文", ja: "日语", de: "德语", fr: "法语", it: "意大利语", es: "西班牙语",
    }
    const reportLanguage = reportLanguageMap[language] || "英文"

    const payload = {
      title,
      coreAsins,
      competitorAsins,
      marketplace,
      language,
      reportLanguage,
      model: llmModel,
      modelLabel: LLM_MODEL_OPTIONS.find((o) => o.value === llmModel)?.label ?? llmModel,
      websiteCount,
      youtubeCount,
      customPrompt: currentPrompt,
      webUrls: webUrls.trim() ? webUrls.trim().split(/\n+/).map((u) => u.trim()).filter((u) => u.startsWith("http")).slice(0, 20) : undefined,
    }

    try {
      const formData = new FormData()
      formData.append("payload", JSON.stringify(payload))
      if (returnsFile?.file) formData.append("returnsFile", returnsFile.file)
      if (audienceFile?.file) formData.append("audienceFile", audienceFile.file)

      const response = await fetch("/api/reports/generate", {
        method: "POST",
        signal: controller.signal,
        headers: buildClientApiHeaders(),
        body: formData,
      })

      if (!response.ok) {
        const apiError = await buildClientApiError(response, `提交失败(${response.status})，请检查必填项`)
        const errMsg = formatClientErrorMessage(apiError, `API 错误: ${response.status}`)
        addLog(errMsg, true)
        setSubmitError(errMsg)
        setIsGenerating(false)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        addLog("无法获取响应流", true)
        setIsGenerating(false)
        return
      }

      const decoder = new TextDecoder()
      let buffer = ""
      let eventType = ""
      let didComplete = false

      const processLine = (line: string) => {
        const trimmed = line.trim()
        if (!trimmed) return

        if (trimmed.startsWith("event: ")) {
          eventType = trimmed.slice(7)
          return
        }

        if (!trimmed.startsWith("data: ") || !eventType) return

        try {
          const data = JSON.parse(trimmed.slice(6)) as Record<string, unknown> | null
          if (data == null) return

          switch (eventType) {
            case "init":
              if (typeof data.reportId === "string") setReportId(data.reportId)
              if (Array.isArray(data.chapters)) setDynamicChapters(data.chapters)
              addLog((data.totalChapters as number) === 1 ? `报告 ID: ${data.reportId}，正在生成…` : `报告 ID: ${data.reportId}，共 ${data.totalChapters ?? 0} 个章节`)
              break
            case "progress":
              if (typeof data.overallProgress === "number") setProgress(data.overallProgress)
              if (data.chapter != null) setChapterStatuses(prev => ({ ...prev, [String(data.chapter)]: String(data.status ?? "") }))
              break
            case "log":
              addLog(String(data.message ?? ""), Boolean(data.error))
              break
            case "complete":
              didComplete = true
              setProgress(100)
              setCompletionData({ chapters: Array.isArray(data.chapters) ? data.chapters : [], elapsed: Number(data.elapsed) || 0 })
              addLog(`✅ 报告生成完成! 耗时 ${data.elapsed ?? 0} 秒`)
              setTimeout(() => {
                abortControllerRef.current = null
                setIsGenerating(false)
                setIsComplete(true)
              }, 1000)
              break
            case "error":
              addLog(String(data.message ?? "生成出错"), true)
              if (data.message === "已取消") {
                abortControllerRef.current = null
                setIsGenerating(false)
              }
              break
          }
        } catch {
          // skip malformed JSON
        } finally {
          eventType = ""
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          processLine(line)
        }
      }

      if (buffer) {
        processLine(buffer)
      }

      if (!didComplete) {
        addLog("⚠️ 连接已结束，但未收到完成信号。请检查后端日志后重试。", true)
        setIsGenerating(false)
      }
      abortControllerRef.current = null
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        addLog("已取消生成", true)
      } else {
        const message = formatClientErrorMessage(error, "网络错误: Unknown")
        addLog(`网络错误: ${message}`, true)
      }
      abortControllerRef.current = null
      setIsGenerating(false)
    }
  }

  const handleCancelGenerate = () => {
    abortControllerRef.current?.abort()
  }

  const currentPrompt = customPromptTab === "A" ? customPromptA : customPromptTab === "B" ? customPromptB : customPromptC
  const setCurrentPrompt = (val: string) => {
    if (customPromptTab === "A") setCustomPromptA(val)
    else if (customPromptTab === "B") setCustomPromptB(val)
    else setCustomPromptC(val)
  }

  // ─── Complete state ───
  if (isComplete) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-6 py-24">
          <Card className="p-8 bg-card border-border">
            <div className="text-center py-12">
              <div className="mb-8">
                <i className="fas fa-circle-check text-primary text-8xl mb-6"></i>
                <h2 className="text-5xl font-bold mb-4">
                  报告<span className="text-primary">生成完成</span>
                </h2>
                <p className="text-xl text-muted-foreground">Report Generation Complete</p>
              </div>
              <Card className="p-6 bg-secondary/30 border-border max-w-2xl mx-auto mb-8">
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <div className="text-3xl font-bold text-primary">{completionData?.chapters ?? 7}</div>
                    <div className="text-sm text-muted-foreground">章节完成</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-primary">{completionData?.chapters ?? 7}</div>
                    <div className="text-sm text-muted-foreground">Agent执行</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-primary">{completionData?.elapsed ? Math.ceil(completionData.elapsed / 60) : "--"}</div>
                    <div className="text-sm text-muted-foreground">分钟用时</div>
                  </div>
                </div>
              </Card>
              <div className="flex justify-center gap-4">
                <Button onClick={() => router.push(`/report/${reportId}`)} size="lg" className="gap-2 text-lg px-8">
                  <i className="fas fa-file-lines"></i>
                  查看报告
                </Button>
                <Button onClick={() => router.push(`/chat/${reportId}`)} variant="outline" size="lg" className="gap-2 text-lg px-8 bg-transparent">
                  <i className="fas fa-comments"></i>
                  开始问答
                </Button>
              </div>
            </div>
          </Card>
        </main>
      </div>
    )
  }

  // ─── Generating state ───
  if (isGenerating) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-6 py-24">
          <Card className="p-8 bg-card border-border">
            <div className="flex items-center justify-between gap-4 mb-8">
              <h2 className="text-3xl font-bold text-center flex-1">正在生成报告...</h2>
              <Button variant="outline" size="sm" onClick={handleCancelGenerate} className="shrink-0 gap-2 text-red-600 border-red-200 hover:bg-red-50">
                <i className="fas fa-stop" aria-hidden />
                取消生成
              </Button>
            </div>
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <span className="text-lg font-semibold">总体进度</span>
                <span className="text-4xl font-bold text-primary tabular-nums">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-5 overflow-hidden">
                <div className="bg-primary h-5 rounded-full transition-all duration-700 ease-out relative overflow-hidden" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-pulse" />
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3">实时日志</h3>
              <Card className="p-4 bg-slate-900/80 border border-slate-700 rounded-xl min-h-[320px] max-h-[420px] overflow-y-auto font-mono text-sm shadow-inner" id="log-container">
                <div className="space-y-2 text-slate-300">
                  {logs.length === 0 && <div className="text-slate-500">等待连接...</div>}
                  {logs.map((log, i) => (
                    <div
                      key={i}
                      ref={i === logs.length - 1 ? logEndRef : undefined}
                      className={`py-1.5 px-2 rounded ${log.error ? "text-red-400 bg-red-950/30" : log.message.startsWith("✅") ? "text-emerald-400 bg-emerald-950/20" : "text-slate-300"}`}
                    >
                      <span className="text-slate-500 select-none">[{log.time}]</span> {log.message}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </Card>
        </main>
      </div>
    )
  }

  // ─── Form state ───
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-6 py-24">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            新建<span className="text-primary">报告</span>
          </h1>
          <p className="text-xl text-muted-foreground">输入ASIN一键生成深度竞品分析报告</p>
        </div>

        {submitError && (
          <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-red-600 dark:text-red-400 flex items-start gap-3">
            <i className="fas fa-exclamation-circle mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">提交失败</p>
              <p className="text-sm mt-1">{submitError}</p>
            </div>
            <button type="button" onClick={() => setSubmitError(null)} className="text-red-600 hover:text-red-700 shrink-0" aria-label="关闭">
              <i className="fas fa-times" />
            </button>
          </div>
        )}

        <div className="space-y-8">
          {/* ── Section 1: ASIN 输入 ── */}
          <Card className="p-8 bg-card border-border">
            <h2 className="text-2xl font-bold mb-1">
              <i className="fas fa-barcode text-primary mr-3"></i>
              产品信息
            </h2>
            <p className="text-muted-foreground mb-6 ml-9">输入要分析的核心产品和竞品的 ASIN</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <Label className="text-base mb-2 block">
                  核心产品 ASIN <span className="text-primary">*</span>
                </Label>
                <p className="text-sm text-muted-foreground mb-3">输入1-5个同产品（变体）的ASIN，支持换行、逗号、斜杠分隔</p>
                <Textarea
                  placeholder={"例如：B08CVS825S 或 B07/B0DP/B0CR（每行一个、逗号、斜杠均可）"}
                  value={coreAsins}
                  onChange={(e) => setCoreAsins(e.target.value)}
                  className="min-h-36 bg-secondary/50 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  已输入 {parseAsinListFromText(coreAsins).length} 个 ASIN
                </p>
              </div>

              <div>
                <Label className="text-base mb-2 block">
                  竞品 ASIN <span className="text-primary">*</span>
                </Label>
                <p className="text-sm text-muted-foreground mb-3">输入竞品ASIN，推荐5-15个，支持换行、逗号、斜杠分隔</p>
                <Textarea
                  placeholder={"例如：每行一个，或用 B0DJ/B0BM/B095 等形式输入"}
                  value={competitorAsins}
                  onChange={(e) => setCompetitorAsins(e.target.value)}
                  className="min-h-36 bg-secondary/50 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  已输入 {parseAsinListFromText(competitorAsins).length} 个 ASIN
                </p>
              </div>
            </div>

            <div className="mt-6">
              <Label className="text-base mb-2 block">
                市场站点 <span className="text-primary">*</span>
              </Label>
              <Select value={marketplace} onValueChange={setMarketplace}>
                <SelectTrigger className="w-60 bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">🇺🇸 美国 (US)</SelectItem>
                  <SelectItem value="CA">🇨🇦 加拿大 (CA)</SelectItem>
                  <SelectItem value="UK">🇬🇧 英国 (UK)</SelectItem>
                  <SelectItem value="DE">🇩🇪 德国 (DE)</SelectItem>
                  <SelectItem value="FR">🇫🇷 法国 (FR)</SelectItem>
                  <SelectItem value="IT">🇮🇹 意大利 (IT)</SelectItem>
                  <SelectItem value="ES">🇪🇸 西班牙 (ES)</SelectItem>
                  <SelectItem value="JP">🇯🇵 日本 (JP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* ── Section 2: 分析配置 ── */}
          <Card className="p-8 bg-card border-border">
            <h2 className="text-2xl font-bold mb-1">
              <i className="fas fa-sliders text-primary mr-3"></i>
              分析配置
            </h2>
            <p className="text-muted-foreground mb-6 ml-9">配置报告生成的各项参数</p>

            <div className="space-y-6">
              {/* Report Title */}
              <div>
                <Label htmlFor="title" className="text-base mb-2 block">
                  报告标题 <span className="text-primary">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="例如: 猫砂盆竞品深度分析"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-base bg-secondary/50"
                />
              </div>

              {/* Language & LLM Model */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-base mb-2 block">报告语言</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh">中文</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ja">日本語</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="it">Italiano</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-base mb-2 block">LLM 模型</Label>
                  <Select value={llmModel} onValueChange={setLlmModel}>
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LLM_MODEL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    长报告（8000–15000 字）建议选用支持更长输出的模型，系统已按 128k 输出上限请求，具体以模型能力为准。
                  </p>
                </div>
              </div>

              {/* Reference Counts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-base mb-2 block">参考网站数量</Label>
                  <Select value={websiteCount} onValueChange={setWebsiteCount}>
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 个网站</SelectItem>
                      <SelectItem value="20">20 个网站</SelectItem>
                      <SelectItem value="30">30 个网站</SelectItem>
                      <SelectItem value="40">40 个网站</SelectItem>
                      <SelectItem value="50">50 个网站</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-base mb-2 block">参考 YouTube 数量</Label>
                  <Select value={youtubeCount} onValueChange={setYoutubeCount}>
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 个视频</SelectItem>
                      <SelectItem value="20">20 个视频</SelectItem>
                      <SelectItem value="30">30 个视频</SelectItem>
                      <SelectItem value="40">40 个视频</SelectItem>
                      <SelectItem value="50">50 个视频</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 参考网页 URL（ScrapingBee 抓取，需后端配置 SCRAPINGBEE_API_KEY） */}
              <div>
                <Label htmlFor="web-urls" className="text-base mb-2 block">
                  参考网页 URL <span className="text-xs text-muted-foreground font-normal">(可选，每行一个，最多 5 个)</span>
                </Label>
                <Textarea
                  id="web-urls"
                  placeholder={"https://example.com/article\nhttps://..."}
                  value={webUrls}
                  onChange={(e) => setWebUrls(e.target.value)}
                  className="min-h-20 bg-secondary/50 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">配置 ScrapingBee 后，将抓取上述网页内容并注入报告分析。</p>
              </div>

              {/* File Uploads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-base mb-2 block">
                    亚马逊退货报告 <span className="text-xs text-muted-foreground font-normal">(可选)</span>
                  </Label>
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-all cursor-pointer bg-secondary/30"
                    onClick={() => document.getElementById("returns-file")?.click()}
                  >
                    <input id="returns-file" type="file" className="hidden" accept=".csv,.txt,.xlsx,.xls" onChange={(e) => handleFileUpload("returns", e)} />
                    {returnsFile ? (
                      <div>
                        <i className="fas fa-file-check text-3xl text-primary mb-2"></i>
                        <p className="font-semibold text-sm">{returnsFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(returnsFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    ) : (
                      <div>
                        <i className="fas fa-cloud-arrow-up text-3xl text-muted-foreground mb-2"></i>
                        <p className="font-semibold text-sm mb-1">点击上传文件</p>
                        <p className="text-xs text-muted-foreground">支持 CSV、TXT、Excel (.xlsx/.xls)</p>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-base mb-2 block">
                    店铺受众画像 <span className="text-xs text-muted-foreground font-normal">(可选)</span>
                  </Label>
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-all cursor-pointer bg-secondary/30"
                    onClick={() => document.getElementById("audience-file")?.click()}
                  >
                    <input id="audience-file" type="file" className="hidden" accept=".csv,.txt,.xlsx,.xls" onChange={(e) => handleFileUpload("audience", e)} />
                    {audienceFile ? (
                      <div>
                        <i className="fas fa-file-check text-3xl text-primary mb-2"></i>
                        <p className="font-semibold text-sm">{audienceFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(audienceFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    ) : (
                      <div>
                        <i className="fas fa-cloud-arrow-up text-3xl text-muted-foreground mb-2"></i>
                        <p className="font-semibold text-sm mb-1">点击上传文件</p>
                        <p className="text-xs text-muted-foreground">支持 CSV、TXT、Excel (.xlsx/.xls)</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Custom Prompt - Tabbed */}
              <div>
                <Label className="text-base mb-3 block">
                  自定义 Prompt <span className="text-xs text-muted-foreground font-normal">(可选)</span>
                </Label>
                <div className="flex gap-1 mb-3">
                  {(["A", "B", "C"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setCustomPromptTab(tab)}
                      className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${customPromptTab === tab
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                        }`}
                    >
                      Prompt {tab}
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder={`输入自定义 Prompt ${customPromptTab}...`}
                  value={currentPrompt}
                  onChange={(e) => setCurrentPrompt(e.target.value)}
                  className="min-h-32 bg-secondary/50"
                />
              </div>
            </div>
          </Card>


          {/* ── Submit ── */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => router.push("/dashboard")} className="bg-transparent px-8">
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit} size="lg" className="gap-2 text-lg px-10">
              <i className="fas fa-rocket"></i>
              开始生成报告
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
