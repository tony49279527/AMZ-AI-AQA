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

// 统一的报告图标样式 (Professional Blue/Slate Theme)
const reportTheme = {
  bg: "bg-white",
  border: "border-slate-200",
  iconBg: "bg-blue-50",
  iconText: "text-blue-600",
  activeBorder: "border-blue-200",
  hoverBorder: "hover:border-blue-400",
  hoverShadow: "hover:shadow-md",
}

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
  const [activeTab, setActiveTab] = useState<TabId>("all")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [sortBy, setSortBy] = useState<SortOption>("recent")
  const [isLoading, setIsLoading] = useState(true)

  const [recentReports, setRecentReports] = useState<Report[]>([])

  // 从 API 加载真实报告列表
  useEffect(() => {
    async function loadReports() {
      try {
        const response = await fetch("/api/reports")
        if (response.ok) {
          const data = await response.json()
          setRecentReports(
            data.reports.map((r: Record<string, unknown>) => ({
              ...r,
              createdAt: new Date(r.createdAt as string),
              updatedAt: new Date(r.updatedAt as string),
            }))
          )
        }
      } catch (error) {
        console.error("Failed to load reports:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadReports()
  }, [])

  const tabs: { id: TabId; label: string }[] = [
    { id: "all", label: "全部" },
    { id: "mine", label: "我的报告" },
    { id: "featured", label: "精选报告" },
  ]

  const filteredReports =
    activeTab === "mine"
      ? recentReports
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
    return (
      <Link key={report.id} href={`/report/${report.id}`} className="group">
        <div className={cn(
          "h-[220px] flex flex-col rounded-2xl border transition-all duration-300 p-5 group-hover:-translate-y-1",
          reportTheme.bg,
          reportTheme.border,
          reportTheme.hoverBorder,
          reportTheme.hoverShadow
        )}>
          <div className="flex items-center justify-between mb-4">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors group-hover:bg-blue-100", reportTheme.iconBg)}>
              <i className={cn("fas fa-file-lines text-lg transition-colors", reportTheme.iconText)} />
            </div>
            {showBadge && (
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold border border-blue-100">
                精选
              </span>
            )}
            {!showBadge && report.status === "processing" && (
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                {report.progress}%
              </span>
            )}
          </div>

          <h3 className="font-semibold text-base leading-snug text-slate-800 line-clamp-2 group-hover:text-blue-600 transition-colors mb-auto">
            {report.title}
          </h3>

          <div className="flex-shrink-0 pt-4 border-t border-slate-50 mt-4">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <i className="far fa-clock" />
                <span>{formatReportDate(report.updatedAt)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <i className="fas fa-list-ul" />
                <span>{getChapterCount(report)} 章节</span>
              </div>

              {report.status === "processing" && (
                <div className="ml-auto w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${report.progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Navigation />

      <main className="pt-24 pb-16">
        <div className="max-w-[1280px] mx-auto px-6">
          {/* 筛选与操作栏 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-slate-200 shadow-sm w-fit">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    activeTab === tab.id
                      ? "bg-slate-100 text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* 视图切换 */}
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 h-10 shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "px-3 h-full rounded-lg transition-all text-sm flex items-center gap-2",
                    viewMode === "grid"
                      ? "bg-slate-100 text-blue-600 shadow-sm font-medium"
                      : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                  )}
                  title="网格"
                >
                  <i className="fas fa-th-large" />
                </button>
                <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "px-3 h-full rounded-lg transition-all text-sm flex items-center gap-2",
                    viewMode === "list"
                      ? "bg-slate-100 text-blue-600 shadow-sm font-medium"
                      : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                  )}
                  title="列表"
                >
                  <i className="fas fa-list" />
                </button>
              </div>

              {/* 排序选择 */}
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-[140px] h-10 rounded-xl border-slate-200 bg-white text-slate-600 text-sm shadow-sm hover:border-slate-300 focus:ring-2 focus:ring-blue-100 transition-all">
                  <SelectValue placeholder="排序" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-sm text-slate-600">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 新建报告按钮 */}
              <Link href="/report/new">
                <Button variant="gradient" className="gap-2 px-6 h-10 rounded-xl shadow-md hover:shadow-lg hover:shadow-blue-500/20 transition-all font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 border-none text-white">
                  <i className="fas fa-plus text-xs" />
                  新建报告
                </Button>
              </Link>
            </div>
          </div>

          {/* 加载中骨架屏 */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-[220px] rounded-2xl border border-slate-200 bg-white p-5 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 mb-4" />
                  <div className="h-4 bg-slate-100 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-slate-100 rounded w-1/2 mb-auto" />
                  <div className="h-3 bg-slate-50 rounded w-1/3 mt-12" />
                </div>
              ))}
            </div>
          )}

          {/* 精选报告 - 新用户展示案例 */}
          {!isLoading && (activeTab === "all" || activeTab === "featured") && (
            <section className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2">
                    <span className="w-1 h-6 bg-blue-600 rounded-full inline-block"></span>
                    精选报告
                  </h2>
                  <p className="text-sm text-slate-500 ml-3">
                    查看优质案例，了解AI报告生成的强大能力
                  </p>
                </div>
                {activeTab === "all" && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("featured")}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-50"
                  >
                    查看全部精选
                    <i className="fas fa-arrow-right text-xs" />
                  </button>
                )}
              </div>

              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {recentReports.slice(0, 4).map((report, i) => renderReportCard(report, i, true))}
                </div>
              ) : (
                <div className="space-y-3">
                  {recentReports.slice(0, 4).map((report, i) => {
                    return (
                      <Link key={report.id} href={`/report/${report.id}`} className="block group">
                        <div className="flex items-center gap-5 p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 group-hover:bg-blue-50/10">
                          {/* Icon */}
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-blue-100", reportTheme.iconBg)}>
                            <i className={cn("fas fa-file-lines", reportTheme.iconText)} />
                          </div>

                          {/* Title & Info */}
                          <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-12 md:col-span-6">
                              <h3 className="font-semibold text-sm text-slate-800 truncate group-hover:text-blue-600 transition-colors flex items-center gap-2">
                                {report.title}
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-600 uppercase tracking-wide">精选</span>
                              </h3>
                            </div>
                            <div className="col-span-6 md:col-span-3 text-xs text-slate-400 flex items-center gap-2">
                              <i className="far fa-clock"></i>
                              {formatReportDate(report.updatedAt)}
                            </div>
                            <div className="col-span-6 md:col-span-3 text-xs text-slate-400 flex items-center gap-2">
                              <i className="fas fa-list-ul"></i>
                              {getChapterCount(report)} 个章节
                            </div>
                          </div>

                          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 group-hover:bg-blue-100 transition-colors">
                            <i className="fas fa-chevron-right text-slate-300 group-hover:text-blue-500 text-xs transition-colors" />
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {/* 我的报告 */}
          {!isLoading && activeTab !== "featured" && (
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-slate-400 rounded-full inline-block"></span>
                {activeTab === "mine" ? "我的报告" : "我的报告"}
                <span className="ml-1 text-sm text-slate-400 font-normal bg-slate-100 px-2 py-0.5 rounded-full">{sortedReports.length}</span>
              </h2>

              {sortedReports.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-24 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-inbox text-3xl text-slate-300" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-1">暂无报告</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    {activeTab === "mine" ? "你还没有创建过任何报告" : "列表为空"}
                  </p>
                  {activeTab !== "all" && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("all")}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors underline decoration-blue-200 decoration-2 underline-offset-4 hover:decoration-blue-400"
                    >
                      查看全部报告
                    </button>
                  )}
                  {activeTab === "all" && (
                    <Link href="/report/new" className="inline-block">
                      <Button variant="gradient" className="gap-2 px-6 h-10 rounded-xl shadow-md hover:shadow-lg transition-all font-medium bg-blue-600 text-white hover:bg-blue-700">
                        <i className="fas fa-plus text-xs" />
                        新建第一份报告
                      </Button>
                    </Link>
                  )}
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {/* 新建报告卡片 (Grid) - Refined Style */}
                  <Link href="/report/new" className="group">
                    <div className="h-[220px] flex flex-col items-center justify-center gap-4 rounded-2xl bg-white border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md group-hover:-translate-y-1">
                      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 group-hover:scale-110 transition-all duration-300 shadow-sm border border-blue-100">
                        <i className="fas fa-plus text-2xl text-blue-500 group-hover:text-blue-600" />
                      </div>
                      <div className="text-center">
                        <span className="block font-bold text-lg text-slate-700 group-hover:text-blue-700 transition-colors">
                          新建报告
                        </span>
                        <span className="text-xs text-slate-400 mt-1 block group-hover:text-blue-400">开始新的竞品分析</span>
                      </div>
                    </div>
                  </Link>

                  {/* 报告卡片 (Grid) */}
                  {sortedReports.map((report, i) => renderReportCard(report, i, false))}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* 新建报告行 (List) - Refined Style */}
                  <Link href="/report/new" className="block group">
                    <div className="flex items-center gap-5 p-4 rounded-xl bg-white border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-200 cursor-pointer">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 border border-blue-100 transition-colors">
                        <i className="fas fa-plus text-blue-500 group-hover:text-blue-600" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-700 group-hover:text-blue-700 transition-colors block">
                          新建报告
                        </span>
                        <span className="text-xs text-slate-400 group-hover:text-blue-400">点击开始分析</span>
                      </div>
                    </div>
                  </Link>

                  {/* 报告列表项 (List) */}
                  {sortedReports.map((report, i) => {
                    return (
                      <Link key={report.id} href={`/report/${report.id}`} className="block group">
                        <div className="flex items-center gap-5 p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 group-hover:bg-blue-50/10">
                          {/* Icon */}
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-blue-100", reportTheme.iconBg)}>
                            <i className={cn("fas fa-file-alt", reportTheme.iconText)} />
                          </div>

                          {/* Title & Info */}
                          <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-12 md:col-span-6">
                              <h3 className="font-semibold text-sm text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                                {report.title}
                              </h3>
                            </div>
                            <div className="col-span-6 md:col-span-3 text-xs text-slate-400 flex items-center gap-2">
                              <i className="far fa-clock"></i>
                              {formatReportDate(report.updatedAt)}
                            </div>
                            <div className="col-span-6 md:col-span-3 text-xs text-slate-400 flex items-center gap-2">
                              <i className="fas fa-list-ul"></i>
                              {getChapterCount(report)} 个章节
                            </div>
                          </div>

                          {/* Status */}
                          <div className="flex-shrink-0 ml-4">
                            {report.status === "completed" ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-600 border border-green-200/50">
                                <i className="fas fa-check-circle mr-1.5 text-[10px]"></i>
                                已完成
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200/50">
                                <i className="fas fa-spinner fa-spin mr-1.5 text-[10px]"></i>
                                {report.progress}%
                              </span>
                            )}
                          </div>

                          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 group-hover:bg-blue-100 transition-colors">
                            <i className="fas fa-chevron-right text-slate-300 group-hover:text-blue-500 text-xs transition-colors" />
                          </div>
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
