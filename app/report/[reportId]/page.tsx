"use client"

import { useState } from "react"
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

  const [activeChapter, setActiveChapter] = useState<string | null>("1")

  const report = {
    id: reportId,
    title: "特斯拉 vs 蔚来竞品分析报告",
    createdAt: new Date(Date.now() - 3600000),
    generationTime: 45,
    model: "GPT-4",
    totalChapters: 11,
    totalWords: 28500,
    mainProduct: "Tesla Model 3",
    competitor: "NIO ET5",
  }

  const chapters = [
    {
      id: "1",
      title: "市场分析",
      subtitle: "Market Analysis",
      content:
        "# 市场分析\n\n## 全球电动车市场概况\n\n全球电动车市场正在经历快速增长。根据最新数据，2023年全球电动车销量达到1400万辆，同比增长35%。\n\n### 主要市场\n\n- 中国市场占据全球60%的份额\n- 欧洲市场增长稳健，占比25%\n- 北美市场潜力巨大，占比15%\n\n特斯拉在全球市场保持领先地位，市场份额约为18%。蔚来主要聚焦中国市场，在高端电动车领域占据重要位置。",
      subChapters: ["全球市场概况", "区域市场分析", "增长趋势预测", "市场机会评估"],
    },
    {
      id: "2",
      title: "竞品分析",
      subtitle: "Competitor Analysis",
      content:
        "# 竞品分析\n\n## 特斯拉 Model 3 vs 蔚来 ET5\n\n两款车型均定位于中高端纯电动轿车市场，但在品牌定位、技术路线和市场策略上存在显著差异。\n\n### 产品对比\n\n**特斯拉 Model 3**\n- 续航里程: 556-713km\n- 加速性能: 3.3-6.1s (0-100/km)\n- 智能驾驶: Autopilot/FSD\n- 价格区间: ¥231,900-331,900\n\n**蔚来 ET5**\n- 续航里程: 560-1000km\n- 加速性能: 4.3s (0-100/km)\n- 智能驾驶: NIO Pilot\n- 价格区间: ¥298,000-376,000",
      subChapters: ["产品对比", "技术特点", "品牌定位", "用户画像"],
    },
    {
      id: "3",
      title: "产品特性",
      subtitle: "Product Features",
      content: "# 产品特性\n\n详细分析两款产品的核心特性和差异化优势...",
      subChapters: ["外观设计", "内饰配置", "智能系统", "驾驶性能"],
    },
    {
      id: "4",
      title: "定价策略",
      subtitle: "Pricing Strategy",
      content: "# 定价策略\n\n对比两家企业的定价策略和市场定位...",
      subChapters: ["价格区间", "配置对比", "金融方案", "残值分析"],
    },
    {
      id: "5",
      title: "客户洞察",
      subtitle: "Customer Insights",
      content: "# 客户洞察\n\n基于用户反馈和市场调研的客户洞察分析...",
      subChapters: ["用户画像", "购买决策", "满意度调研", "痛点分析"],
    },
  ]

  const qaSessions = [
    {
      question: "两款车型的主要区别是什么？",
      answer:
        "特斯拉Model 3在全球品牌影响力、智能驾驶技术和充电网络方面具有优势，而蔚来ET5在换电服务、用户社区运营和本土化体验上更有竞争力。",
      timestamp: new Date(Date.now() - 1800000),
    },
    {
      question: "市场份额对比如何？",
      answer: "在中国高端电动车市场，特斯拉约占35%份额，蔚来约占15%。但蔚来在30-40万价格区间的细分市场中表现强劲。",
      timestamp: new Date(Date.now() - 3600000),
    },
  ]

  const dataSources = [
    { type: "上传文件", name: "Tesla_Model3_Specs.xlsx", size: "2.4 MB" },
    { type: "上传文件", name: "NIO_ET5_Data.csv", size: "1.8 MB" },
    { type: "YouTube数据", name: "车主评测视频 x 25", count: 25 },
    { type: "亚马逊数据", name: "用户评价 x 1,234", count: 1234 },
  ]

  const currentChapter = chapters.find((c) => c.id === activeChapter)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="max-w-[1200px] mx-auto px-6 pt-24 pb-32">
        {/* Header Section */}
        <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard")}
              className="gap-2 px-0 hover:bg-transparent text-muted-foreground hover:text-primary transition-colors group"
            >
              <i className="fas fa-arrow-left group-hover:-translate-x-1 transition-transform"></i>
              返回仪表盘
            </Button>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight leading-[1.2]">
            {report.title}
          </h1>
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <i className="fas fa-calendar-alt opacity-60"></i>
              {report.createdAt.toLocaleDateString("zh-CN")} {report.createdAt.toLocaleTimeString("zh-CN", { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="flex items-center gap-2">
              <i className="fas fa-clock opacity-60"></i>
              生成用时 {report.generationTime} 分钟
            </span>
            <span className="flex items-center gap-2">
              <i className="fas fa-microchip opacity-60"></i>
              {report.model}
            </span>
          </div>
        </div>

        {/* Unified Tabs System */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex items-center gap-1 p-1 h-auto rounded-xl bg-muted/50 border border-border/50 w-fit mb-8 shadow-none">
            <TabsTrigger
              value="overview"
              className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all text-sm font-medium border-none shadow-none"
            >
              <i className="fas fa-chart-pie text-xs"></i>
              概览
            </TabsTrigger>
            <TabsTrigger
              value="chapters"
              className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all text-sm font-medium border-none shadow-none"
            >
              <i className="fas fa-book-open text-xs"></i>
              报告内容
            </TabsTrigger>
            <TabsTrigger
              value="qa"
              className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all text-sm font-medium border-none shadow-none"
            >
              <i className="fas fa-comments text-xs"></i>
              智能问答
            </TabsTrigger>
            <TabsTrigger
              value="sources"
              className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all text-sm font-medium border-none shadow-none"
            >
              <i className="fas fa-database text-xs"></i>
              原始数据
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Overview */}
          <TabsContent value="overview" className="mt-0 space-y-8 animate-in fade-in duration-500">
            {/* Battle Card (VS View) */}
            <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card to-muted/30 p-10 shadow-sm">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl"></div>
              <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-purple/5 blur-3xl"></div>

              <div className="relative flex flex-col md:flex-row items-center justify-between gap-12 text-center md:text-left">
                {/* Product 1 */}
                <div className="flex-1 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">主品产品 (Target)</span>
                  <h3 className="text-3xl md:text-4xl font-black text-foreground">{report.mainProduct}</h3>
                </div>

                {/* VS Badge */}
                <div className="relative flex-shrink-0">
                  <div className="h-16 w-16 rounded-2xl bg-primary shadow-[0_0_30px_rgba(var(--primary),0.3)] flex items-center justify-center rotate-45 border-4 border-background">
                    <span className="text-primary-foreground font-black text-2xl -rotate-45 italic">VS</span>
                  </div>
                </div>

                {/* Product 2 */}
                <div className="flex-1 space-y-2 text-center md:text-right">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">对照竞品 (Competitor)</span>
                  <h3 className="text-3xl md:text-4xl font-black text-foreground">{report.competitor}</h3>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* AI Key Insights */}
              <Card className="lg:col-span-2 p-8 rounded-3xl bg-card border-border shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                  <div className="h-8 w-1.5 bg-primary rounded-full"></div>
                  <h2 className="text-xl font-bold">AI 智能分析洞察</h2>
                </div>
                <div className="space-y-6">
                  {[
                    "特斯拉 Model 3 在自动辅助驾驶（FSD）的全球数据积累和算法迭代上仍保持代际领先。 ",
                    "蔚来 ET5 凭借“换电模式”和极致的座舱内饰质感，在中国 30万级市场形成了极强的用户粘性。",
                    "综合性价比分析，Model 3 在能耗效率上领先 12%，而 ET5 在售后体系和社区运营上更具本土化优势。"
                  ].map((insight, i) => (
                    <div key={i} className="flex gap-4 group">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <span className="text-xs font-bold">{i + 1}</span>
                      </div>
                      <p className="text-lg text-muted-foreground/90 leading-relaxed font-medium">{insight}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Analysis Coverage */}
              <Card className="p-8 rounded-3xl bg-card border-border shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                  <div className="h-8 w-1.5 bg-purple rounded-full"></div>
                  <h2 className="text-xl font-bold">分析覆盖维度</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "市场定位", icon: "fa-bullseye", color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "性能规格", icon: "fa-bolt", color: "text-amber-600", bg: "bg-amber-50" },
                    { label: "智能座舱", icon: "fa-vr-cardboard", color: "text-purple-600", bg: "bg-purple-50" },
                    { label: "补能体系", icon: "fa-charging-station", color: "text-green-600", bg: "bg-green-50" },
                    { label: "定价策略", icon: "fa-tags", color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "用户口碑", icon: "fa-users", color: "text-indigo-600", bg: "bg-indigo-50" },
                  ].map((dim, i) => (
                    <div key={i} className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl border border-transparent transition-all hover:shadow-sm", dim.bg)}>
                      <i className={cn("fas text-xs", dim.icon, dim.color)}></i>
                      <span className="text-sm font-bold text-foreground/80">{dim.label}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Technical Metadata Footer */}
            <div className="pt-10 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-6 opacity-40 hover:opacity-100 transition-opacity">
              <div className="flex flex-wrap justify-center gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                <span className="flex items-center gap-2">
                  <i className="fas fa-fingerprint text-[8px]"></i>
                  Report ID: {report.id}
                </span>
                <span className="flex items-center gap-2">
                  <i className="fas fa-microchip text-[8px]"></i>
                  AI Model: {report.model}
                </span>
                <span className="flex items-center gap-2">
                  <i className="fas fa-clock text-[8px]"></i>
                  Generated at {report.createdAt.toLocaleString("zh-CN")}
                </span>
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Chapters Viewing */}
          <TabsContent value="chapters" className="mt-0 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Sidebar Navigation */}
              <div className="lg:col-span-1 space-y-4">
                <Card className="p-4 rounded-2xl bg-card border-border shadow-sm sticky top-24">
                  <div className="flex items-center gap-2 mb-4 px-2 py-1">
                    <i className="fas fa-list-ul text-xs text-primary"></i>
                    <span className="text-sm font-bold text-foreground/80">内容大纲</span>
                  </div>
                  <div className="space-y-1">
                    {chapters.map((chapter) => (
                      <button
                        key={chapter.id}
                        onClick={() => setActiveChapter(chapter.id)}
                        className={cn(
                          "w-full text-left px-3 py-3 rounded-xl text-sm transition-all flex items-center justify-between group",
                          activeChapter === chapter.id
                            ? "bg-primary/10 text-primary font-semibold shadow-sm"
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <span className="truncate">{chapter.title}</span>
                        <i className={cn(
                          "fas fa-chevron-right text-[10px] transition-transform",
                          activeChapter === chapter.id ? "translate-x-0" : "-translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"
                        )}></i>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Main Content Area */}
              <Card className="lg:col-span-3 p-10 rounded-2xl bg-card border-border shadow-sm min-h-[700px]">
                {currentChapter ? (
                  <article className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <header className="mb-10 pb-8 border-b border-border/50">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold tracking-widest uppercase">
                          Section {currentChapter.id}
                        </span>
                        <span className="text-muted-foreground/40 font-light">|</span>
                        <span className="text-sm text-muted-foreground font-medium">{currentChapter.subtitle}</span>
                      </div>
                      <h2 className="text-4xl font-bold text-foreground tracking-tight">{currentChapter.title}</h2>
                    </header>

                    <div className="prose prose-slate max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground/90 prose-p:leading-relaxed prose-li:text-muted-foreground/90">
                      {currentChapter.content.split("\n").map((line, i) => {
                        if (line.startsWith("# ")) return <h1 key={i} className="text-4xl font-bold mb-8 mt-12 first:mt-0">{line.replace("# ", "")}</h1>
                        if (line.startsWith("## ")) return <h2 key={i} className="text-2xl font-bold mb-6 mt-10">{line.replace("## ", "")}</h2>
                        if (line.startsWith("### ")) return <h3 key={i} className="text-xl font-bold mb-4 mt-8">{line.replace("### ", "")}</h3>
                        if (line.startsWith("- ")) return <li key={i} className="ml-4 mb-2 marker:text-primary">{line.replace("- ", "")}</li>
                        if (line.trim() === "") return <div key={i} className="h-4"></div>
                        return <p key={i} className="mb-4 text-lg">{line}</p>
                      })}
                    </div>
                  </article>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-20 text-muted-foreground">
                    <i className="fas fa-file-alt text-4xl mb-4 opacity-20"></i>
                    <p>请选择左侧目录开始阅读</p>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* Tab 3: Q&A History */}
          <TabsContent value="qa" className="mt-0 animate-in fade-in duration-500">
            <Card className="p-8 rounded-2xl bg-card border-border shadow-sm">
              <div className="flex items-center justify-between mb-8 border-b border-border/50 pb-6">
                <div>
                  <h2 className="text-xl font-bold mb-1 font-sans">问答交互记录</h2>
                  <p className="text-sm text-muted-foreground">基于该报告深度分析的所有问答资产</p>
                </div>
                <Button
                  onClick={() => router.push(`/chat/${reportId}`)}
                  variant="outline"
                  className="gap-2 rounded-xl h-10 border-primary/20 text-primary hover:bg-primary/5 font-medium"
                >
                  <i className="fas fa-plus-circle text-xs"></i>
                  开启新对话
                </Button>
              </div>

              <div className="space-y-6">
                {qaSessions.map((qa, idx) => (
                  <div key={idx} className="group relative">
                    {/* Question */}
                    <div className="flex items-start gap-4 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                        <i className="fas fa-user-circle text-xl"></i>
                      </div>
                      <div className="flex-1 pt-1.5">
                        <div className="font-bold text-foreground text-lg mb-1">{qa.question}</div>
                        <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">
                          {qa.timestamp.toLocaleString("zh-CN")}
                        </div>
                      </div>
                    </div>
                    {/* Answer */}
                    <div className="flex items-start gap-4 pl-14">
                      <div className="flex-1 p-5 bg-muted/40 rounded-2xl border border-border/50 relative">
                        <div className="absolute top-4 -left-2 w-4 h-4 bg-muted/40 border-l border-t border-border/50 rotate-[-45deg] hidden sm:block"></div>
                        <div className="text-base text-muted-foreground leading-relaxed italic">
                          "{qa.answer}"
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Tab 4: Data Sources */}
          <TabsContent value="sources" className="mt-0 animate-in fade-in duration-500">
            <Card className="p-8 rounded-2xl bg-card border-border shadow-sm">
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-1">训练与分析数据源</h2>
                <p className="text-sm text-muted-foreground">本项目所引用的所有原始非结构化数据</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dataSources.map((source, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-background border border-border/50 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        <i
                          className={cn(
                            "fas text-xl",
                            source.type === "上传文件" ? "fa-file-excel text-green-600" :
                              source.type === "YouTube数据" ? "fa-youtube text-red-600" : "fa-amazon text-orange-600"
                          )}
                        ></i>
                      </div>
                      <div>
                        <div className="font-bold text-sm text-foreground truncate max-w-[180px]">{source.name}</div>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest">{source.type}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {source.size && <span className="text-xs font-mono text-muted-foreground">{source.size}</span>}
                      {source.count && (
                        <span className="px-2 py-1 rounded-md bg-background border border-border/50 text-[10px] font-bold text-primary">
                          {source.count} 条
                        </span>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-background shadow-none border-none">
                        <i className="fas fa-external-link-alt text-[10px] opacity-40"></i>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Global Action Footer */}
        <div className="fixed bottom-8 left-10 right-10 flex justify-center z-50 pointer-events-none">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-background/80 backdrop-blur-xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.2)] pointer-events-auto animate-in slide-in-from-bottom-8 duration-700">
            <Button
              variant="gradient"
              className="gap-2 px-8 h-12 rounded-xl shadow-lg hover:shadow-xl transition-all font-bold tracking-tight"
              onClick={() => router.push(`/chat/${reportId}`)}
            >
              <i className="fas fa-brain text-sm" />
              进入深度问答模式
            </Button>
            <div className="w-px h-6 bg-border/50 mx-1"></div>
            <Button variant="outline" className="gap-2 px-5 h-12 rounded-xl border-border/60 hover:bg-muted font-bold bg-background/50 hover:scale-[1.02] active:scale-95 transition-all">
              <i className="fas fa-file-pdf text-red-500" />
              导出 PDF
            </Button>
            <Button variant="outline" className="gap-2 px-5 h-12 rounded-xl border-border/60 hover:bg-muted font-bold bg-background/50 hover:scale-[1.02] active:scale-95 transition-all">
              <i className="fas fa-file-word text-blue-500" />
              导出 Word
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
