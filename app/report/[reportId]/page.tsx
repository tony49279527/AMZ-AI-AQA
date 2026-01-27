"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useParams, useRouter } from "next/navigation"

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
        "# 竞品分析\n\n## 特斯拉 Model 3 vs 蔚来 ET5\n\n两款车型均定位于中高端纯电动轿车市场，但在品牌定位、技术路线和市场策略上存在显著差异。\n\n### 产品对比\n\n**特斯拉 Model 3**\n- 续航里程: 556-713km\n- 加速性能: 3.3-6.1s (0-100km/h)\n- 智能驾驶: Autopilot/FSD\n- 价格区间: ¥231,900-331,900\n\n**蔚来 ET5**\n- 续航里程: 560-1000km\n- 加速性能: 4.3s (0-100km/h)\n- 智能驾驶: NIO Pilot\n- 价格区间: ¥298,000-376,000",
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
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-6 py-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard")}
              className="gap-2 px-3 hover:bg-primary/20"
            >
              <i className="fas fa-arrow-left"></i>
              返回
            </Button>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4">{report.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>
              <i className="fas fa-calendar mr-2"></i>
              {report.createdAt.toLocaleString("zh-CN")}
            </span>
            <span>
              <i className="fas fa-clock mr-2"></i>
              生成用时 {report.generationTime} 分钟
            </span>
            <span>
              <i className="fas fa-robot mr-2"></i>
              {report.model}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6 bg-card border border-border p-1">
            <TabsTrigger
              value="overview"
              className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <i className="fas fa-chart-pie"></i>
              概览
            </TabsTrigger>
            <TabsTrigger
              value="chapters"
              className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <i className="fas fa-book"></i>
              章节查看器
            </TabsTrigger>
            <TabsTrigger
              value="qa"
              className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <i className="fas fa-comments"></i>
              问答历史
            </TabsTrigger>
            <TabsTrigger
              value="sources"
              className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <i className="fas fa-database"></i>
              数据源
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Stats Cards */}
              <Card className="p-6 bg-card border-border">
                <div className="metric-large text-5xl mb-2">{report.totalChapters}</div>
                <div className="text-lg font-semibold">生成章节</div>
                <div className="text-sm text-muted-foreground">Total Chapters</div>
              </Card>

              <Card className="p-6 bg-card border-border">
                <div className="metric-large text-5xl mb-2">{report.totalWords.toLocaleString()}</div>
                <div className="text-lg font-semibold">总字数</div>
                <div className="text-sm text-muted-foreground">Total Words</div>
              </Card>

              <Card className="p-6 bg-card border-border">
                <div className="metric-large text-5xl mb-2">{report.generationTime}</div>
                <div className="text-lg font-semibold">分钟</div>
                <div className="text-sm text-muted-foreground">Generation Time</div>
              </Card>
            </div>

            {/* Report Info */}
            <Card className="mt-6 p-6 bg-card border-border">
              <h2 className="text-2xl font-bold mb-4">报告信息</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">主品产品</div>
                  <div className="text-lg font-semibold">{report.mainProduct}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-2">竞品产品</div>
                  <div className="text-lg font-semibold">{report.competitor}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-2">使用模型</div>
                  <div className="text-lg font-semibold">{report.model}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-2">报告ID</div>
                  <div className="text-sm font-mono">{report.id}</div>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button size="lg" className="gap-3" onClick={() => router.push(`/chat/${reportId}`)}>
                <i className="fas fa-comments"></i>
                开始智能问答
              </Button>
              <Button size="lg" variant="outline" className="gap-3 bg-transparent">
                <i className="fas fa-file-pdf"></i>
                导出为PDF
              </Button>
              <Button size="lg" variant="outline" className="gap-3 bg-transparent">
                <i className="fas fa-file-word"></i>
                导出为Word
              </Button>
            </div>
          </TabsContent>

          {/* Chapters Tab */}
          <TabsContent value="chapters">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Chapter Navigation */}
              <Card className="p-4 bg-card border-border h-fit">
                <h3 className="font-bold mb-4">章节导航</h3>
                <div className="space-y-2">
                  {chapters.map((chapter) => (
                    <div
                      key={chapter.id}
                      onClick={() => setActiveChapter(chapter.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        activeChapter === chapter.id ? "bg-primary/20 border-l-2 border-primary" : "hover:bg-secondary"
                      }`}
                    >
                      <div className="font-semibold text-sm">{chapter.title}</div>
                      <div className="text-xs text-muted-foreground">{chapter.subtitle}</div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Chapter Content */}
              <Card className="lg:col-span-3 p-8 bg-card border-border">
                {currentChapter && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-3xl font-bold mb-2">{currentChapter.title}</h2>
                        <p className="text-muted-foreground">{currentChapter.subtitle}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                          <i className="fas fa-copy"></i>
                          复制
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                          <i className="fas fa-download"></i>
                          下载
                        </Button>
                      </div>
                    </div>

                    {/* Sub-chapters */}
                    <div className="mb-6">
                      <div className="text-sm font-semibold mb-3 text-muted-foreground">本章节包含:</div>
                      <div className="flex flex-wrap gap-2">
                        {currentChapter.subChapters.map((sub, idx) => (
                          <span key={idx} className="px-3 py-1 bg-secondary rounded-full text-sm">
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="prose prose-invert max-w-none">
                      <div className="whitespace-pre-line text-foreground leading-relaxed">
                        {currentChapter.content}
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between mt-8 pt-6 border-t border-border">
                      <Button
                        variant="outline"
                        disabled={chapters.findIndex((c) => c.id === activeChapter) === 0}
                        onClick={() => {
                          const idx = chapters.findIndex((c) => c.id === activeChapter)
                          if (idx > 0) setActiveChapter(chapters[idx - 1].id)
                        }}
                        className="gap-2 bg-transparent"
                      >
                        <i className="fas fa-arrow-left"></i>
                        上一章
                      </Button>
                      <Button
                        variant="outline"
                        disabled={chapters.findIndex((c) => c.id === activeChapter) === chapters.length - 1}
                        onClick={() => {
                          const idx = chapters.findIndex((c) => c.id === activeChapter)
                          if (idx < chapters.length - 1) setActiveChapter(chapters[idx + 1].id)
                        }}
                        className="gap-2 bg-transparent"
                      >
                        下一章
                        <i className="fas fa-arrow-right"></i>
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* Q&A Tab */}
          <TabsContent value="qa">
            <Card className="p-6 bg-card border-border">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">问答历史</h2>
                  <p className="text-sm text-muted-foreground">与此报告相关的所有问答记录</p>
                </div>
                <Button onClick={() => router.push(`/chat/${reportId}`)} className="gap-2">
                  <i className="fas fa-plus"></i>
                  新建对话
                </Button>
              </div>

              <div className="space-y-6">
                {qaSessions.map((qa, idx) => (
                  <div key={idx} className="p-4 bg-secondary/30 rounded-lg">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-user text-sm text-primary-foreground"></i>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold mb-1">{qa.question}</div>
                        <div className="text-xs text-muted-foreground">{qa.timestamp.toLocaleString("zh-CN")}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 pl-12">
                      <div className="flex-1 p-3 bg-card rounded-lg">
                        <div className="text-sm leading-relaxed">{qa.answer}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Data Sources Tab */}
          <TabsContent value="sources">
            <Card className="p-6 bg-card border-border">
              <h2 className="text-2xl font-bold mb-6">数据来源</h2>

              <div className="space-y-4">
                {dataSources.map((source, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg hover:bg-secondary transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                        <i
                          className={`fas ${
                            source.type === "上传文件"
                              ? "fa-file"
                              : source.type === "YouTube数据"
                                ? "fa-youtube"
                                : "fa-shopping-cart"
                          } text-primary text-xl`}
                        ></i>
                      </div>
                      <div>
                        <div className="font-semibold">{source.name}</div>
                        <div className="text-sm text-muted-foreground">{source.type}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {source.size && <span className="text-sm text-muted-foreground">{source.size}</span>}
                      {source.count && (
                        <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-semibold">
                          {source.count}
                        </span>
                      )}
                      <Button variant="ghost" size="sm" className="hover:bg-primary/20">
                        <i className="fas fa-eye"></i>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
