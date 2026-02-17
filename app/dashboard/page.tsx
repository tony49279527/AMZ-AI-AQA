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
import type { Report } from "@/lib/types"
import { cn } from "@/lib/utils"
import { buildClientApiHeaders } from "@/lib/client-api"
import { buildClientApiError, formatClientErrorMessage } from "@/lib/client-api-error"

type TabId = "all" | "mine" | "featured"
type ViewMode = "grid" | "list"
type SortOption = "recent" | "oldest" | "name-asc" | "name-desc"
type ReportStatus = "active" | "archived"

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "最近更新" },
  { value: "oldest", label: "最早创建" },
  { value: "name-asc", label: "按名称 A-Z" },
  { value: "name-desc", label: "按名称 Z-A" },
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
  const [loadError, setLoadError] = useState("")

  // 从 API 加载真实报告列表
  useEffect(() => {
    async function loadReports() {
      try {
        const response = await fetch("/api/reports", {
          headers: buildClientApiHeaders(),
        })
        if (!response.ok) {
          throw await buildClientApiError(response, `加载报告失败 (HTTP ${response.status})`)
        }

        const data = await response.json()
        setRecentReports(
          data.reports.map((r: Record<string, unknown>) => ({
            ...r,
            createdAt: new Date(r.createdAt as string),
            updatedAt: new Date(r.updatedAt as string),
            archivedStatus: (r.status || "active") as ReportStatus,
          }))
        )
      } catch (error) {
        console.error("Failed to load reports:", error)
        setLoadError(formatClientErrorMessage(error, "加载报告失败，请稍后重试"))
      } finally {
        setIsLoading(false)
      }
    }
    loadReports()
  }, [])

  // 存档报告
  const archiveReport = async (reportId: string, action: "archive" | "restore") => {
    try {
      const response = await fetch(`/api/report-meta/${reportId}`, {
        method: "DELETE",
        headers: buildClientApiHeaders(),
        body: JSON.stringify({ action }),
      })

      if (!response.ok) {
        throw await buildClientApiError(response, `操作失败 (HTTP ${response.status})`)
      }

      // 刷新报告列表
      setRecentReports(prev => prev.map(r =>
        r.id === reportId
          ? { ...r, archivedStatus: action === "archive" ? "archived" : "active" }
          : r
      ))
    } catch (error) {
      console.error("Failed to update report status:", error)
      alert(formatClientErrorMessage(error, "操作失败，请稍后重试"))
    }
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "all", label: "全部" },
    { id: "mine", label: "我的报告" },
    { id: "featured", label: "精选报告" },
  ]

  const filteredReports =
    activeTab === "mine"
      ? recentReports.filter(r => r.source === "user-generated" && r.archivedStatus !== "archived")
      : activeTab === "featured"
        ? recentReports.filter(r => r.source === "featured" && r.archivedStatus !== "archived")
        : recentReports.filter(r => r.archivedStatus !== "archived")

  // 分离精选和普通报告，用于“全部”标签页的展示
  const featuredOnly = recentReports.filter(r => r.source === "featured" && r.archivedStatus !== "archived")
  const userOnly = recentReports.filter(r => r.source === "user-generated" && r.archivedStatus !== "archived")

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
  const renderReportCard = (report: Report, showBadge: boolean = false) => {
    const isArchived = report.archivedStatus === "archived"

    return (
      <div key={report.id} className="group relative">
        <Link href={`/report/${report.id}`}>
          <div className={cn(
            "h-[220px] flex flex-col rounded-2xl border transition-all duration-300 p-5 group-hover:-translate-y-1",
            isArchived ? "opacity-60 bg-slate-50" : reportTheme.bg,
            reportTheme.border,
            reportTheme.hoverBorder,
            reportTheme.hoverShadow
          )}>
            <div className="flex items-center justify-between mb-4">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors group-hover:bg-blue-100", reportTheme.iconBg)}>
                <i className={cn("fas fa-file-lines text-lg transition-colors", reportTheme.iconText)} />
              </div>
              {isArchived && (
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200">
                  已存档
                </span>
              )}
              {showBadge && !isArchived && (
                <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold border border-blue-100">
                  精选
                </span>
              )}
              {!showBadge && !isArchived && report.status === "processing" && (
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

        {/* 悬停时显示的操作按钮 */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.preventDefault()
              archiveReport(report.id, isArchived ? "restore" : "archive")
            }}
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 flex items-center justify-center transition-all shadow-sm"
            title={isArchived ? "恢复报告" : "存档报告"}
          >
            <i className={cn(
              "text-xs transition-colors",
              isArchived ? "fas fa-undo text-slate-500" : "fas fa-archive text-slate-500 hover:text-red-600"
            )} />
          </button>
        </div>
      </div>
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
          {loadError && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {loadError}
            </div>
          )}

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

          {/* 精选报告区块 */}
          {!isLoading && (activeTab === "all" || activeTab === "featured") && (
            <section className={cn(activeTab === "all" ? "mb-12" : "mb-0")}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2">
                    <span className="w-1 h-6 bg-blue-600 rounded-full inline-block"></span>
                    精选报告案例
                    {activeTab === "featured" && (
                      <span className="ml-1 text-sm text-slate-400 font-normal bg-slate-100 px-2 py-0.5 rounded-full">{featuredOnly.length}</span>
                    )}
                  </h2>
                  <p className="text-sm text-slate-500 ml-3">
                    {activeTab === "featured" ? "系统为您推荐的深度市场分析案例" : "查看优质案例，了解AI报告生成的强大能力"}
                  </p>
                </div>
                {activeTab === "all" && featuredOnly.length > 4 && (
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

              <div className={cn(
                "grid gap-6",
                viewMode === "grid"
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "grid-cols-1"
              )}>
                {(activeTab === "featured" ? featuredOnly : featuredOnly.slice(0, 4)).map((report) => (
                  renderReportCard(report, true)
                ))}
              </div>

              {activeTab === "featured" && featuredOnly.length === 0 && (
                <div className="py-24 text-center rounded-3xl border-2 border-dashed border-slate-200 bg-white/50">
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-folder-open text-slate-300 text-3xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-slate-600">暂无精选报告</h3>
                </div>
              )}
            </section>
          )}

          {/* 我的报告区块 */}
          {!isLoading && (activeTab === "all" || activeTab === "mine") && (
            <section className={cn(activeTab === "all" && featuredOnly.length > 0 ? "mt-12" : "mt-0")}>
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-slate-400 rounded-full inline-block"></span>
                我的报告
                <span className="ml-1 text-sm text-slate-400 font-normal bg-slate-100 px-2 py-0.5 rounded-full">{userOnly.length}</span>
              </h2>

              {userOnly.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 py-20 text-center hover:bg-white hover:border-blue-200 transition-all duration-500 group">
                  <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm">
                    <i className="fas fa-rocket text-3xl text-blue-500/80 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">
                    {activeTab === "mine" ? "开启您的第一次分析" : "暂无生成报告"}
                  </h3>
                  <p className="text-slate-500 mb-8 max-w-md mx-auto text-sm leading-relaxed">
                    {activeTab === "mine"
                      ? "输入 ASIN，让 AI 为您生成深度竞品分析报告，发现市场机会。"
                      : "通过上方导航栏的分析工具，您可以快速生成属于自己的深度报告。"}
                  </p>

                  <Link href="/report/new" className="inline-block relative z-10">
                    <Button variant="gradient" size="default" className="rounded-full px-8 h-12 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 border-none text-white">
                      <i className="fas fa-plus mr-2 text-sm" />
                      立即创建报告
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className={cn(
                  "grid gap-6",
                  viewMode === "grid"
                    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    : "grid-cols-1"
                )}>
                  {/* 新建报告按钮 (Grid) */}
                  {activeTab !== "all" && (
                    <Link href="/report/new" className="group">
                      <div className="h-[220px] flex flex-col items-center justify-center gap-4 rounded-2xl bg-white border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md group-hover:-translate-y-1">
                        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 group-hover:scale-110 transition-all duration-300 shadow-sm border border-blue-100">
                          <i className="fas fa-plus text-2xl text-blue-600" />
                        </div>
                        <div className="text-center">
                          <span className="block font-semibold text-slate-800 text-lg">新建分析报告</span>
                          <span className="text-xs text-slate-500">发现更多市场商机</span>
                        </div>
                      </div>
                    </Link>
                  )}
                  {/* 用户报告列表 */}
                  {userOnly.map((report) => renderReportCard(report))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
