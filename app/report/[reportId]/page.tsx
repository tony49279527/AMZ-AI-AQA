"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useParams, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.reportId as string

  const [activeSection, setActiveSection] = useState<string>("section-header")
  const [activeChatId, setActiveChatId] = useState<string>("1")
  const [inputMessage, setInputMessage] = useState<string>("")

  const report = {
    id: reportId,
    title: "AI竞品分析报告-猫砂盆-C4.5",
    createdAt: new Date("2025-12-05"),
    generationTime: 45,
    model: "GPT-4",
    totalWords: 21500,
    mainProduct: "开放式自动猫砂盆 (B0FMK94VY4)",
    competitor: "Mintakawa/Lohhuby等竞品",
  }

  const sections = [
    { id: "section-header", title: "报告基础信息" },
    { id: "section-1", title: "一、市场与客群洞察" },
    { id: "section-2", title: "二、竞品分析与我方策略" },
    { id: "section-3", title: "三、退货报告分析" },
    { id: "section-4", title: "四、Listing 优化方案" },
    { id: "section-5", title: "五、产品优化建议" },
    { id: "section-6", title: "报告总结" },
  ]

  const chatHistory = [
    { id: "1", title: "特斯拉 vs 蔚来竞品分析报告", time: "进行中", active: true },
    { id: "2", title: "iPhone 15 Pro 对比分析", time: "3小时前", active: false },
    { id: "3", title: "抖音市场策略分析", time: "4小时前", active: false },
  ]

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

  const suggestedQuestions = [
    { category: "市场分析", questions: ["产品分析", "竞品分析", "产品特性", "论价策略", "客户洞察"] },
    { category: "提示", text: "您可以随时与本报告进行深度问答，支持语音输入。AI 会针对报告内容进行智能回答。" },
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

  // ScrollSpy
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150
      for (const section of sections) {
        const element = document.getElementById(section.id)
        if (element) {
          const offsetTop = element.offsetTop
          const height = element.offsetHeight
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + height) {
            setActiveSection(section.id)
          }
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

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      {/* Centered Tabs - Below Navigation */}
      <div className="bg-white border-b border-slate-200 fixed top-[67px] left-0 right-0 z-40">
        <div className="max-w-[1400px] mx-auto px-6">
          <Tabs defaultValue="report" className="w-full">
            <div className="flex justify-center py-4">
              <TabsList className="bg-slate-100 p-1">
                <TabsTrigger value="report" className="gap-2 data-[state=active]:bg-white">
                  <i className="fas fa-file-alt"></i>
                  报告详情
                </TabsTrigger>
                <TabsTrigger value="qa" className="gap-2 data-[state=active]:bg-white">
                  <i className="fas fa-comments"></i>
                  智能问答
                </TabsTrigger>
                <TabsTrigger value="sources" className="gap-2 data-[state=active]:bg-white">
                  <i className="fas fa-database"></i>
                  数据源
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Report Details Tab */}
            <TabsContent value="report" className="focus-visible:outline-none focus-visible:ring-0 m-0 pt-[120px]">
              <main className="max-w-[1200px] mx-auto px-6 md:px-10 pt-8 pb-16">
                {/* Header */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Button variant="ghost" onClick={() => router.push("/dashboard")} className="gap-2">
                      <i className="fas fa-arrow-left"></i>
                      返回
                    </Button>
                  </div>
                  <h1 className="text-4xl font-bold mb-4 text-slate-900">{report.title}</h1>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                      <i className="fas fa-calendar"></i>
                      {report.createdAt.toLocaleDateString("zh-CN")}
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="fas fa-clock"></i>
                      生成用时 {report.generationTime} 分钟
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="fas fa-robot"></i>
                      {report.model}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-8 items-start">
                  {/* Left Sidebar - Sticky TOC */}
                  <aside className="hidden lg:block sticky top-[200px]">
                    <Card className="p-4">
                      <h3 className="text-sm font-bold text-slate-700 mb-3">目录导航</h3>
                      <nav className="space-y-1">
                        {sections.map((section) => (
                          <button
                            key={section.id}
                            onClick={() => scrollToSection(section.id)}
                            className={cn(
                              "block w-full text-left py-2 px-3 text-sm rounded transition-colors",
                              activeSection === section.id
                                ? "bg-blue-50 text-blue-600 font-medium"
                                : "text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            {section.title}
                          </button>
                        ))}
                      </nav>

                      <div className="mt-6 pt-4 border-t space-y-2">
                        <button className="flex items-center gap-2 w-full text-left text-sm text-slate-600 hover:text-blue-600 py-1">
                          <i className="fas fa-print w-4"></i>
                          <span>打印报告</span>
                        </button>
                        <button className="flex items-center gap-2 w-full text-left text-sm text-slate-600 hover:text-blue-600 py-1">
                          <i className="fas fa-download w-4"></i>
                          <span>导出 PDF</span>
                        </button>
                      </div>
                    </Card>
                  </aside>

                  {/* Main Article Content */}
                  <article className="min-w-0">
                    {/* Section: Header */}
                    <section id="section-header" className="scroll-mt-[200px] mb-12 pb-8 border-b">
                      <h1 className="text-3xl font-bold text-slate-900 mb-4">AI竞品分析报告-猫砂盆-C4.5</h1>
                      <p className="text-slate-600 mb-8">2025年12月5日修改 · 报告语言：中文为主，关键术语保留英文</p>

                      <Card className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex justify-between py-2">
                            <span className="text-slate-600">报告完成日期</span>
                            <span className="font-medium">2025年12月5日</span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="text-slate-600">报告字数</span>
                            <span className="font-medium">约21,500汉字</span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="text-slate-600">主产品 ASIN</span>
                            <span className="font-medium font-mono text-blue-600">B0FMK94VY4</span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="text-slate-600">AI 模型</span>
                            <span className="font-medium">GPT-4</span>
                          </div>
                        </div>
                      </Card>
                    </section>

                    {/* Section 1 */}
                    <section id="section-1" className="scroll-mt-[200px] mb-12">
                      <h2 className="text-2xl font-bold text-slate-900 mb-6">一、市场与客群洞察</h2>

                      <h3 className="text-xl font-bold text-slate-900 mb-4">1.1 精准用户画像</h3>
                      <p className="text-slate-700 leading-relaxed mb-6">
                        根据综合数据源分析，开放式自动猫砂盆的核心用户可细分为以下群体：
                      </p>

                      <div className="overflow-x-auto mb-8">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-slate-100">
                              <th className="py-3 px-4 font-semibold text-left border">用户群体</th>
                              <th className="py-3 px-4 font-semibold text-left border">核心特征</th>
                              <th className="py-3 px-4 font-semibold text-left border">占比估算</th>
                              <th className="py-3 px-4 font-semibold text-left border">典型需求</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border">
                              <td className="py-3 px-4 font-medium">多猫家庭主力用户</td>
                              <td className="py-3 px-4">拥有2-4只猫，居住面积中等</td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium text-xs">35%</span>
                              </td>
                              <td className="py-3 px-4">减少每日铲屎频次，控制多猫异味</td>
                            </tr>
                            <tr className="border bg-slate-50">
                              <td className="py-3 px-4 font-medium">单猫精致养宠族</td>
                              <td className="py-3 px-4">1只猫，追求生活品质</td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded font-medium text-xs">25%</span>
                              </td>
                              <td className="py-3 px-4">彻底解放双手，保持家居清洁</td>
                            </tr>
                            <tr className="border">
                              <td className="py-3 px-4 font-medium">行动不便/高龄群体</td>
                              <td className="py-3 px-4">身体原因难以频繁弯腰铲屎</td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-medium text-xs">15%</span>
                              </td>
                              <td className="py-3 px-4">降低体力负担，简化清洁流程</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <h3 className="text-xl font-bold text-slate-900 mb-4">1.2 用户痛点洞察</h3>
                      <div className="space-y-4">
                        <Card className="p-4 bg-red-50 border-red-200">
                          <h4 className="font-bold mb-2 flex items-center gap-2">
                            <i className="fas fa-exclamation-triangle text-red-500"></i>
                            传统猫砂盆痛点
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                            <li>"scooping daily is gross" (每日铲屎恶心)</li>
                            <li>"litter tracking everywhere" (猫砂到处飞)</li>
                            <li>"lingering odors" (持续异味)</li>
                          </ul>
                        </Card>
                        <Card className="p-4 bg-green-50 border-green-200">
                          <h4 className="font-bold mb-2 flex items-center gap-2">
                            <i className="fas fa-check-circle text-green-600"></i>
                            核心诉求
                          </h4>
                          <p className="text-sm text-slate-700 font-medium">
                            开放视野 + 自动清洁 + 静音 + 防夹保护 + APP远程管理
                          </p>
                        </Card>
                      </div>
                    </section>

                    {/* More sections... */}
                    <section id="section-2" className="scroll-mt-[200px] mb-12 pt-8 border-t">
                      <h2 className="text-2xl font-bold text-slate-900 mb-6">二、竞品分析与我方策略</h2>
                      <p className="text-slate-700 leading-relaxed">竞品分析内容...</p>
                    </section>

                    <section id="section-3" className="scroll-mt-[200px] mb-12 pt-8 border-t">
                      <h2 className="text-2xl font-bold text-slate-900 mb-6">三、退货报告分析</h2>
                      <p className="text-slate-700 leading-relaxed">退货分析内容...</p>
                    </section>

                    <section id="section-4" className="scroll-mt-[200px] mb-12 pt-8 border-t">
                      <h2 className="text-2xl font-bold text-slate-900 mb-6">四、Listing 优化方案</h2>
                      <p className="text-slate-700 leading-relaxed">Listing优化内容...</p>
                    </section>

                    <section id="section-5" className="scroll-mt-[200px] mb-12 pt-8 border-t">
                      <h2 className="text-2xl font-bold text-slate-900 mb-6">五、产品优化建议</h2>
                      <p className="text-slate-700 leading-relaxed">产品优化内容...</p>
                    </section>

                    <section id="section-6" className="scroll-mt-[200px] mb-12 pt-8 border-t">
                      <h2 className="text-2xl font-bold text-slate-900 mb-6">报告总结</h2>
                      <Card className="p-6 bg-blue-50 border-blue-200">
                        <p className="text-slate-700 leading-relaxed">
                          综上所述，智能猫砂盆市场正处于从"尝鲜"向"普及"过渡的关键时期。用户不再满足于"能用"，而是追求"好用"和"放心"。
                        </p>
                      </Card>
                    </section>
                  </article>
                </div>
              </main>
            </TabsContent>

            {/* Q&A Tab - Chat Interface */}
            <TabsContent value="qa" className="focus-visible:outline-none focus-visible:ring-0 m-0 pt-[120px]">
              <div className="h-[calc(100vh-187px)] flex bg-slate-50">
                {/* Left Sidebar - Chat History */}
                <div className="w-[200px] bg-white border-r flex flex-col">
                  <div className="p-4 border-b">
                    <Button size="sm" className="w-full gap-2">
                      <i className="fas fa-plus"></i>
                      新建对话
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    <div className="text-xs font-medium text-slate-400 px-3 py-2">聊天历史</div>
                    {chatHistory.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => setActiveChatId(chat.id)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg mb-1 transition-colors",
                          activeChatId === chat.id ? "bg-blue-50 text-blue-600" : "hover:bg-slate-50"
                        )}
                      >
                        <div className="text-sm font-medium mb-1 line-clamp-2">{chat.title}</div>
                        <div className="text-xs text-slate-400">{chat.time}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Center Panel - Conversation */}
                <div className="flex-1 flex flex-col bg-white">
                  {/* Header */}
                  <div className="p-4 border-b flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold">{report.title}</h2>
                      <p className="text-sm text-slate-500">智能问答 | AI Q&A</p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2">
                      <i className="fas fa-download"></i>
                      导出对话
                    </Button>
                  </div>

                  {/* Conversation Area */}
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-[700px] mx-auto">
                      {/* Info Banner */}
                      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                        <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
                        <p className="text-sm text-slate-700">
                          您可以随时与本报告进行深度问答，我已记住您的问题。可以继续追问或提出新问题。
                        </p>
                      </div>

                      {/* Quick Questions */}
                      <div className="mb-6">
                        <div className="flex flex-wrap gap-2">
                          {quickQuestions.map((q, idx) => (
                            <button
                              key={idx}
                              className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <i className="fas fa-lightbulb text-xs mr-1"></i>
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Q&A Messages */}
                      <div className="space-y-6">
                        {qaSessions.map((qa, idx) => (
                          <div key={idx}>
                            {/* User Question */}
                            <div className="flex items-start gap-3 mb-4">
                              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <i className="fas fa-user text-white text-sm"></i>
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-slate-900 mb-1">{qa.question}</div>
                                <div className="text-xs text-slate-400">{qa.timestamp.toLocaleString("zh-CN")}</div>
                              </div>
                            </div>
                            {/* AI Answer */}
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

                  {/* Input Box */}
                  <div className="p-4 border-t bg-white">
                    <div className="max-w-[700px] mx-auto">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          placeholder="输入您的问题... (Ctrl+Enter 发送)"
                          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                        <Button className="gap-2">
                          <i className="fas fa-paper-plane"></i>
                          发送
                        </Button>
                      </div>
                      <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                        <i className="fas fa-shield-alt"></i>
                        AI生成的回答仅供参考，实际效果请以产品为准
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Sidebar - Suggested Questions */}
                <div className="w-[250px] bg-white border-l p-4 overflow-y-auto">
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <i className="fas fa-file-alt text-blue-500"></i>
                      报告上下文
                    </h3>
                    <Card className="p-3 bg-blue-50 border-blue-200">
                      <div className="text-sm font-medium">特斯拉 vs 蔚来竞品分析报告</div>
                    </Card>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <i className="fas fa-lightbulb text-yellow-500"></i>
                      可能感兴趣
                    </h3>
                    <div className="space-y-2">
                      {suggestedQuestions[0]?.questions?.map((q, idx) => (
                        <button
                          key={idx}
                          className="w-full text-left p-2 bg-slate-50 hover:bg-slate-100 rounded-lg border transition-colors group"
                        >
                          <div className="text-sm text-slate-700">
                            <i className="fas fa-chevron-right text-xs mr-2 text-slate-400"></i>
                            {q}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Card className="p-3 bg-blue-50 border-blue-200">
                    <div className="flex items-start gap-2">
                      <i className="fas fa-info-circle text-blue-500 text-sm mt-0.5"></i>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        您可以随时与本报告进行深度问答，支持语音输入。AI 会针对报告内容进行智能回答。
                      </p>
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Data Sources Tab */}
            <TabsContent value="sources" className="focus-visible:outline-none focus-visible:ring-0 m-0 pt-[120px]">
              <main className="max-w-[1200px] mx-auto px-6 md:px-10 pt-8 pb-16">
                <Card className="p-6">
                  <h2 className="text-2xl font-bold mb-6">数据来源</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dataSources.map((source, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border hover:bg-slate-100 transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-white border flex items-center justify-center flex-shrink-0">
                            <i
                              className={cn(
                                "fas text-lg",
                                source.type === "上传文件"
                                  ? "fa-file-excel text-green-600"
                                  : source.type === "YouTube数据"
                                    ? "fa-youtube text-red-600"
                                    : "fa-shopping-cart text-orange-600"
                              )}
                            ></i>
                          </div>
                          <div>
                            <div className="font-medium text-sm truncate max-w-[180px]">{source.name}</div>
                            <div className="text-xs text-slate-500">{source.type}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {source.size && <span className="text-xs font-mono text-slate-500">{source.size}</span>}
                          {source.count && (
                            <span className="px-2 py-1 rounded bg-white border text-xs font-medium text-blue-600">
                              {source.count} 条
                            </span>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <i className="fas fa-external-link-alt text-xs"></i>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </main>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
