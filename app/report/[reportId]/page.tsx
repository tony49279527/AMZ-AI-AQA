"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import { cn } from "@/lib/utils"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { reportMarkdown } from "@/lib/report-data"

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.reportId as string
  const [activeTab, setActiveTab] = useState("report")
  const [activeSection, setActiveSection] = useState("")
  const [isScrolled, setIsScrolled] = useState(false)

  // 动态从 Markdown 提取目录章节 (提取 ## 级别的标题)
  const sections = reportMarkdown
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line, index) => {
      const title = line.replace("## ", "").trim()
      return {
        id: `section-${index + 1}`,
        title: title,
      }
    })

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

  const qaSessions = [
    {
      question: "这款猫砂盆对于大体型猫（如缅因猫）友好吗？",
      answer:
        "非常友好。根据产品规格，入口宽达16.5英寸，且为开放式设计，直到33磅（约15kg）的猫咪都能轻松进出。用户评论中也有多位缅因猫家长反馈使用体验良好，没有空间局促感。",
      timestamp: new Date("2024-03-10T14:30:00"),
    },
    {
      question: "是否支持5G WiFi连接？",
      answer:
        "不支持。该设备目前仅支持2.4GHz WiFi频段。如果您的路由器是双频合一的，建议在配网时临时关闭5G频段，或者开启专门的IoT客访网络（仅2.4G）进行连接。",
      timestamp: new Date("2024-03-09T09:15:00"),
    },
    {
      question: "清理频率如何设置最合理？",
      answer:
        "建议根据猫咪数量调整：单猫家庭可设置为每次如厕后延迟5-10分钟清理；多猫家庭建议缩短至3-5分钟。APP支持自定义清理时间表，您也可以设置夜间静音模式避免打扰休息。",
      timestamp: new Date("2024-03-08T16:20:00"),
    },
  ]

  const dataSources = [
    { type: "亚马逊数据", name: "Amazon Product Page (B0FMK94VY4)", size: "1.2MB", count: null, icon: "fa-shopping-cart" },
    { type: "亚马逊数据", name: "Competitor Analysis - Mintakawa", size: "0.8MB", count: null, icon: "fa-chart-line" },
    { type: "上传文件", name: "User Reviews Export (2024-Q1)", size: "4.5MB", count: 452, icon: "fa-file-excel" },
    { type: "YouTube数据", name: "YouTube Review - TechCat", size: null, count: 1, icon: "fa-youtube" },
    { type: "上传文件", name: "Return Reason Statistics.csv", size: "128KB", count: 1203, icon: "fa-file-csv" },
  ]

  const quickQuestions = [
    "总结一下主要内容",
    "产品的核心优势是什么？",
    "目前最严重的问题是什么？",
    "客户最关心的点是什么？",
  ]

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
              <aside className="hidden lg:block sticky top-[180px] w-[280px] shrink-0 no-print">
                <div className="transparent p-0">
                  <div className="text-base font-bold text-slate-800 uppercase tracking-[0.8px] mb-6">Contents</div>
                  <nav className="space-y-1">
                    {sections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={cn(
                          "w-full text-left px-4 py-2.5 rounded-md text-sm transition-all border-l-2",
                          activeSection === section.id
                            ? "bg-blue-600/5 text-[#2563eb] border-[#2563eb] font-semibold"
                            : "text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900"
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
                    <button
                      onClick={() => {
                        const content = document.getElementById("report-article")?.innerHTML
                        if (!content) return
                        const header =
                          '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"/></head><body>'
                        const footer = "</body></html>"
                        const sourceHTML = header + content + footer
                        const blob = new Blob([sourceHTML], { type: "application/msword" })
                        const url = URL.createObjectURL(blob)
                        const link = document.createElement("a")
                        link.href = url
                        link.download = `Report_${reportId}.doc`
                        link.click()
                        URL.revokeObjectURL(url)
                      }}
                      className="flex items-center gap-3 w-full text-left text-[14px] text-slate-500 hover:text-[#2563eb] py-2 transition-colors group"
                    >
                      <i className="fas fa-file-word w-4 text-slate-400 group-hover:text-[#2563eb]"></i>
                      <span className="font-medium">下载为 Word</span>
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
                        const sectionIndex = sections.findIndex((s) => s.title === title)
                        const id = sectionIndex !== -1 ? sections[sectionIndex].id : ""
                        return (
                          <h2
                            id={id}
                            className="text-[28px] font-bold text-slate-900 tracking-tight mt-20 mb-10 scroll-mt-32"
                            {...props}
                          />
                        )
                      },
                      h3: ({ ...props }) => (
                        <h3 className="text-[22px] font-bold text-slate-900 mt-12 mb-6" {...props} />
                      ),
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
                    }}
                  >
                    {reportMarkdown}
                  </ReactMarkdown>
                </div>
              </article>
            </div>
          </main>
        </TabsContent>

        <TabsContent value="qa" className="focus-visible:outline-none focus-visible:ring-0 m-0 pt-[160px]">
          <div className="h-[calc(100vh-140px)] flex bg-slate-50">
            <div className="flex-1 flex flex-col bg-white">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">智能问答 | AI Q&A</h2>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-[700px] mx-auto">
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                    <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
                    <p className="text-sm text-slate-700">您可以随时与本报告进行深度问答。AI 会针对报告内容进行智能回答。</p>
                  </div>
                  <div className="space-y-6">
                    {qaSessions.map((qa, idx) => (
                      <div key={idx}>
                        <div className="flex items-start gap-3 mb-4">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <i className="fas fa-user text-white text-sm"></i>
                          </div>
                          <div className="flex-1 font-medium text-slate-900">
                            {qa.question}
                            <div className="text-xs text-slate-400 mt-1">{qa.timestamp.toLocaleString("zh-CN")}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 ml-11">
                          <div className="flex-1 p-4 bg-slate-50 rounded-lg border">
                            <div className="text-sm leading-relaxed text-slate-700">{qa.answer}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sources" className="focus-visible:outline-none focus-visible:ring-0 m-0 pt-[160px]">
          <main className="max-w-7xl mx-auto px-6 pb-16">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-10">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-1.5 h-8 bg-blue-600 rounded-full"></div>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">数据来源</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dataSources.map((source, idx) => (
                  <div key={idx} className="flex flex-col p-6 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <i className={cn("fas text-xl", source.icon)}></i>
                      </div>
                    </div>
                    <div className="mb-6">
                      <div className="font-bold text-slate-900 mb-1 truncate">{source.name}</div>
                      <div className="text-xs text-slate-500 font-medium px-2 py-0.5 bg-slate-200/50 rounded inline-block">{source.type}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </TabsContent>
      </Tabs>
    </div>
  )
}
