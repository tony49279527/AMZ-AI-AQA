"use client"

import type React from "react"
import { Component } from "react"

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: { componentStack: string } | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  // React 要求此方法签名包含 error 参数，此处仅需设置 hasError
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static getDerivedStateFromError(_error: Error): Partial<State> {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    const detail = `${error.name}: ${error.message}\n\n${error.stack ?? ""}\n\n组件堆栈:\n${errorInfo?.componentStack ?? ""}`
    console.error("Error caught by boundary:", error, errorInfo)
    try {
      sessionStorage.setItem("report_system_last_error", detail)
    } catch {
      // ignore
    }
    this.setState({
      error,
      errorInfo,
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  /** 清除缓存并硬刷新（绕过浏览器缓存，重新拉取页面和脚本） */
  handleHardReload = () => {
    try {
      sessionStorage.removeItem("report_system_last_error")
      // 使用带时间戳的当前地址强制跳过缓存
      const url = new URL(window.location.href)
      url.searchParams.set("_", String(Date.now()))
      window.location.href = url.toString()
    } catch {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message ?? ""
      const isLikelyStaleBuild = /featuredOnly|is not defined|ReferenceError/i.test(msg)

      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full">
              <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mx-auto mb-4">
                  <i className="fas fa-exclamation-triangle text-red-600 text-lg" />
                </div>

                <h2 className="text-center text-xl font-bold text-slate-900 mb-2">
                  出错了
                </h2>
                <p className="text-center text-slate-600 text-sm mb-6">
                  系统遇到了一个错误，请稍后重试。
                </p>

                {isLikelyStaleBuild && (
                  <div className="text-left text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-3 mb-4">
                    <p className="font-semibold mb-1">常见原因：当前运行的是旧版构建或缓存未更新。</p>
                    <p className="mb-2">请在本机项目目录执行：<strong>删除 <code className="bg-amber-100 px-1 rounded">.next</code> 文件夹</strong>，然后重新运行 <code className="bg-amber-100 px-1 rounded">pnpm dev</code> 或 <code className="bg-amber-100 px-1 rounded">pnpm build</code>。再从 GitHub 拉取最新代码后重试。</p>
                    <p>然后点击下方「清除缓存并硬刷新」。</p>
                  </div>
                )}

                <p className="text-center text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                  请确认：浏览器地址与终端里显示的 <strong>Local</strong> 一致（例如 <code className="bg-white px-1 rounded">http://127.0.0.1:3000</code> 或 <code className="bg-white px-1 rounded">3001</code>）。端口不对会白屏或报错。
                </p>

                {this.state.error && (
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-slate-700 mb-2">请把下面这段错误信息复制发给我们，便于排查：</p>
                    <pre className="p-3 bg-red-50 border border-red-200 rounded-lg overflow-auto max-h-48 text-xs text-slate-800 whitespace-pre-wrap">
                      {this.state.error.name}: {this.state.error.message}
                      {this.state.error.stack ? `\n\n${this.state.error.stack}` : ""}
                      {this.state.errorInfo?.componentStack ? `\n\n组件堆栈:\n${this.state.errorInfo.componentStack}` : ""}
                    </pre>
                    <button
                      type="button"
                      onClick={() => {
                        const text = `${this.state.error?.name}: ${this.state.error?.message}\n${this.state.error?.stack ?? ""}\n${this.state.errorInfo?.componentStack ?? ""}`
                        void navigator.clipboard?.writeText(text).then(() => alert("已复制到剪贴板"))
                      }}
                      className="mt-2 w-full py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200"
                    >
                      复制错误信息
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-2 mb-3">
                  <button
                    onClick={this.handleHardReload}
                    type="button"
                    className="w-full px-4 py-2.5 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors"
                    aria-label="清除缓存并硬刷新"
                  >
                    <i className="fas fa-sync-alt mr-1.5" />
                    清除缓存并硬刷新
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={this.handleReload}
                      type="button"
                      className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                      aria-label="重新加载页面"
                    >
                      重新加载
                    </button>
                    <button
                      type="button"
                      onClick={() => { window.location.href = "/" }}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
                      aria-label="返回仪表板"
                    >
                      返回首页
                    </button>
                  </div>
                </div>

                <p className="text-center text-xs text-slate-400 mt-4">
                  如果问题持续存在，请
                  {process.env.NEXT_PUBLIC_SUPPORT_EMAIL ? (
                    <a href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`} className="text-blue-600 hover:underline">联系支持</a>
                  ) : (
                    <span className="text-slate-500">联系管理员</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
