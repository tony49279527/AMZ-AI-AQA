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

// 报告图标集合
const reportIcons = [
  "fa-chart-line",
  "fa-mobile-screen-button",
  "fa-comments",
  "fa-lightbulb",
  "fa-rocket",
]

// 为报告分配极浅的背景颜色主题 (NotebookLM 风格)
const reportColors = [
  { bg: "bg-[#f1f5f9]", border: "border-slate-200", text: "text-slate-600" }, // Slate
  { bg: "bg-[#f0f9ff]", border: "border-blue-100", text: "text-blue-600" },   // Blue
  { bg: "bg-[#f5f3ff]", border: "border-purple-100", text: "text-purple-600" }, // Purple
  { bg: "bg-[#f0fdf4]", border: "border-green-100", text: "text-green-600" },  // Green
  { bg: "bg-[#fffbeb]", border: "border-amber-100", text: "text-amber-600" },  // Amber
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

  // 渲染统一的报告卡片
  const renderReportCard = (report: Report, index: number, showBadge: boolean = false) => {
    const colorTheme = reportColors[index % reportColors.length]

    return (
      <Link key={report.id} href={`/report/${report.id}`} className="group">
        <div className={cn(
          "h-[240px] flex flex-col rounded-2xl border transition-all duration-200 p-5 hover:shadow-lg hover:border-primary/20",
          colorTheme.bg,
          colorTheme.border
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className={cn("w-10 h-10 rounded-xl bg-white/80 border shadow-sm flex items-center justify-center", colorTheme.border)}>
              <i className={cn("fas fa-file-lines text-lg", colorTheme.text)} />
            </div>
            {showBadge && (
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                精选
              </span>
            )}
            {!showBadge && report.status === "processing" && (
              <span className="px-2.5 py-1 rounded-full bg-chart-2/10 text-chart-2 text-xs font-medium">
                {report.progress}%
              </span>
            )}
          </div>

          <h3 className="font-semibold text-base leading-snug text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-3 flex-1">
            {report.title}
          </h3>

          <div className="flex-shrink-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              {!showBadge && (
                <>
                  <i className="fas fa-clock" />
                  <span>{formatReportDate(report.updatedAt)}</span>
                  <span>·</span>
                </>
              )}
              <i className="fas fa-file-lines" />
              <span>{getChapterCount(report) || 11} 章节</span>
            </div>

            {report.status === "processing" && (
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-purple rounded-full transition-all duration-500"
                  style={{ width: `${report.progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-20 pb-16">
        <div className="max-w-[1280px] mx-auto px-6">
          {/* 筛选与操作栏 */}
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

            <div className="flex items-center gap-3 flex-wrap">
              {/* 视图切换 - 更加精致的分割控制 */}
              <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/30 p-1 h-10">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "px-3 h-full rounded-lg transition-all text-sm flex items-center gap-2",
                    viewMode === "grid"
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="网格"
                >
                  <i className="fas fa-th-large" />
                  <span className="hidden sm:inline">网格</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "px-3 h-full rounded-lg transition-all text-sm flex items-center gap-2",
                    viewMode === "list"
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="列表"
                >
                  <i className="fas fa-list" />
                  <span className="hidden sm:inline">列表</span>
                </button>
              </div>

              {/* 排序选择 - 统一高度和圆角 */}
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-[140px] h-10 rounded-xl border-border bg-background text-sm focus:ring-1 focus:ring-primary/20">
                  <SelectValue placeholder="排序" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border shadow-lg">
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-sm">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 新建报告按钮 - 更加醒目且和谐 */}
              <Link href="/report/new">
                <Button variant="gradient" className="gap-2 px-5 h-10 rounded-xl shadow-md hover:shadow-lg transition-all font-medium">
                  <i className="fas fa-plus text-xs" />
                  新建报告
                </Button>
              </Link>
            </div>
          </div>

          {/* 精选报告 - 新用户展示案例 */}
          {(activeTab === "all" || activeTab === "featured") && (
            <section className="mb-10">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-1">
                    精选报告
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    查看优质案例，了解AI报告生成的强大能力
                  </p>
                </div>
                {activeTab === "all" && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("featured")}
                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5"
                  >
                    查看全部精选
                    <i className="fas fa-arrow-right text-xs" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {recentReports.slice(0, 4).map((report, i) => renderReportCard(report, i, true))}
              </div>
            </section>
          )}

          {/* 我的报告 - 统一网格布局 */}
          {activeTab !== "featured" && (
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-4">
                {activeTab === "mine" ? "我的报告" : "我的报告"}
                <span className="ml-2 text-xs text-muted-foreground font-normal">({sortedReports.length})</span>
              </h2>

              {sortedReports.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-20 text-center">
                  <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-3">
                    <i className="fas fa-inbox text-2xl text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {activeTab === "mine" && !user ? "请先登录后查看「我的报告」" : "暂无报告"}
                  </p>
                  {activeTab !== "all" && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("all")}
                      className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      查看全部报告
                    </button>
                  )}
                  {activeTab === "all" && (
                    <Link href="/report/new" className="inline-block">
                      <Button variant="gradient" size="sm" className="gap-1.5">
                        <i className="fas fa-plus text-xs" />
                        新建报告
                      </Button>
                    </Link>
                  )}
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {/* 新建报告卡片 */}
                  <Link href="/report/new" className="group">
                    <div className="h-[240px] flex flex-col items-center justify-center gap-3 rounded-2xl bg-card border border-dashed border-border hover:border-primary/30 hover:bg-secondary/30 transition-all duration-200">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <i className="fas fa-plus text-xl text-primary" />
                      </div>
                      <span className="font-semibold text-base text-foreground group-hover:text-primary transition-colors">
                        新建报告
                      </span>
                    </div>
                  </Link>

                  {/* 报告卡片 - 与精选报告完全一致 */}
                  {sortedReports.map((report, i) => renderReportCard(report, i, false))}
                </div>
              ) : (
                <div className="space-y-2">
                  <Link href="/report/new" className="block group">
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-dashed border-border hover:border-primary/30 hover:bg-secondary/30 transition-all duration-200">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                        <i className="fas fa-plus text-lg text-primary" />
                      </div>
                      <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">新建报告</span>
                    </div>
                  </Link>
                  {sortedReports.map((report, i) => {
                    const colorTheme = reportColors[i % reportColors.length]
                    return (
                      <Link key={report.id} href={`/report/${report.id}`} className="block group">
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:shadow-md transition-shadow duration-200">
                          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border", colorTheme.bg, colorTheme.border)}>
                            <i className={cn("fas fa-file-alt text-base", colorTheme.text)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                              {report.title}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatReportDate(report.updatedAt)} · {getChapterCount(report) || 11} 个章节
                            </p>
                          </div>
                          {report.status === "completed" && (
                            <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium flex-shrink-0">
                              已完成
                            </span>
                          )}
                          {report.status === "processing" && (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="px-3 py-1.5 rounded-full bg-chart-2/10 text-chart-2 text-xs font-medium flex items-center gap-1.5">
                                <i className="fas fa-spinner fa-spin" />
                                {report.progress}%
                              </span>
                            </div>
                          )}
                          <i className="fas fa-chevron-right text-muted-foreground text-xs flex-shrink-0" />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
