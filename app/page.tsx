import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      {/* Background gradient effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-3xl w-full text-center">
        {/* Hero Section */}
        <div className="mb-10">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            智能报告生成系统
          </h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            通过上传竞品和主品文件，触发 LangGraph 工作流生成包含 7 个章节的专业分析报告
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-10 max-w-lg mx-auto">
          <div className="p-4 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors">
            <div className="text-3xl font-bold text-primary mb-1">7</div>
            <div className="text-xs text-muted-foreground">分析章节</div>
          </div>
          <div className="p-4 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors">
            <div className="text-3xl font-bold text-primary mb-1">5</div>
            <div className="text-xs text-muted-foreground">工作流阶段</div>
          </div>
          <div className="p-4 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors">
            <div className="text-3xl font-bold text-primary mb-1">AI</div>
            <div className="text-xs text-muted-foreground">智能问答</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <Link href="/dashboard" className="flex-1">
              <Button variant="gradient" size="lg" className="w-full gap-2 rounded-lg h-11">
                <i className="fas fa-chart-line text-sm"></i>
                查看全部报告
              </Button>
            </Link>
            <Link href="/report/new" className="flex-1">
              <Button size="lg" variant="outline" className="w-full gap-2 rounded-lg h-11 bg-transparent">
                <i className="fas fa-plus-circle text-sm"></i>
                新建报告
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-12 flex justify-center gap-6 text-sm text-muted-foreground">
          <Link href="/settings" className="hover:text-primary transition-colors flex items-center gap-1.5">
            <i className="fas fa-gear text-xs"></i>
            系统设置
          </Link>
          <Link href="/dashboard" className="hover:text-primary transition-colors flex items-center gap-1.5">
            <i className="fas fa-list text-xs"></i>
            查看报告
          </Link>
        </div>
      </div>
    </div>
  )
}
