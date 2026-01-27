"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"

export default function HomePage() {
  const { user, isLoading } = useAuth()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      {/* Background gradient effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-2xl w-full text-center">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="w-20 h-20 bg-primary mx-auto mb-6 rounded-2xl flex items-center justify-center">
            <i className="fas fa-brain text-primary-foreground text-4xl"></i>
          </div>
          <h1 className="text-6xl md:text-8xl font-bold mb-4">
            智能报告
            <br />
            <span className="text-primary">生成系统</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-2">Multi-Agent AI Report Generation Platform</p>
          <p className="text-muted-foreground">通过上传竞品和主品文件，触发LangGraph工作流生成包含11个章节的分析报告</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          <Card className="p-4 bg-card border-border">
            <div className="text-4xl font-bold text-primary mb-1">11</div>
            <div className="text-sm text-muted-foreground">智能Agent</div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="text-4xl font-bold text-primary mb-1">5</div>
            <div className="text-sm text-muted-foreground">工作流阶段</div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="text-4xl font-bold text-primary mb-1">AI</div>
            <div className="text-sm text-muted-foreground">智能问答</div>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        ) : user ? (
          // Logged in user buttons
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="text-lg px-8 py-6 gap-3 w-full sm:w-auto">
                <i className="fas fa-rocket"></i>
                进入仪表板
                <span className="text-xs opacity-70">Dashboard</span>
              </Button>
            </Link>
            <Link href="/report/new">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 gap-3 bg-transparent w-full sm:w-auto">
                <i className="fas fa-plus-circle"></i>
                新建报告
                <span className="text-xs opacity-70">New Report</span>
              </Button>
            </Link>
          </div>
        ) : (
          // Guest user buttons
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="text-lg px-8 py-6 gap-3 w-full sm:w-auto">
                <i className="fas fa-sign-in-alt"></i>
                登录系统
                <span className="text-xs opacity-70">Sign In</span>
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 gap-3 bg-transparent w-full sm:w-auto">
                <i className="fas fa-user-plus"></i>
                注册账号
                <span className="text-xs opacity-70">Register</span>
              </Button>
            </Link>
          </div>
        )}

        {user && (
          <div className="mt-8 p-4 bg-card/50 rounded-lg border border-border inline-block">
            <p className="text-muted-foreground">
              <i className="fas fa-user-check text-primary mr-2"></i>
              欢迎回来，<span className="text-foreground font-medium">{user.name}</span>
            </p>
          </div>
        )}

        {/* Footer Links */}
        <div className="mt-16 flex justify-center gap-8 text-sm text-muted-foreground">
          <Link href="/settings" className="hover:text-primary transition-colors">
            <i className="fas fa-gear mr-2"></i>
            系统设置
          </Link>
          <Link href="/chat/demo" className="hover:text-primary transition-colors">
            <i className="fas fa-comments mr-2"></i>
            智能问答
          </Link>
        </div>
      </div>
    </div>
  )
}
