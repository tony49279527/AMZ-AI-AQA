"use client"

import { useEffect, useState } from "react"
import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import type { Report, SystemStatus } from "@/lib/types"

export default function DashboardPage() {
  const { user } = useAuth()

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
  ])

  const [stats, setStats] = useState({
    totalReports: 24,
    completedToday: 3,
    activeAgents: 2,
    avgGenerationTime: 45,
  })

  // Auto-refresh system status every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStatus((prev) => ({
        ...prev,
        lastUpdated: new Date(),
      }))
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const actionCards = [
    {
      title: "新建报告",
      subtitle: "New Report",
      description: "上传文件开始生成分析报告",
      icon: "fa-plus-circle",
      href: "/report/new",
      gradient: "gradient-tesla-red",
    },
    {
      title: "查看历史",
      subtitle: "History",
      description: "浏览所有已生成的报告",
      icon: "fa-clock-rotate-left",
      href: "/reports",
      gradient: "",
    },
    {
      title: "系统设置",
      subtitle: "Settings",
      description: "配置Agent和LLM参数",
      icon: "fa-gear",
      href: "/settings",
      gradient: "",
    },
    {
      title: "帮助文档",
      subtitle: "Help",
      description: "查看使用指南和API文档",
      icon: "fa-circle-question",
      href: "/help",
      gradient: "",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-6 py-24">
        <section className="mb-12">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              {user && (
                <p className="text-primary mb-2 flex items-center gap-2">
                  <i className="fas fa-user-circle"></i>
                  欢迎回来，{user.name}
                </p>
              )}
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-4 text-balance">
                智能报告
                <br />
                <span className="text-primary">生成系统</span>
              </h1>
              <p className="text-xl text-muted-foreground">Multi-Agent AI Report Generation Platform</p>
            </div>

            {/* Quick Stats - Bento style */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 bg-card border-border">
                <div className="metric-large text-3xl">{stats.totalReports}</div>
                <div className="text-sm text-muted-foreground mt-1">总报告数</div>
                <div className="text-xs text-muted-foreground">Total Reports</div>
              </Card>
              <Card className="p-4 bg-card border-border">
                <div className="metric-large text-3xl">{stats.completedToday}</div>
                <div className="text-sm text-muted-foreground mt-1">今日完成</div>
                <div className="text-xs text-muted-foreground">Today</div>
              </Card>
            </div>
          </div>
        </section>

        {/* Action Cards - Bento Grid */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            快速操作
            <span className="text-lg text-muted-foreground font-normal">Quick Actions</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {actionCards.map((card, index) => (
              <Link key={index} href={card.href}>
                <Card
                  className={`p-6 bg-card border-border hover:border-primary transition-all duration-300 cursor-pointer group h-full ${card.gradient}`}
                >
                  <div className="flex flex-col h-full">
                    <div className="mb-4">
                      <i
                        className={`fas ${card.icon} text-4xl text-primary group-hover:scale-110 transition-transform`}
                      ></i>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-1 group-hover:text-primary transition-colors">
                        {card.title}
                      </h3>
                      <div className="text-xs text-muted-foreground mb-3">{card.subtitle}</div>
                      <p className="text-sm text-muted-foreground">{card.description}</p>
                    </div>
                    <div className="mt-4">
                      <i className="fas fa-arrow-right text-primary opacity-0 group-hover:opacity-100 transition-opacity"></i>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent Activity & System Status - Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Reports - Takes 2 columns */}
          <Card className="lg:col-span-2 p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  最近活动
                  <span className="text-base text-muted-foreground font-normal">Recent Activity</span>
                </h2>
              </div>
              <Link href="/reports">
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  查看全部
                  <i className="fas fa-arrow-right text-xs"></i>
                </Button>
              </Link>
            </div>

            <div className="space-y-4">
              {recentReports.map((report) => (
                <Link key={report.id} href={`/report/${report.id}`}>
                  <div className="p-4 bg-secondary/50 rounded-lg hover:bg-secondary transition-all border border-border hover:border-primary cursor-pointer group">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                          {report.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(report.createdAt).toLocaleString("zh-CN")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {report.status === "completed" && (
                          <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-xs font-medium">
                            <i className="fas fa-check mr-1"></i>
                            已完成
                          </span>
                        )}
                        {report.status === "processing" && (
                          <span className="px-3 py-1 bg-chart-2/20 text-chart-2 rounded-full text-xs font-medium">
                            <i className="fas fa-spinner fa-spin mr-1"></i>
                            生成中
                          </span>
                        )}
                      </div>
                    </div>
                    {report.status === "processing" && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span>{report.progress}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-500"
                            style={{ width: `${report.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          {/* System Status */}
          <Card className="p-6 bg-card border-border">
            <div className="mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-3 mb-1">系统状态</h2>
              <p className="text-xs text-muted-foreground">System Status</p>
            </div>

            <div className="space-y-4">
              {/* Backend Status */}
              <div className="p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">后端服务</span>
                  <div
                    className={`w-2 h-2 rounded-full ${systemStatus.backendConnected ? "bg-primary animate-pulse" : "bg-destructive"}`}
                  />
                </div>
                <div className="text-xs text-muted-foreground">Backend Service</div>
              </div>

              {/* LangGraph Status */}
              <div className="p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">LangGraph</span>
                  <div
                    className={`w-2 h-2 rounded-full ${systemStatus.langGraphStatus === "online" ? "bg-primary animate-pulse" : "bg-destructive"}`}
                  />
                </div>
                <div className="text-xs text-muted-foreground">Workflow Engine</div>
              </div>

              {/* Active Agents */}
              <div className="p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">活跃Agent</span>
                  <span className="text-2xl font-bold text-primary">{stats.activeAgents}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {systemStatus.agents.filter((a) => a.status === "running").length} running /{" "}
                  {systemStatus.agents.length} total
                </div>
              </div>

              {/* Avg Generation Time */}
              <div className="p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">平均生成时间</span>
                  <span className="text-2xl font-bold text-primary">{stats.avgGenerationTime}</span>
                </div>
                <div className="text-xs text-muted-foreground">minutes per report</div>
              </div>

              {/* Last Updated */}
              <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
                <i className="fas fa-clock mr-1"></i>
                最后更新: {systemStatus.lastUpdated.toLocaleTimeString("zh-CN")}
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
