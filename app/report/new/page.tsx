"use client"

import type React from "react"

import { useState, useCallback } from "react"
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

  // Form state
  const [coreAsins, setCoreAsins] = useState("")
  const [competitorAsins, setCompetitorAsins] = useState("")
  const [marketplace, setMarketplace] = useState("US")
  const [title, setTitle] = useState("")
  const [language, setLanguage] = useState("zh")
  const [llmModel, setLlmModel] = useState("anthropic/claude-sonnet-4")
  const [websiteCount, setWebsiteCount] = useState("10")
  const [youtubeCount, setYoutubeCount] = useState("10")
  const [customPromptTab, setCustomPromptTab] = useState<"A" | "B" | "C">("A")
  const [customPromptA, setCustomPromptA] = useState("")
  const [customPromptB, setCustomPromptB] = useState("")
  const [customPromptC, setCustomPromptC] = useState("")
  const [returnsFile, setReturnsFile] = useState<FileUpload | null>(null)
  const [audienceFile, setAudienceFile] = useState<FileUpload | null>(null)

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
    setIsGenerating(true)
    setProgress(0)
    setLogs([])
    setChapterStatuses({})

    const addLog = (message: string, error?: boolean) => {
      setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), message, error }])
    }

    addLog("开始生成报告...")

    try {
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: buildClientApiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          title,
          coreAsins,
          competitorAsins,
          marketplace,
          language,
          model: llmModel,
          websiteCount,
          youtubeCount,
          customPrompt: currentPrompt,
        }),
      })

      if (!response.ok) {
        const apiError = await buildClientApiError(response, `API 错误: ${response.status}`)
        addLog(formatClientErrorMessage(apiError, `API 错误: ${response.status}`), true)
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
          const data = JSON.parse(trimmed.slice(6))

          switch (eventType) {
            case "init":
              setReportId(data.reportId)
              addLog(`报告 ID: ${data.reportId}，共 ${data.totalChapters} 个章节`)
              break
            case "progress":
              setProgress(data.overallProgress)
              setChapterStatuses(prev => ({ ...prev, [data.chapter]: data.status }))
              break
            case "log":
              addLog(data.message, data.error)
              break
            case "complete":
              didComplete = true
              setProgress(100)
              setCompletionData({ chapters: data.chapters, elapsed: data.elapsed })
              addLog(`✅ 报告生成完成! 共 ${data.chapters} 章，耗时 ${data.elapsed} 秒`)
              setTimeout(() => {
                setIsGenerating(false)
                setIsComplete(true)
              }, 1000)
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
    } catch (error) {
      const message = formatClientErrorMessage(error, "网络错误: Unknown")
      addLog(`网络错误: ${message}`, true)
      setIsGenerating(false)
    }
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
    const chapters = ["市场与客群洞察", "竞品分析与我方策略", "退货报告分析", "Listing全面优化方案", "产品及周边优化建议", "关联场景词/产品拓展", "报告总结"]
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-6 py-24">
          <Card className="p-8 bg-card border-border">
            <h2 className="text-3xl font-bold mb-6 text-center">正在生成报告...</h2>
            <div className="mb-12">
              <div className="flex justify-between items-center mb-3">
                <span className="text-lg font-semibold">总体进度</span>
                <span className="metric-large text-4xl">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-4">
                <div className="bg-primary h-4 rounded-full transition-all duration-500 relative overflow-hidden" style={{ width: `${progress}%` }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Agent 状态</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {chapters.map((chapter, index) => {
                  const status = chapterStatuses[index] || "pending"
                  return (
                    <Card key={index} className={`p-4 border-2 transition-all ${status === "completed" ? "border-primary bg-primary/10" : status === "processing" ? "border-chart-2 bg-chart-2/10" : "border-border bg-card"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">{chapter}</span>
                        {status === "completed" && <i className="fas fa-check text-primary"></i>}
                        {status === "processing" && <i className="fas fa-spinner fa-spin text-chart-2"></i>}
                        {status === "pending" && <i className="fas fa-clock text-muted-foreground"></i>}
                      </div>
                      <div className="w-full bg-secondary rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full transition-all duration-500 ${status === "completed" ? "bg-primary" : "bg-chart-2"}`} style={{ width: `${status === "completed" ? 100 : status === "processing" ? 50 : 0}%` }} />
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4">实时日志</h3>
              <Card className="p-4 bg-secondary/30 border-border max-h-48 overflow-y-auto font-mono text-sm" id="log-container">
                <div className="space-y-1 text-muted-foreground">
                  {logs.length === 0 && <div>等待连接...</div>}
                  {logs.map((log, i) => (
                    <div key={i} className={log.error ? "text-red-500" : log.message.startsWith("✅") ? "text-primary" : ""}>
                      [{log.time}] {log.message}
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
                <p className="text-sm text-muted-foreground mb-3">输入1-5个同产品（变体）的ASIN</p>
                <Textarea
                  placeholder={"输入核心产品ASIN（例如：B08CVS825S）\n每行一个..."}
                  value={coreAsins}
                  onChange={(e) => setCoreAsins(e.target.value)}
                  className="min-h-36 bg-secondary/50 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  已输入 {coreAsins.split("\n").filter(l => l.trim()).length} 个 ASIN
                </p>
              </div>

              <div>
                <Label className="text-base mb-2 block">
                  竞品 ASIN <span className="text-primary">*</span>
                </Label>
                <p className="text-sm text-muted-foreground mb-3">输入竞品ASIN，推荐5-15个</p>
                <Textarea
                  placeholder={"输入竞品ASIN（每行一个）\n推荐输入5-15个..."}
                  value={competitorAsins}
                  onChange={(e) => setCompetitorAsins(e.target.value)}
                  className="min-h-36 bg-secondary/50 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  已输入 {competitorAsins.split("\n").filter(l => l.trim()).length} 个 ASIN
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
                  <SelectItem value="GB">🇬🇧 英国 (GB)</SelectItem>
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
                      <SelectItem value="anthropic/claude-sonnet-4">Claude Sonnet 4</SelectItem>
                      <SelectItem value="anthropic/claude-3-opus">Claude 3 Opus</SelectItem>
                      <SelectItem value="google/gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                      <SelectItem value="google/gemini-2.0-flash-001">Gemini 2.0 Flash</SelectItem>
                      <SelectItem value="openai/gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="openai/gpt-4-turbo">GPT-4 Turbo</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <input id="returns-file" type="file" className="hidden" accept=".csv,.xlsx" onChange={(e) => handleFileUpload("returns", e)} />
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
                        <p className="text-xs text-muted-foreground">支持 CSV, XLSX</p>
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
                    <input id="audience-file" type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => handleFileUpload("audience", e)} />
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
                        <p className="text-xs text-muted-foreground">支持 PDF, DOC, DOCX</p>
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
