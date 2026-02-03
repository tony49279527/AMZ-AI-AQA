"use client"

import { useEffect, useState } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import type { Report, SystemStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

type TabId = "all" | "mine" | "featured"
type ViewMode = "grid" | "list"
type SortOption = "recent" | "oldest" | "name-asc" | "name-desc"

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "最近更新" },
  { value: "oldest", label: "最早创建" },
  { value: "name-asc", label: "按名称 A-Z" },
  { value: "name-desc", label: "按名称 Z-A" },
]

// 精选报告占位图/色块 - 蓝/灰/青/紫，紫色更明显
const featuredThumbs = [
  "linear-gradient(135deg, #4f8cff 0%, #7ba8ff 100%)",
  "linear-gradient(135deg, #5b6b7a 0%, #7d8f9e 100%)",
  "linear-gradient(135deg, #4a9b8e 0%, #6bb8ad 100%)",
  "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
]

function formatReportDate(d: Date) {
  const date = new Date(d)
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const day = date.getDate()
  return `${y}年${m}月${day}日`
}

function getChapterCount(report: Report) {
  return report.chapters?.length ?? 0
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabId>("all")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [sortBy, setSortBy] = useState<SortOption>("recent")

  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    backendConnected: true,
    langGraphStatus: "online",
    agents: [
      { id: "1", name: "Market Analysis", status: "idle" },
      { id: "2", name: "Competitor Analysis", status: "idle" },
      { id: "3", name: "Product Features", status: "idle" },
      { id: "4", name: "Pricing Strategy", status: "idle" },
      { id: "5", name: "Customer Insights", status: "idle" },
      { id: "6", name: "SWOT Analysis", status: "idle" },
      { id: "7", name: "Growth Opportunities", status: "idle" },
      { id: "8", name: "Risk Assessment", status: "idle" },
      { id: "9", name: "Recommendations", status: "idle" },
      { id: "10", name: "Executive Summary", status: "idle" },
      { id: "11", name: "Data Synthesis", status: "idle" },
    ],
    lastUpdated: new Date(),
  })

  const [recentReports, setRecentReports] = useState<Report[]>([
    {
      id: "1",
      title: "特斯拉 vs 蔚来竞品分析报告",
      status: "completed",
      progress: 100,
      createdAt: new Date(Date.now() - 3600000),
      updatedAt: new Date(Date.now() - 3600000),
      chapters: [],
    },
    {
      id: "2",
      title: "iPhone 15 Pro vs 华为 Mate 60 对比",
      status: "completed",
      progress: 100,
      createdAt: new Date(Date.now() - 7200000),
      updatedAt: new Date(Date.now() - 7200000),
      chapters: [],
    },
    {
      id: "3",
      title: "抖音 vs 快手市场分析",
      status: "processing",
      progress: 65,
      createdAt: new Date(Date.now() - 1800000),
      updatedAt: new Date(Date.now() - 300000),
      chapters: [],
    },
    {
      id: "4",
      title: "智能手表品类市场机会分析",
      status: "completed",
      progress: 100,
      createdAt: new Date(Date.now() - 86400000 * 2),
      updatedAt: new Date(Date.now() - 86400000 * 2),
      chapters: [],
    },
    {
      id: "5",
      title: "家用清洁电器竞品对比",
      status: "completed",
      progress: 100,
      createdAt: new Date(Date.now() - 86400000 * 5),
      updatedAt: new Date(Date.now() - 86400000 * 5),
      chapters: [],
    },
  ])

  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStatus((prev) => ({ ...prev, lastUpdated: new Date() }))
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const tabs: { id: TabId; label: string }[] = [
    { id: "all", label: "全部" },
    { id: "mine", label: "我的报告" },
    { id: "featured", label: "精选报告" },
  ]

  const filteredReports =
    activeTab === "mine"
      ? (user ? recentReports : [])
      : activeTab === "featured"
        ? recentReports.slice(0, 4)
        : recentReports

  const featuredReports = recentReports.slice(0, 4)
  const sortedReports = [...filteredReports].sort((a, b) => {
    switch (sortBy) {
      case "recent":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case "name-asc":
        return a.title.localeCompare(b.title, "zh-CN")
      case "name-desc":
        return b.title.localeCompare(a.title, "zh-CN")
      default:
        return 0
    }
  })

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-20 pb-12">
        <div className="max-w-6xl mx-auto px-6">
          {/* 筛选与操作栏 - NotebookLM 风格 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/50 w-fit">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-1.5 rounded-md transition-colors text-sm",
                    viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="网格"
                >
                  <i className="fas fa-th-large" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-1.5 rounded-md transition-colors text-sm",
                    viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="列表"
                >
                  <i className="fas fa-list" />
                </button>
              </div>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-[130px] h-8 rounded-lg border-border bg-background text-sm">
                  <SelectValue placeholder="排序" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Link href="/report/new">
                <Button variant="gradient" size="default" className="gap-1.5 rounded-lg px-4 h-9">
                  <i className="fas fa-plus text-xs" />
                  新建报告
                </Button>
              </Link>
            </div>
          </div>

          {/* 精选报告 - 横向滚动，卡片统一淡色风格 */}
          <section className="mb-10">
            <div className="flex items-end justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">精选报告</h2>
              <Link
                href="/reports"
                className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
              >
                查看全部
                <i className="fas fa-chevron-right text-xs" />
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 scrollbar-hide">
              {featuredReports.map((report, i) => (
                <Link
                  key={report.id}
                  href={`/report/${report.id}`}
                  className="flex-shrink-0 w-[260px] min-h-[220px] flex flex-col overflow-hidden group card-report"
                >
                  <div
                    className="h-24 w-full flex-shrink-0 rounded-t-[var(--radius-lg)]"
                    style={{ background: featuredThumbs[i % featuredThumbs.length] }}
                  />
                  <div className="p-4 flex-1 flex flex-col min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                          i === 3 ? "bg-purple/20" : "bg-primary/15"
                        )}
                      >
                        <i
                          className={cn(
                            "fas fa-file-lines text-[10px]",
                            i === 3 ? "text-purple" : "text-primary"
                          )}
                        />
                      </div>
                      <span
                        className={cn(
                          "text-xs truncate",
                          i === 3 ? "text-purple font-medium" : "text-muted-foreground"
                        )}
                      >
                        竞品分析
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors flex-1">
                      {report.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 flex-shrink-0">
                      {formatReportDate(report.updatedAt)} · {getChapterCount(report) || 11} 章节
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* 我的报告 - 网格/列表，卡片统一淡色风格 */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">我的报告</h2>

            {sortedReports.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-[hsl(var(--muted))]/40 py-16 text-center">
                <p className="text-muted-foreground mb-2">
                  {activeTab === "mine" && !user
                    ? "请先登录后查看「我的报告」"
                    : "暂无报告"}
                </p>
                {activeTab !== "all" && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("all")}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    查看全部
                  </button>
                )}
                {activeTab === "all" && (
                  <Link href="/report/new" className="inline-block mt-2">
                    <Button variant="gradient" size="sm" className="rounded-lg gap-1.5">
                      <i className="fas fa-plus text-xs" />
                      新建报告
                    </Button>
                  </Link>
                )}
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
                {/* 首卡：新建报告 - 与报告卡同壳同高 */}
                <Link href="/report/new" className="min-h-[220px] flex">
                  <div className="w-full min-h-[220px] flex flex-col items-center justify-center gap-2 cursor-pointer card-report border-dashed">
                    <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center group-hover:bg-primary/25 transition-colors">
                      <i className="fas fa-plus text-xl text-primary" />
                    </div>
                    <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                      新建报告
                    </span>
                  </div>
                </Link>

                {sortedReports.map((report, i) => {
                  const icons = ["fa-chart-line", "fa-mobile-screen", "fa-video", "fa-wrench", "fa-handshake"]
                  const icon = icons[i % icons.length]
                  const usePurple = i === 2 || i === 4
                  return (
                    <div
                      key={report.id}
                      className="min-h-[220px] flex flex-col overflow-hidden group card-report"
                    >
                      {/* 与精选报告一致的顶部色条，仅用细条区分 */}
                      <div
                        className="h-1.5 w-full flex-shrink-0"
                        style={{ background: featuredThumbs[i % featuredThumbs.length] }}
                      />
                      <Link href={`/report/${report.id}`} className="flex-1 flex flex-col p-4 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div
                            className={cn(
                              "w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0",
                              usePurple ? "bg-purple/15 border-purple/30" : "bg-secondary border-border"
                            )}
                          >
                            <i
                              className={cn("fas text-sm", icon, usePurple ? "text-purple" : "text-primary")}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                            }}
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary flex-shrink-0"
                          >
                            <i className="fas fa-ellipsis-v text-xs" />
                          </button>
                        </div>
                        <h3 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors flex-1">
                          {report.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1.5 flex-shrink-0">
                          {formatReportDate(report.updatedAt)} · {getChapterCount(report) || 11} 章节
                        </p>
                        {report.status === "processing" && (
                          <div className="mt-2 flex-shrink-0">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>生成中</span>
                              <span>{report.progress}%</span>
                            </div>
                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${report.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </Link>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-2">
                <Link href="/report/new" className="flex items-center gap-3 p-4 rounded-xl card-report border-dashed">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-plus text-lg text-primary" />
                  </div>
                  <span className="font-medium text-sm text-foreground">新建报告</span>
                </Link>
                {sortedReports.map((report, i) => (
                  <Link key={report.id} href={`/report/${report.id}`}>
                    <div className="flex items-center gap-3 p-4 rounded-xl card-report">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border border-border",
                          i === 2 || i === 4 ? "bg-purple/15" : "bg-primary/15"
                        )}
                      >
                        <i className={cn("fas fa-file-lines text-sm", i === 2 || i === 4 ? "text-purple" : "text-primary")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-foreground truncate">{report.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatReportDate(report.updatedAt)} · {getChapterCount(report) || 11} 章节
                        </p>
                      </div>
                      {report.status === "completed" && (
                        <span className="px-2.5 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium flex-shrink-0">
                          已完成
                        </span>
                      )}
                      {report.status === "processing" && (
                        <span className="px-2.5 py-1 rounded-full bg-chart-2/20 text-chart-2 text-xs font-medium flex items-center gap-1 flex-shrink-0">
                          <i className="fas fa-spinner fa-spin" />
                          {report.progress}%
                        </span>
                      )}
                      <i className="fas fa-chevron-right text-muted-foreground text-xs flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
