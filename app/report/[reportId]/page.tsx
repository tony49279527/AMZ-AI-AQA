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

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.reportId as string
  const [activeTab, setActiveTab] = useState("report")
  const [activeSection, setActiveSection] = useState("")
  const [isScrolled, setIsScrolled] = useState(false)
  const [markdown, setMarkdown] = useState("")
  const [loading, setLoading] = useState(true)
  const [questionInput, setQuestionInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)

  // 动态从 Markdown 提取目录章节 (提取 ## 和 ### 级别的标题)
  const [sections, setSections] = useState<{ id: string; title: string; level: number }[]>([])

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
    {
      question: "My cat is scared of the automatic cleaning sound. What should I do?",
      answer: "初始几天请关闭“自动清洁”，改为“手动按键”。让猫先熟悉机器。",
      timestamp: new Date("2024-03-07T10:00:00"),
    },
    {
      question: "How often should I completely replace all the litter?",
      answer: "建议每45-60天完全清空并彻底刷洗一次滚筒。",
      timestamp: new Date("2024-03-06T11:00:00"),
    },
    {
      question: "Can I use this for kittens under 3 months old?",
      answer: "请启用APP中的“幼猫模式”，以确保超轻体重的极致感应安全。",
      timestamp: new Date("2024-03-05T12:00:00"),
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
    "总结一下主要竞争优势",
    "市场份额对比如何？",
    "定价策略有什么区别？",
    "客户反馈的关键点是什么？",
  ]

  const chatHistory = [
    { id: "1", title: "AI竞品分析报告-猫砂盆-C4.5", status: "活跃中", time: "当前" },
    { id: "2", title: "Tesla vs 蔚来竞品分析", status: "3小时前", time: "3小时前" },
    { id: "3", title: "iPhone 15 Pro 对比分析", status: "昨天", time: "昨天" },
    { id: "4", title: "抖音市场策略讨论", status: "4小时前", time: "4小时前" },
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

        <TabsContent value="qa" className="focus-visible:outline-none focus-visible:ring-0 m-0 pt-[160px]">
          <div className="h-[calc(100vh-160px)] flex bg-slate-50 overflow-hidden">
            {/* Left Sidebar - Chat History */}
            <aside className="hidden xl:flex w-[280px] flex-col bg-white border-r border-slate-200 p-6 no-print">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">聊天历史</h3>
                <i className="fas fa-chevron-left text-slate-400 cursor-pointer"></i>
              </div>
              <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2">
                {chatHistory.map((chat) => (
                  <div
                    key={chat.id}
                    className={cn(
                      "p-4 rounded-xl border transition-all cursor-pointer group",
                      chat.status === "活跃中"
                        ? "bg-blue-600/5 border-blue-200 ring-1 ring-blue-100"
                        : "bg-white border-slate-100 hover:border-blue-100 hover:bg-slate-50"
                    )}
                  >
                    <div className="font-bold text-[13px] text-slate-800 mb-1 truncate group-hover:text-blue-600">{chat.title}</div>
                    <div className="text-[11px] text-slate-400 font-medium">{chat.status}</div>
                  </div>
                ))}
              </div>
            </aside>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-white">
              {/* Chat Header */}
              <div className="px-8 py-6 border-b border-slate-100 flex flex-col items-center">
                <h2 className="text-xl font-bold text-slate-900 mb-1">AI竞品分析报告-猫砂盆-C4.5</h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">智能问答 | AI Q&A</span>
                </div>
                <div className="absolute right-8 top-6">
                  <Button variant="outline" size="sm" className="gap-2 text-[12px] bg-transparent border-slate-200 hover:bg-blue-50 transition-all">
                    <i className="fas fa-download text-slate-400"></i>
                    导出对话
                  </Button>
                </div>
              </div>

              {/* Chat Content */}
              <div className="flex-1 overflow-y-auto p-10 bg-slate-50/20">
                <div className="max-w-[900px] mx-auto space-y-10">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-3 px-6 py-2 bg-slate-100/80 rounded-full text-[13px] text-slate-500 font-medium">
                      <i className="fas fa-info-circle text-blue-500"></i>
                      欢迎使用智能问答系统！我已加载您的报告，可以回答关于报告内容的任何问题。
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="space-y-8">
                    {qaSessions.map((qa, idx) => (
                      <div key={idx} className="space-y-4">
                        <div className="flex justify-end">
                          <div className="max-w-[80%] bg-[#2563eb] text-white px-5 py-3 rounded-2xl rounded-tr-none shadow-sm">
                            <p className="text-[15px] leading-relaxed">{qa.question}</p>
                          </div>
                        </div>
                        <div className="flex justify-start">
                          <div className="max-w-[85%] bg-white border border-slate-100 px-5 py-4 rounded-2xl rounded-tl-none shadow-sm">
                            <div className="text-[15px] leading-relaxed text-slate-700">{qa.answer}</div>
                            <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-2">
                              <p className="text-[10px] text-slate-400 flex items-center gap-1.5 font-medium">
                                <i className="fas fa-shield-alt text-green-500 transition-colors"></i>
                                基于报告原文内容回答，答案仅供参考
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chat Footer */}
              <div className="px-8 py-6 border-t border-slate-100 bg-white">
                <div className="max-w-[900px] mx-auto">
                  {/* Quick Questions */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {quickQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => setQuestionInput(q)}
                        className="px-4 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[12px] font-bold text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all flex items-center gap-2"
                      >
                        <i className="fas fa-lightbulb text-orange-400"></i>
                        {q}
                      </button>
                    ))}
                  </div>

                  {/* Input Area */}
                  <div className="relative group">
                    <textarea
                      value={questionInput}
                      onChange={(e) => setQuestionInput(e.target.value)}
                      placeholder="输入您的问题... (Ctrl+Enter 发送)"
                      rows={1}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all pr-32 resize-none overflow-hidden h-14"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          setQuestionInput("")
                          setIsTyping(true)
                          setTimeout(() => setIsTyping(false), 2000)
                        }
                      }}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-3">
                      <i className="fas fa-paperclip text-slate-400 cursor-pointer hover:text-slate-600 transition-colors"></i>
                      <button
                        onClick={() => {
                          setQuestionInput("")
                          setIsTyping(true)
                          setTimeout(() => setIsTyping(false), 2000)
                        }}
                        className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
                      >
                        <i className="fas fa-paper-plane"></i>
                        发送
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar - Context */}
            <aside className="hidden xl:flex w-[300px] flex-col bg-slate-50 border-l border-slate-200 p-6 no-print overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">报告上下文</h3>
                <i className="fas fa-chevron-right text-slate-400"></i>
              </div>

              <div className="space-y-8">
                <section>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">当前报告</label>
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="font-bold text-[14px] text-slate-800 leading-snug">AI竞品分析报告-猫砂盆-C4.5</div>
                  </div>
                </section>

                <section>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">可用章节</label>
                  <div className="space-y-2">
                    {sections.filter(s => s.level === 2).map((section) => (
                      <div
                        key={section.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all cursor-pointer group"
                      >
                        <span className="text-[13px] font-bold text-slate-600 group-hover:text-blue-600">{section.title}</span>
                        <i className="fas fa-chevron-right text-[10px] text-slate-300 group-hover:text-blue-400"></i>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="p-5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="flex items-start gap-3 relative z-10">
                      <i className="fas fa-lightbulb text-yellow-300 mt-1"></i>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">提示</p>
                        <p className="text-[13px] leading-relaxed font-semibold">
                          您可以询问关于报告中任何章节的问题，AI 会引用相关章节内容为您解答。
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </aside>
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
