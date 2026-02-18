"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { buildClientApiHeaders } from "@/lib/client-api"
import { buildClientApiError, formatClientErrorMessage } from "@/lib/client-api-error"
import type { ReportDataFile, ReportMetadata } from "@/lib/report-metadata"

/** 数据源列表项（来自 GET /api/report-sources，无 content） */
type ReportSourceListItem = {
  source_type: string
  source_key: string
  display_label: string
  char_count: number
}

type ReportConfig = Pick<
  ReportMetadata,
  "coreAsins" | "competitorAsins" | "marketplace" | "language" | "model" | "websiteCount" | "youtubeCount" | "title" | "createdAt" | "possiblyTruncated"
>

function getQaIntroSeenKey(reportId: string): string {
  return `qa_intro_seen_${reportId}`
}

function getChatHistoryKey(reportId: string): string {
  return `chat_history_${reportId}`
}

function hasChatHistory(reportId: string): boolean {
  const raw = localStorage.getItem(getChatHistoryKey(reportId))
  if (!raw) return false

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.length > 0 : true
  } catch {
    return true
  }
}

/** 规范化报告 Markdown，减少模型输出导致的乱码与排版问题 */
function normalizeReportMarkdown(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim()
}

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const reportId = params.reportId as string

  // Initialize activeTab from URL query param or default to "report"
  const initialTab = searchParams.get("tab") || "report"
  const [activeTab, setActiveTab] = useState(initialTab)

  const [activeSection, setActiveSection] = useState("")
  const [markdown, setMarkdown] = useState("")
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // 动态从 Markdown 提取目录章节 (提取 ## 和 ### 级别的标题)
  const [sections, setSections] = useState<{ id: string; title: string; level: number }[]>([])

  // Update activeTab if URL changes (e.g. back/forward navigation)
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab) {
      setActiveTab(tab)
    }
  }, [searchParams])

  useEffect(() => {
    if (activeTab !== "qa") return

    const introSeenKey = getQaIntroSeenKey(reportId)
    const introSeen = localStorage.getItem(introSeenKey) === "1"
    const chattedBefore = hasChatHistory(reportId)

    if (introSeen || chattedBefore) {
      router.replace(`/chat/${reportId}`)
      return
    }

    localStorage.setItem(introSeenKey, "1")
  }, [activeTab, reportId, router])

  useEffect(() => {
    async function fetchReport() {
      setLoadError(null)
      try {
        const response = await fetch(`/api/report/${reportId}`, {
          headers: buildClientApiHeaders(),
        })
        if (response.ok) {
          const rawText = await response.text()
          const text = normalizeReportMarkdown(rawText)
          setMarkdown(text)

          // 提取目录 (## 为 level 2, ### 为 level 3)
          const extractedSections = text
            .split("\n")
            .filter((line) => line.startsWith("## ") || line.startsWith("### "))
            .map((line, index) => {
              const isSubSection = line.startsWith("### ")
              const title = line.replace(/^#{2,3} /, "").trim()
              return {
                id: `section-${index + 1}`,
                title: title,
                level: isSubSection ? 3 : 2
              }
            })
          setSections(extractedSections)
        } else {
          setLoadError(`加载失败 (HTTP ${response.status})，请稍后重试`)
        }
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "加载报告时出错，请稍后重试")
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [reportId, retryCount])

  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = sections.map((s) => document.getElementById(s.id))
      const scrollPosition = window.scrollY + 200

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const el = sectionElements[i]
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(sections[i].id)
          break
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [sections])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      window.scrollTo({ top: element.offsetTop - 80, behavior: "smooth" })
      setActiveSection(id)
    }
  }



  const [reportConfig, setReportConfig] = useState<ReportConfig | null>(null)
  const [dataFiles, setDataFiles] = useState<ReportDataFile[]>([])
  const [reportSources, setReportSources] = useState<ReportSourceListItem[]>([])

  const [showUploadModal, setShowUploadModal] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [isSyncingDataFiles, setIsSyncingDataFiles] = useState(false)
  const [dataFileSyncError, setDataFileSyncError] = useState("")
  const [activeFileActionId, setActiveFileActionId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchReportMetadata() {
      try {
        const response = await fetch(`/api/report-meta/${reportId}`, {
          headers: buildClientApiHeaders(),
        })

        if (!response.ok) return
        const metadata = (await response.json()) as ReportMetadata

        setReportConfig({
          coreAsins: metadata.coreAsins,
          competitorAsins: metadata.competitorAsins,
          marketplace: metadata.marketplace,
          language: metadata.language,
          model: metadata.model,
          websiteCount: metadata.websiteCount,
          youtubeCount: metadata.youtubeCount,
          title: metadata.title,
          createdAt: metadata.createdAt,
          possiblyTruncated: metadata.possiblyTruncated,
        })
        setDataFiles(metadata.dataFiles || [])
      } catch (error) {
        console.error("Failed to load report metadata:", error)
      }
    }

    fetchReportMetadata()
  }, [reportId])

  useEffect(() => {
    async function fetchReportSources() {
      try {
        const res = await fetch(`/api/report-sources/${reportId}`, { headers: buildClientApiHeaders() })
        if (!res.ok) return
        const data = (await res.json()) as { items?: ReportSourceListItem[] }
        setReportSources(Array.isArray(data.items) ? data.items : [])
      } catch {
        setReportSources([])
      }
    }
    fetchReportSources()
  }, [reportId])

  const persistDataFiles = async (nextFiles: ReportDataFile[]): Promise<boolean> => {
    setIsSyncingDataFiles(true)
    setDataFileSyncError("")

    try {
      const response = await fetch(`/api/report-meta/${reportId}`, {
        method: "PATCH",
        headers: buildClientApiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ dataFiles: nextFiles }),
      })

      if (!response.ok) {
        throw await buildClientApiError(response, `HTTP ${response.status}`)
      }

      const updated = (await response.json()) as ReportMetadata
      setDataFiles(updated.dataFiles || [])
      return true
    } catch (error) {
      console.error("Failed to sync data files:", error)
      setDataFileSyncError(formatClientErrorMessage(error, "数据文件同步失败，请稍后重试"))
      return false
    } finally {
      setIsSyncingDataFiles(false)
    }
  }

  const uploadFilesToServer = async (files: FileList): Promise<ReportDataFile[]> => {
    const formData = new FormData()
    Array.from(files).forEach((file) => {
      formData.append("files", file)
    })

    const response = await fetch(`/api/report-files/${reportId}`, {
      method: "POST",
      headers: buildClientApiHeaders(),
      body: formData,
    })

    if (!response.ok) {
      throw await buildClientApiError(response, `HTTP ${response.status}`)
    }

    const payload = (await response.json()) as { files?: ReportDataFile[] }
    return payload.files || []
  }

  const deleteFileFromServer = async (storagePath: string): Promise<void> => {
    const response = await fetch(`/api/report-files/${reportId}`, {
      method: "DELETE",
      headers: buildClientApiHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ storagePath }),
    })

    if (!response.ok) {
      throw await buildClientApiError(response, `HTTP ${response.status}`)
    }
  }

  const canPreviewFile = (file: ReportDataFile): boolean => {
    const mime = (file.mimeType || "").toLowerCase()
    const name = (file.name || "").toLowerCase()
    return (
      mime.startsWith("image/") ||
      mime === "application/pdf" ||
      mime.startsWith("text/") ||
      mime === "application/json" ||
      name.endsWith(".csv") ||
      name.endsWith(".json")
    )
  }

  const fetchStoredFileBlob = async (storagePath: string): Promise<Blob> => {
    const response = await fetch(`/api/report-files/${reportId}/${encodeURIComponent(storagePath)}`, {
      headers: buildClientApiHeaders(),
    })

    if (!response.ok) {
      throw await buildClientApiError(response, `HTTP ${response.status}`)
    }

    return response.blob()
  }

  const handleDownloadFile = async (file: ReportDataFile) => {
    if (!file.storagePath || isSyncingDataFiles) return
    setDataFileSyncError("")
    setActiveFileActionId(file.id)

    try {
      const blob = await fetchStoredFileBlob(file.storagePath)
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = objectUrl
      anchor.download = file.name || "download"
      anchor.click()
      URL.revokeObjectURL(objectUrl)
    } catch (error) {
      console.error("Failed to download file:", error)
      setDataFileSyncError(formatClientErrorMessage(error, "文件下载失败，请稍后重试"))
    } finally {
      setActiveFileActionId(null)
    }
  }

  const handlePreviewFile = async (file: ReportDataFile) => {
    if (!file.storagePath || isSyncingDataFiles) return
    if (!canPreviewFile(file)) return
    setDataFileSyncError("")
    setActiveFileActionId(file.id)

    try {
      const blob = await fetchStoredFileBlob(file.storagePath)
      const objectUrl = URL.createObjectURL(blob)
      window.open(objectUrl, "_blank", "noopener,noreferrer")
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
    } catch (error) {
      console.error("Failed to preview file:", error)
      setDataFileSyncError(formatClientErrorMessage(error, "文件预览失败，请稍后重试"))
    } finally {
      setActiveFileActionId(null)
    }
  }

  const handleNewFileUpload = async (files: FileList | null) => {
    if (isSyncingDataFiles) return
    if (!files) return

    setIsSyncingDataFiles(true)
    setDataFileSyncError("")

    try {
      const uploadedFiles = await uploadFilesToServer(files)
      const ok = await persistDataFiles([...dataFiles, ...uploadedFiles])
      if (ok) {
        setShowUploadModal(false)
      } else {
        await Promise.allSettled(
          uploadedFiles
            .map((file) => file.storagePath)
            .filter((storagePath): storagePath is string => Boolean(storagePath))
            .map((storagePath) => deleteFileFromServer(storagePath))
        )
      }
    } catch (error) {
      console.error("Failed to upload files:", error)
      setDataFileSyncError(formatClientErrorMessage(error, "文件上传失败，请稍后重试"))
      setIsSyncingDataFiles(false)
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    if (isSyncingDataFiles) return
    const targetFile = dataFiles.find((f) => f.id === fileId)
    if (!targetFile) return

    setDataFileSyncError("")
    setIsSyncingDataFiles(true)

    try {
      if (targetFile.storagePath) {
        await deleteFileFromServer(targetFile.storagePath)
      }
    } catch (error) {
      console.error("Failed to delete server file:", error)
      setDataFileSyncError(formatClientErrorMessage(error, "文件删除失败，请稍后重试"))
      setIsSyncingDataFiles(false)
      return
    }

    const nextFiles = dataFiles.filter((f) => f.id !== fileId)
    await persistDataFiles(nextFiles)
  }





  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Centered Tabs - Fixed Header */}
        <div className="bg-white border-b border-slate-200 fixed top-[62px] left-0 right-0 z-40 no-print">
          <div className="max-w-[1400px] mx-auto px-6">
            <div className="flex justify-center">
              <TabsList className="bg-white h-auto p-0 border-b-0 space-x-8">
                <TabsTrigger
                  value="report"
                  className="rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-4 py-3 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none transition-all hover:text-blue-600 gap-2 text-slate-500 text-base font-semibold"
                >
                  <i className="fas fa-file-alt"></i>
                  报告详情
                </TabsTrigger>
                <TabsTrigger
                  value="qa"
                  className="rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-4 py-3 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none transition-all hover:text-blue-600 gap-2 text-slate-500 text-base font-semibold"
                >
                  <i className="fas fa-comments"></i>
                  智能问答
                </TabsTrigger>
                <TabsTrigger
                  value="sources"
                  className="rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-4 py-3 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none transition-all hover:text-blue-600 gap-2 text-slate-500 text-base font-semibold"
                >
                  <i className="fas fa-database"></i>
                  数据源
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
        </div>

        <TabsContent value="report" className="focus-visible:outline-none focus-visible:ring-0 m-0 pt-[160px]">
          <main className="max-w-7xl mx-auto px-6 pb-24">
            <div className="bg-white rounded-2xl shadow-none border-none flex items-start gap-16 p-16">
              {/* Left Sidebar - Sticky TOC */}
              <aside className="hidden lg:block sticky top-[180px] w-[300px] shrink-0 no-print">
                <div className="transparent p-0">
                  <div className="text-base font-bold text-slate-800 uppercase tracking-[0.8px] mb-6">Contents</div>
                  <nav className="space-y-0.5 max-h-[calc(100vh-350px)] overflow-y-auto pr-2 custom-scrollbar">
                    {sections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={cn(
                          "w-full text-left transition-all border-l-2 py-1.5",
                          section.level === 3 ? "pl-8 text-[13px]" : "pl-4 text-sm font-medium",
                          activeSection === section.id
                            ? "bg-blue-600/5 text-[#2563eb] border-[#2563eb] font-semibold"
                            : "text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-900"
                        )}
                      >
                        {section.title}
                      </button>
                    ))}
                  </nav>

                  <div className="mt-8 pt-6 border-t border-slate-100 space-y-2">
                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-3 w-full text-left text-[14px] text-slate-500 hover:text-[#2563eb] py-2 transition-colors group"
                    >
                      <i className="fas fa-file-pdf w-4 text-slate-400 group-hover:text-[#2563eb]"></i>
                      <span className="font-medium">下载为 PDF</span>
                    </button>
                  </div>
                </div>
              </aside>

              <article id="report-article" className="min-w-0 flex-1 bg-transparent prose prose-slate max-w-none">
                <div className="pt-4">
                  <div className="mb-10 no-print">
                    <button
                      onClick={() => router.push("/dashboard")}
                      className="text-[13px] font-semibold text-[#2563eb] flex items-center gap-2 hover:underline transition-all"
                    >
                      <i className="fas fa-arrow-left text-[11px]"></i>
                      Back
                    </button>
                  </div>

                  {reportConfig?.possiblyTruncated && (
                    <div className="mb-8 no-print rounded-xl border border-amber-200 bg-amber-50/80 p-5 flex items-start gap-4">
                      <span className="text-amber-600 text-xl flex-shrink-0" aria-hidden>
                        <i className="fas fa-exclamation-triangle" />
                      </span>
                      <div>
                        <p className="font-semibold text-amber-900 mb-1">报告可能未完整生成</p>
                        <p className="text-sm text-amber-800">
                          当前模型输出长度已达上限，报告后半部分可能被截断。建议在「新建报告」中换用支持更长输出的模型（如 Gemini、GPT-5.2、DeepSeek 等）使用相同配置重新生成，以获得完整报告。
                        </p>
                      </div>
                    </div>
                  )}

                  {loading ? (
                    <div className="space-y-12 py-4">
                      <div className="space-y-4">
                        <Skeleton className="h-12 w-[60%]" />
                        <Skeleton className="h-4 w-[90%]" />
                        <Skeleton className="h-4 w-[85%]" />
                      </div>
                      <div className="space-y-6">
                        <Skeleton className="h-8 w-[40%]" />
                        <div className="grid grid-cols-1 gap-4">
                          <Skeleton className="h-32 w-full" />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <Skeleton className="h-8 w-[35%]" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-[95%]" />
                        <Skeleton className="h-4 w-[98%]" />
                      </div>
                    </div>
                  ) : loadError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50/50 p-8 text-center">
                      <p className="text-red-700 font-medium mb-4">{loadError}</p>
                      <Button
                        onClick={() => { setLoading(true); setRetryCount((c) => c + 1) }}
                        variant="outline"
                        className="gap-2"
                        aria-label="重试加载报告"
                      >
                        <i className="fas fa-rotate-right" aria-hidden />
                        重试
                      </Button>
                    </div>
                  ) : (
                    <div id="markdown-content" className="report-markdown">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ ...props }) => (
                            <h1
                              className="text-[40px] font-extrabold text-slate-900 tracking-tight mb-12 leading-tight"
                              {...props}
                            />
                          ),
                          h2: ({ ...props }) => {
                            const title = String(props.children)
                            const sectionIndex = sections.findIndex((s) => s.title === title && s.level === 2)
                            const id = sectionIndex !== -1 ? sections[sectionIndex].id : ""
                            return (
                              <h2
                                id={id}
                                className="text-[28px] font-bold text-slate-900 tracking-tight mt-20 mb-10 scroll-mt-40"
                                {...props}
                              />
                            )
                          },
                          h3: ({ ...props }) => {
                            const title = String(props.children)
                            const sectionIndex = sections.findIndex((s) => s.title === title && s.level === 3)
                            const id = sectionIndex !== -1 ? sections[sectionIndex].id : ""
                            return (
                              <h3
                                id={id}
                                className="text-[22px] font-bold text-slate-900 mt-12 mb-6 scroll-mt-40"
                                {...props}
                              />
                            )
                          },
                          h4: ({ ...props }) => (
                            <h4 className="text-[18px] font-bold text-slate-900 mt-8 mb-4 underline decoration-blue-500/30 underline-offset-4" {...props} />
                          ),
                          p: ({ ...props }) => (
                            <p className="text-slate-600 text-[17px] leading-[1.8] mb-6 whitespace-pre-wrap break-words" {...props} />
                          ),
                          ul: ({ ...props }) => <ul className="list-disc pl-6 mb-8 space-y-3" {...props} />,
                          ol: ({ ...props }) => <ol className="list-decimal pl-6 mb-8 space-y-3" {...props} />,
                          li: ({ ...props }) => <li className="text-slate-600 text-[17px] leading-[1.8]" {...props} />,
                          table: ({ ...props }) => (
                            <div className="overflow-x-auto my-10 border border-slate-200 rounded-xl shadow-sm">
                              <table className="w-full border-collapse min-w-[400px]" style={{ tableLayout: "auto" }} {...props} />
                            </div>
                          ),
                          thead: ({ ...props }) => <thead className="bg-slate-50 border-b-2 border-slate-200" {...props} />,
                          th: ({ ...props }) => (
                            <th
                              className="px-4 py-3 text-left text-sm font-bold text-slate-900 border border-slate-200 break-words align-top"
                              {...props}
                            />
                          ),
                          td: ({ ...props }) => (
                            <td className="px-4 py-3 text-sm text-slate-600 border border-slate-100 break-words align-top whitespace-normal" {...props} />
                          ),
                          tbody: ({ ...props }) => <tbody className="bg-white" {...props} />,
                          img: ({ ...props }) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              className="rounded-2xl my-10 border border-slate-100 shadow-sm mx-auto"
                              alt={props.alt ?? ""}
                              {...props}
                            />
                          ),
                          hr: ({ ...props }) => <hr className="my-16 border-slate-100" {...props} />,
                          strong: ({ ...props }) => <strong className="font-bold text-slate-900" {...props} />,
                          blockquote: ({ ...props }) => (
                            <blockquote className="border-l-4 border-blue-500 bg-blue-50/10 p-8 rounded-r-xl my-8 italic text-slate-700" {...props} />
                          ),
                          code: ({ className, children, ...props }: React.ComponentPropsWithoutRef<'code'> & { className?: string }) => {
                            const isInline = !className
                            return isInline ? (
                              <code className="bg-slate-100 text-blue-700 px-1.5 py-0.5 rounded text-[0.9em] font-mono" {...props}>{children}</code>
                            ) : (
                              <code className={cn("block bg-slate-900 text-slate-100 p-6 rounded-xl my-6 overflow-x-auto text-sm font-mono leading-relaxed", className)} {...props}>{children}</code>
                            )
                          },
                          pre: ({ ...props }) => (
                            <pre className="bg-slate-900 rounded-xl my-6 overflow-x-auto text-sm font-mono whitespace-pre-wrap break-words p-6" {...props} />
                          ),
                        }}
                      >
                        {markdown}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </article>
            </div>
          </main>
        </TabsContent>

        <TabsContent value="qa" className="focus-visible:outline-none focus-visible:ring-0 m-0 pt-[110px]">
          <div className="h-[calc(100vh-110px)] flex flex-col items-center justify-center bg-slate-50">
            <div className="text-center max-w-md px-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-robot text-4xl text-blue-600"></i>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">AI 智能问答助手</h2>
              <p className="text-slate-500 mb-8">
                基于当前报告内容，为您提供深入的即时问答服务。支持多轮对话、引用来源追踪。
              </p>
              <Button
                onClick={() => {
                  localStorage.setItem(getQaIntroSeenKey(reportId), "1")
                  router.push(`/chat/${reportId}`)
                }}
                size="lg"
                className="w-full text-lg h-12 gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <i className="fas fa-comments"></i>
                开始智能对话
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sources" className="focus-visible:outline-none focus-visible:ring-0 m-0 pt-[160px]">
          <main className="max-w-7xl mx-auto px-6 pb-16 space-y-8">

            {/* ── 本报告引用的数据来源（系统采集的链接与字数） ── */}
            {reportSources.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-8 bg-blue-600 rounded-full"></div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">本报告引用的数据来源</h2>
                  <span className="text-sm text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">{reportSources.length} 条</span>
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">类型</th>
                        <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">名称 / 链接</th>
                        <th className="px-5 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">约字数</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportSources.map((item, idx) => {
                        const typeLabel =
                          item.source_type === "product_info" ? "产品信息" :
                          item.source_type === "reviews" ? "产品评论" :
                          item.source_type === "reference_site" ? "参考网站" :
                          item.source_type === "reference_youtube" ? "参考 YouTube" :
                          item.source_type === "return_report" ? "退货报告" :
                          item.source_type === "persona" ? "人群画像" : item.source_type
                        const isUrl = /^https?:\/\//i.test(item.source_key)
                        return (
                          <tr key={`${item.source_type}-${idx}`} className="hover:bg-slate-50/50">
                            <td className="px-5 py-3.5">
                              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{typeLabel}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              {isUrl ? (
                                <a href={item.source_key} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-md inline-block" title={item.source_key}>
                                  {item.display_label || item.source_key}
                                </a>
                              ) : (
                                <span className="text-sm text-slate-800">{item.display_label}</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right text-sm text-slate-500">约 {item.char_count.toLocaleString()} 字</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Section 1: 报告配置 ── */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-blue-600 rounded-full"></div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">报告配置</h2>
                </div>
                <span className="text-sm text-slate-400">创建于 {reportConfig?.createdAt ?? "--"}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-xs text-slate-400 font-medium mb-1.5">市场站点</div>
                  <div className="font-bold text-slate-900 text-lg">🇺🇸 {reportConfig?.marketplace ?? "--"}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-xs text-slate-400 font-medium mb-1.5">报告语言</div>
                  <div className="font-bold text-slate-900 text-lg">{reportConfig?.language ?? "--"}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-xs text-slate-400 font-medium mb-1.5">LLM 模型</div>
                  <div className="font-bold text-slate-900 text-sm">{reportConfig?.model ?? "--"}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-xs text-slate-400 font-medium mb-1.5">参考数据</div>
                  <div className="font-bold text-slate-900 text-sm">{reportConfig?.websiteCount ?? 0} 网站 · {reportConfig?.youtubeCount ?? 0} 视频</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                  <div className="text-xs text-slate-500 font-semibold mb-2">核心产品 ASIN ({reportConfig?.coreAsins.length ?? 0})</div>
                  <div className="flex flex-wrap gap-2">
                    {(reportConfig?.coreAsins ?? []).map((asin) => (
                      <span key={asin} className="px-3 py-1.5 bg-white rounded-lg text-sm font-mono text-slate-700 border border-slate-200 shadow-sm">{asin}</span>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                  <div className="text-xs text-slate-500 font-semibold mb-2">竞品 ASIN ({reportConfig?.competitorAsins.length ?? 0})</div>
                  <div className="flex flex-wrap gap-2">
                    {(reportConfig?.competitorAsins ?? []).map((asin) => (
                      <span key={asin} className="px-3 py-1.5 bg-white rounded-lg text-sm font-mono text-slate-700 border border-slate-200 shadow-sm">{asin}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 2: 数据文件列表 ── */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-blue-600 rounded-full"></div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">数据文件</h2>
                  <span className="text-sm text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">{dataFiles.length} 个文件</span>
                </div>
                <button
                  onClick={() => setShowUploadModal(true)}
                  disabled={isSyncingDataFiles}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <i className="fas fa-plus text-xs"></i>
                  {isSyncingDataFiles ? "同步中..." : "新增文件"}
                </button>
              </div>

              {dataFileSyncError && (
                <div className="mb-4 text-sm text-red-500">{dataFileSyncError}</div>
              )}

              {/* File Table */}
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">文件名</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">类型</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">大小</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">添加日期</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">来源</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dataFiles.map((file) => (
                      <tr key={file.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                              <i className={cn("fas text-sm", file.icon)}></i>
                            </div>
                            <span className="font-medium text-sm text-slate-800 truncate max-w-[280px]">{file.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={cn(
                            "text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600"
                          )}>
                            {file.category}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-500">{file.size}</td>
                        <td className="px-5 py-4 text-sm text-slate-500">{file.addedAt}</td>
                        <td className="px-5 py-4">
                          <span className={cn(
                            "text-xs font-medium",
                            file.source === "用户上传" ? "text-purple-500" : "text-slate-400"
                          )}>
                            {file.source}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {file.storagePath && (
                              <button
                                onClick={() => void handleDownloadFile(file)}
                                disabled={isSyncingDataFiles || activeFileActionId === file.id}
                                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
                                title="下载文件"
                              >
                                <i className="fas fa-download text-xs text-slate-500"></i>
                              </button>
                            )}
                            {file.storagePath && canPreviewFile(file) && (
                              <button
                                onClick={() => void handlePreviewFile(file)}
                                disabled={isSyncingDataFiles || activeFileActionId === file.id}
                                className="w-8 h-8 rounded-lg hover:bg-blue-50 flex items-center justify-center transition-colors"
                                title="预览文件"
                              >
                                <i className="fas fa-eye text-xs text-blue-500"></i>
                              </button>
                            )}
                            {file.source === "用户上传" && (
                              <button
                                onClick={() => void handleDeleteFile(file.id)}
                                disabled={isSyncingDataFiles || activeFileActionId === file.id}
                                className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors"
                                title="删除文件"
                              >
                                <i className="fas fa-trash-can text-xs text-red-400"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Upload Modal ── */}
            {showUploadModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">新增数据文件</h3>
                    <button onClick={() => setShowUploadModal(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors" aria-label="关闭">
                      <i className="fas fa-xmark text-slate-400" aria-hidden></i>
                    </button>
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-slate-500 mb-4">上传新的退货报告、评论数据或其他产品相关文件，用于追加分析。</p>
                    <div
                      className={cn(
                        "border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer",
                        dragOver ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                      )}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => { e.preventDefault(); setDragOver(false); void handleNewFileUpload(e.dataTransfer.files) }}
                      onClick={() => document.getElementById("new-file-input")?.click()}
                    >
                      <input
                        id="new-file-input"
                        type="file"
                        className="hidden"
                        multiple
                        accept=".csv,.xlsx,.xls,.pdf,.doc,.docx,.txt,.json"
                        onChange={(e) => void handleNewFileUpload(e.target.files)}
                      />
                      <i className={cn("fas fa-cloud-arrow-up text-4xl mb-3", dragOver ? "text-blue-500" : "text-slate-300")}></i>
                      <p className="font-semibold text-slate-700 mb-1">拖放文件到这里，或点击选择</p>
                      <p className="text-xs text-slate-400">支持 CSV, XLSX, PDF, DOC, DOCX, TXT, JSON</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
                    <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )}

          </main>
        </TabsContent>
      </Tabs>
    </div>
  )
}
