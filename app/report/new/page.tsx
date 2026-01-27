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
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from "next/navigation"

type Step = 1 | 2 | 3 | 4 | 5

interface FileUpload {
  file: File | null
  preview: string | null
  name: string
  size: number
  type: string
}

interface ReportConfig {
  title: string
  selectedChapters: string[]
  customInstructions: string
  llmModel: string
}

export default function NewReportPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [mainProductFile, setMainProductFile] = useState<FileUpload | null>(null)
  const [competitorFile, setCompetitorFile] = useState<FileUpload | null>(null)
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    title: "",
    selectedChapters: [],
    customInstructions: "",
    llmModel: "gpt-4",
  })
  const [progress, setProgress] = useState(0)
  const [reportId, setReportId] = useState<string | null>(null)

  const steps = [
    { number: 1, title: "文件上传", subtitle: "File Upload" },
    { number: 2, title: "配置选项", subtitle: "Configuration" },
    { number: 3, title: "数据采集", subtitle: "Data Collection" },
    { number: 4, title: "生成报告", subtitle: "Generate Report" },
    { number: 5, title: "完成", subtitle: "Complete" },
  ]

  const chapters = [
    "市场分析",
    "竞品分析",
    "产品特性",
    "定价策略",
    "客户洞察",
    "SWOT分析",
    "增长机会",
    "风险评估",
    "战略建议",
    "执行摘要",
    "数据综合",
  ]

  const handleFileUpload = useCallback((type: "main" | "competitor", event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const upload: FileUpload = {
        file,
        preview: reader.result as string,
        name: file.name,
        size: file.size,
        type: file.type,
      }
      if (type === "main") {
        setMainProductFile(upload)
      } else {
        setCompetitorFile(upload)
      }
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = useCallback((type: "main" | "competitor", e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const upload: FileUpload = {
        file,
        preview: reader.result as string,
        name: file.name,
        size: file.size,
        type: file.type,
      }
      if (type === "main") {
        setMainProductFile(upload)
      } else {
        setCompetitorFile(upload)
      }
    }
    reader.readAsDataURL(file)
  }, [])

  const startGeneration = () => {
    setCurrentStep(3)
    // Simulate progress
    let currentProgress = 0
    const interval = setInterval(() => {
      currentProgress += Math.random() * 10
      if (currentProgress >= 100) {
        currentProgress = 100
        clearInterval(interval)
        setTimeout(() => {
          setReportId("report_" + Date.now())
          setCurrentStep(5)
        }, 1000)
      }
      setProgress(Math.min(currentProgress, 100))
    }, 800)
  }

  const canProceedFromStep1 = mainProductFile && competitorFile
  const canProceedFromStep2 = reportConfig.title && reportConfig.selectedChapters.length > 0

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-6 py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            新建
            <span className="text-primary">报告</span>
          </h1>
          <p className="text-xl text-muted-foreground">Create New Analysis Report</p>
        </div>

        {/* Step Indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute top-6 left-0 right-0 h-0.5 bg-border -z-10">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              />
            </div>

            {steps.map((step) => (
              <div key={step.number} className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-2 transition-all ${
                    currentStep >= step.number
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {currentStep > step.number ? <i className="fas fa-check"></i> : step.number}
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold">{step.title}</div>
                  <div className="text-xs text-muted-foreground">{step.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="p-8 bg-card border-border">
          {/* Step 1: File Upload */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-3xl font-bold mb-6">上传分析文件</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Main Product File */}
                <div>
                  <Label className="text-lg mb-3 block">
                    主品文件 <span className="text-primary">*</span>
                  </Label>
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-all cursor-pointer bg-secondary/30"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop("main", e)}
                    onClick={() => document.getElementById("main-file")?.click()}
                  >
                    <input
                      id="main-file"
                      type="file"
                      className="hidden"
                      accept=".xlsx,.csv,.json,.pdf,.txt"
                      onChange={(e) => handleFileUpload("main", e)}
                    />
                    {mainProductFile ? (
                      <div>
                        <i className="fas fa-file-check text-4xl text-primary mb-3"></i>
                        <p className="font-semibold">{mainProductFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(mainProductFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <i className="fas fa-cloud-arrow-up text-5xl text-muted-foreground mb-3"></i>
                        <p className="font-semibold mb-2">拖拽文件或点击上传</p>
                        <p className="text-sm text-muted-foreground">支持 Excel, CSV, JSON, PDF, TXT</p>
                        <p className="text-xs text-muted-foreground mt-2">最大 50MB</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Competitor File */}
                <div>
                  <Label className="text-lg mb-3 block">
                    竞品文件 <span className="text-primary">*</span>
                  </Label>
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-all cursor-pointer bg-secondary/30"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop("competitor", e)}
                    onClick={() => document.getElementById("competitor-file")?.click()}
                  >
                    <input
                      id="competitor-file"
                      type="file"
                      className="hidden"
                      accept=".xlsx,.csv,.json,.pdf,.txt"
                      onChange={(e) => handleFileUpload("competitor", e)}
                    />
                    {competitorFile ? (
                      <div>
                        <i className="fas fa-file-check text-4xl text-primary mb-3"></i>
                        <p className="font-semibold">{competitorFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(competitorFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <i className="fas fa-cloud-arrow-up text-5xl text-muted-foreground mb-3"></i>
                        <p className="font-semibold mb-2">拖拽文件或点击上传</p>
                        <p className="text-sm text-muted-foreground">支持 Excel, CSV, JSON, PDF, TXT</p>
                        <p className="text-xs text-muted-foreground mt-2">最大 50MB</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-8">
                <Button variant="outline" onClick={() => router.push("/dashboard")} className="bg-transparent">
                  取消
                </Button>
                <Button onClick={() => setCurrentStep(2)} disabled={!canProceedFromStep1} className="gap-2">
                  下一步
                  <i className="fas fa-arrow-right"></i>
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Configuration */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-3xl font-bold mb-6">配置报告选项</h2>

              <div className="space-y-6">
                {/* Report Title */}
                <div>
                  <Label htmlFor="title" className="text-lg mb-2 block">
                    报告标题 <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="例如: 特斯拉 vs 蔚来竞品分析"
                    value={reportConfig.title}
                    onChange={(e) => setReportConfig({ ...reportConfig, title: e.target.value })}
                    className="text-lg bg-secondary/50"
                  />
                </div>

                {/* Chapter Selection */}
                <div>
                  <Label className="text-lg mb-3 block">
                    选择章节 <span className="text-primary">*</span>
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {chapters.map((chapter, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-2 p-3 bg-secondary/50 rounded-lg hover:bg-secondary transition-all"
                      >
                        <Checkbox
                          id={`chapter-${index}`}
                          checked={reportConfig.selectedChapters.includes(chapter)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setReportConfig({
                                ...reportConfig,
                                selectedChapters: [...reportConfig.selectedChapters, chapter],
                              })
                            } else {
                              setReportConfig({
                                ...reportConfig,
                                selectedChapters: reportConfig.selectedChapters.filter((c) => c !== chapter),
                              })
                            }
                          }}
                        />
                        <label htmlFor={`chapter-${index}`} className="text-sm font-medium cursor-pointer flex-1">
                          {chapter}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    已选择 {reportConfig.selectedChapters.length} / {chapters.length} 个章节
                  </p>
                </div>

                {/* LLM Model */}
                <div>
                  <Label htmlFor="llm" className="text-lg mb-2 block">
                    LLM模型
                  </Label>
                  <Select
                    value={reportConfig.llmModel}
                    onValueChange={(value) => setReportConfig({ ...reportConfig, llmModel: value })}
                  >
                    <SelectTrigger id="llm" className="bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      <SelectItem value="claude-3">Claude 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Instructions */}
                <div>
                  <Label htmlFor="instructions" className="text-lg mb-2 block">
                    自定义指令 (可选)
                  </Label>
                  <Textarea
                    id="instructions"
                    placeholder="输入特定的分析要求或关注点..."
                    value={reportConfig.customInstructions}
                    onChange={(e) => setReportConfig({ ...reportConfig, customInstructions: e.target.value })}
                    className="min-h-32 bg-secondary/50"
                  />
                </div>
              </div>

              <div className="flex justify-between gap-4 mt-8">
                <Button variant="outline" onClick={() => setCurrentStep(1)} className="gap-2 bg-transparent">
                  <i className="fas fa-arrow-left"></i>
                  上一步
                </Button>
                <Button onClick={startGeneration} disabled={!canProceedFromStep2} className="gap-2">
                  开始生成
                  <i className="fas fa-rocket"></i>
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Progress Monitoring */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-3xl font-bold mb-6 text-center">正在生成报告...</h2>

              {/* Overall Progress */}
              <div className="mb-12">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-lg font-semibold">总体进度</span>
                  <span className="metric-large text-4xl">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-4">
                  <div
                    className="bg-primary h-4 rounded-full transition-all duration-500 relative overflow-hidden"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Agent Status Grid */}
              <div>
                <h3 className="text-xl font-semibold mb-4">Agent 状态</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {chapters.slice(0, reportConfig.selectedChapters.length).map((chapter, index) => {
                    const agentProgress = Math.min(100, Math.max(0, (progress - index * 9) * (100 / (100 - index * 9))))
                    const status = agentProgress >= 100 ? "completed" : agentProgress > 0 ? "processing" : "pending"

                    return (
                      <Card
                        key={index}
                        className={`p-4 border-2 transition-all ${
                          status === "completed"
                            ? "border-primary bg-primary/10"
                            : status === "processing"
                              ? "border-chart-2 bg-chart-2/10"
                              : "border-border bg-card"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold">{chapter}</span>
                          {status === "completed" && <i className="fas fa-check text-primary"></i>}
                          {status === "processing" && <i className="fas fa-spinner fa-spin text-chart-2"></i>}
                          {status === "pending" && <i className="fas fa-clock text-muted-foreground"></i>}
                        </div>
                        <div className="w-full bg-secondary rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              status === "completed" ? "bg-primary" : "bg-chart-2"
                            }`}
                            style={{ width: `${agentProgress}%` }}
                          />
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>

              {/* Live Logs */}
              <div className="mt-8">
                <h3 className="text-xl font-semibold mb-4">实时日志</h3>
                <Card className="p-4 bg-secondary/30 border-border max-h-48 overflow-y-auto font-mono text-sm">
                  <div className="space-y-1 text-muted-foreground">
                    <div>[{new Date().toLocaleTimeString()}] 初始化 LangGraph 工作流...</div>
                    <div>[{new Date().toLocaleTimeString()}] 解析文件数据...</div>
                    <div>[{new Date().toLocaleTimeString()}] 启动 Agent 协调器...</div>
                    <div className="text-primary">[{new Date().toLocaleTimeString()}] 生成中...</div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Step 5: Complete */}
          {currentStep === 5 && (
            <div className="text-center py-12">
              <div className="mb-8">
                <i className="fas fa-circle-check text-primary text-8xl mb-6"></i>
                <h2 className="text-5xl font-bold mb-4">
                  报告
                  <span className="text-primary">生成完成</span>
                </h2>
                <p className="text-xl text-muted-foreground">Report Generation Complete</p>
              </div>

              <Card className="p-6 bg-secondary/30 border-border max-w-2xl mx-auto mb-8">
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <div className="text-3xl font-bold text-primary">{reportConfig.selectedChapters.length}</div>
                    <div className="text-sm text-muted-foreground">章节完成</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-primary">11</div>
                    <div className="text-sm text-muted-foreground">Agent执行</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-primary">45</div>
                    <div className="text-sm text-muted-foreground">分钟用时</div>
                  </div>
                </div>
              </Card>

              <div className="flex justify-center gap-4">
                <Button onClick={() => router.push(`/report/${reportId}`)} size="lg" className="gap-2 text-lg px-8">
                  <i className="fas fa-file-lines"></i>
                  查看报告
                </Button>
                <Button
                  onClick={() => router.push(`/chat/${reportId}`)}
                  variant="outline"
                  size="lg"
                  className="gap-2 text-lg px-8 bg-transparent"
                >
                  <i className="fas fa-comments"></i>
                  开始问答
                </Button>
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  )
}
