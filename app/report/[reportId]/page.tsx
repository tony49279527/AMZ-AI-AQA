"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import { cn } from "@/lib/utils"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const reportId = params.reportId as string

  // Initialize activeTab from URL query param or default to "report"
  const initialTab = searchParams.get("tab") || "report"
  const [activeTab, setActiveTab] = useState(initialTab)

  const [activeSection, setActiveSection] = useState("")
  const [isScrolled, setIsScrolled] = useState(false)
  const [markdown, setMarkdown] = useState("")
  const [loading, setLoading] = useState(true)

  const [showContext, setShowContext] = useState(true)

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
    async function fetchReport() {
      try {
        const response = await fetch(`/api/report/${reportId}`)
        if (response.ok) {
          const text = await response.text()
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
          console.error("Failed to fetch report")
        }
      } catch (error) {
        console.error("Error fetching report:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [reportId])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)

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



  // 报告创建时的配置信息
  const reportConfig = {
    coreAsins: ["B0FMK94VY4", "B0FMK95ABC"],
    competitorAsins: ["B09XYZ1234", "B09ABC5678", "B09DEF9012", "B09GHI3456", "B09JKL7890"],
    marketplace: "US",
    language: "中文",
    llmModel: "Claude 3.5 Sonnet",
    websiteCount: 10,
    youtubeCount: 10,
    title: "AI竞品分析报告-猫砂盆-C4.5",
    createdAt: "2024-09-15",
  }

  const [dataFiles, setDataFiles] = useState([
    { id: "1", category: "亚马逊数据", name: "Amazon Product Page (B0FMK94VY4)", size: "1.2MB", icon: "fa-shopping-cart text-slate-400", addedAt: "2024-09-15", source: "系统采集" },
    { id: "2", category: "亚马逊数据", name: "Amazon Product Page (B0FMK95ABC)", size: "0.9MB", icon: "fa-shopping-cart text-slate-400", addedAt: "2024-09-15", source: "系统采集" },
    { id: "3", category: "竞品数据", name: "Competitor Analysis - B09XYZ1234", size: "0.8MB", icon: "fa-chart-line text-slate-400", addedAt: "2024-09-15", source: "系统采集" },
    { id: "4", category: "竞品数据", name: "Competitor Analysis - B09ABC5678", size: "0.7MB", icon: "fa-chart-line text-slate-400", addedAt: "2024-09-15", source: "系统采集" },
    { id: "5", category: "网站参考", name: "Google Search Results (10 pages)", size: "3.2MB", icon: "fa-globe text-slate-400", addedAt: "2024-09-15", source: "系统采集" },
    { id: "6", category: "YouTube", name: "YouTube Reviews (10 videos)", size: "2.1MB", icon: "fa-youtube text-slate-400", addedAt: "2024-09-15", source: "系统采集" },
    { id: "7", category: "上传文件", name: "Return Reason Statistics Q3.csv", size: "128KB", icon: "fa-file-csv text-slate-400", addedAt: "2024-09-15", source: "用户上传" },
    { id: "8", category: "上传文件", name: "店铺受众画像-2024.pdf", size: "2.4MB", icon: "fa-file-pdf text-slate-400", addedAt: "2024-09-15", source: "用户上传" },
  ])

  const [showUploadModal, setShowUploadModal] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleNewFileUpload = (files: FileList | null) => {
    if (!files) return
    const newFiles = Array.from(files).map((file, i) => ({
      id: `new-${Date.now()}-${i}`,
      category: "上传文件" as const,
      name: file.name,
      size: file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)}MB` : `${(file.size / 1024).toFixed(0)}KB`,
      icon: file.name.endsWith(".csv") ? "fa-file-csv text-slate-400"
        : file.name.endsWith(".xlsx") || file.name.endsWith(".xls") ? "fa-file-excel text-slate-400"
          : file.name.endsWith(".pdf") ? "fa-file-pdf text-slate-400"
            : "fa-file text-slate-400",
      addedAt: new Date().toISOString().split("T")[0],
      source: "用户上传",
    }))
    setDataFiles(prev => [...prev, ...newFiles])
    setShowUploadModal(false)
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

                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-500 font-medium">正在加载报告内容...</p>
                    </div>
                  ) : (
                    <div id="markdown-content">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
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
                            <p className="text-slate-600 text-[17px] leading-[1.8] mb-6" {...props} />
                          ),
                          ul: ({ ...props }) => <ul className="list-disc pl-6 mb-8 space-y-3" {...props} />,
                          ol: ({ ...props }) => <ol className="list-decimal pl-6 mb-8 space-y-3" {...props} />,
                          li: ({ ...props }) => <li className="text-slate-600 text-[17px] leading-[1.8]" {...props} />,
                          table: ({ ...props }) => (
                            <div className="overflow-x-auto my-10 border border-slate-200 rounded-xl">
                              <table className="w-full border-collapse" {...props} />
                            </div>
                          ),
                          thead: ({ ...props }) => <thead className="bg-slate-50" {...props} />,
                          th: ({ ...props }) => (
                            <th
                              className="px-6 py-4 text-left text-sm font-bold text-slate-900 border-b border-slate-200"
                              {...props}
                            />
                          ),
                          td: ({ ...props }) => (
                            <td className="px-6 py-4 text-sm text-slate-600 border-b border-slate-100" {...props} />
                          ),
                          img: ({ ...props }) => (
                            <img className="rounded-2xl my-10 border border-slate-100 shadow-sm mx-auto" {...props} />
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
                            <pre className="bg-slate-900 rounded-xl my-6 overflow-x-auto" {...props} />
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
                onClick={() => router.push(`/chat/${reportId}`)}
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

            {/* ── Section 1: 报告配置 ── */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-blue-600 rounded-full"></div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">报告配置</h2>
                </div>
                <span className="text-sm text-slate-400">创建于 {reportConfig.createdAt}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-xs text-slate-400 font-medium mb-1.5">市场站点</div>
                  <div className="font-bold text-slate-900 text-lg">🇺🇸 {reportConfig.marketplace}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-xs text-slate-400 font-medium mb-1.5">报告语言</div>
                  <div className="font-bold text-slate-900 text-lg">{reportConfig.language}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-xs text-slate-400 font-medium mb-1.5">LLM 模型</div>
                  <div className="font-bold text-slate-900 text-sm">{reportConfig.llmModel}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-xs text-slate-400 font-medium mb-1.5">参考数据</div>
                  <div className="font-bold text-slate-900 text-sm">{reportConfig.websiteCount} 网站 · {reportConfig.youtubeCount} 视频</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                  <div className="text-xs text-slate-500 font-semibold mb-2">核心产品 ASIN ({reportConfig.coreAsins.length})</div>
                  <div className="flex flex-wrap gap-2">
                    {reportConfig.coreAsins.map((asin) => (
                      <span key={asin} className="px-3 py-1.5 bg-white rounded-lg text-sm font-mono text-slate-700 border border-slate-200 shadow-sm">{asin}</span>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                  <div className="text-xs text-slate-500 font-semibold mb-2">竞品 ASIN ({reportConfig.competitorAsins.length})</div>
                  <div className="flex flex-wrap gap-2">
                    {reportConfig.competitorAsins.map((asin) => (
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
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <i className="fas fa-plus text-xs"></i>
                  新增文件
                </button>
              </div>

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
                          {file.source === "用户上传" && (
                            <button
                              onClick={() => setDataFiles(prev => prev.filter(f => f.id !== file.id))}
                              className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                              title="删除文件"
                            >
                              <i className="fas fa-trash-can text-xs text-red-400"></i>
                            </button>
                          )}
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
                    <button onClick={() => setShowUploadModal(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
                      <i className="fas fa-xmark text-slate-400"></i>
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
                      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleNewFileUpload(e.dataTransfer.files) }}
                      onClick={() => document.getElementById("new-file-input")?.click()}
                    >
                      <input
                        id="new-file-input"
                        type="file"
                        className="hidden"
                        multiple
                        accept=".csv,.xlsx,.xls,.pdf,.doc,.docx,.txt,.json"
                        onChange={(e) => handleNewFileUpload(e.target.files)}
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
