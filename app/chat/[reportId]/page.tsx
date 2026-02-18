"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Navigation } from "@/components/navigation"
import type { ChatMessage } from "@/lib/types"
import { useParams, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ChartView } from "@/components/chat/ChartView"
import { buildClientApiHeaders } from "@/lib/client-api"
import { buildClientApiError, formatClientErrorMessage } from "@/lib/client-api-error"

// localStorage keys
const getSessionsKey = (reportId: string) => `chat_sessions_v2_${reportId}`
const getSessionMessagesKey = (reportId: string, sessionId: string) => `chat_messages_v2_${reportId}_${sessionId}`
const getLegacyKey = (reportId: string) => `chat_history_${reportId}`

interface ChatSession {
  id: string
  title: string
  updatedAt: string
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.reportId as string

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [showHistory, setShowHistory] = useState(true)
  const [showContext, setShowContext] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const loadedSessionIdRef = useRef<string | null>(null)

  // 动态加载的报告上下文
  const [reportContext, setReportContext] = useState<{
    title: string
    chapters: { title: string; level: number }[]
  }>({
    title: "加载中...",
    chapters: [],
  })

  // 根据报告章节动态生成推荐问题
  const quickQuestions = reportContext.chapters.length > 0
    ? [
      `总结一下「${reportContext.chapters[0]?.title || '市场分析'}」的要点`,
      ...reportContext.chapters
        .filter(c => c.level === 2)
        .slice(1, 4)
        .map(c => `关于「${c.title}」有什么关键发现？`),
    ].slice(0, 4)
    : [
      "总结一下这个产品的核心竞争优势",
      "主要竞品的优劣势对比是什么？",
      "用户的核心痛点有哪些？",
      "产品主图应该怎么拍摄？",
    ]

  // ——— 加载报告上下文 ———
  useEffect(() => {
    async function loadReportContext() {
      try {
        const response = await fetch(`/api/report/${reportId}`, {
          headers: buildClientApiHeaders(),
        })
        if (response.ok) {
          const text = await response.text()

          // 提取标题 (第一个 # 标题，或使用报告 ID)
          const titleMatch = text.match(/^#\s+(.+)$/m)
          const title = titleMatch ? titleMatch[1].replace(/\*+/g, '').trim() : `报告 ${reportId}`

          // 提取章节目录
          const chapters = text
            .split("\n")
            .filter((line) => line.startsWith("## ") || line.startsWith("### "))
            .map((line) => {
              const isSubSection = line.startsWith("### ")
              const chapterTitle = line.replace(/^#{2,3}\s+/, "").trim()
              return { title: chapterTitle, level: isSubSection ? 3 : 2 }
            })

          setReportContext({ title, chapters })
        }
      } catch (error) {
        console.error("Error loading report context:", error)
      }
    }

    loadReportContext()
  }, [reportId])

  // ——— 加载会话列表及历史 ———
  useEffect(() => {
    const sessionsKey = getSessionsKey(reportId)
    const legacyKey = getLegacyKey(reportId)
    const storedSessions = localStorage.getItem(sessionsKey)
    const legacyData = localStorage.getItem(legacyKey)

    let currentSessions: ChatSession[] = []

    if (storedSessions) {
      try {
        currentSessions = JSON.parse(storedSessions)
      } catch (e) {
        console.error("Error parsing sessions:", e)
      }
    }

    // 迁移旧数据
    if (legacyData && currentSessions.length === 0) {
      const sessionId = "legacy-session"
      try {
        const legacyMessages = JSON.parse(legacyData)
        currentSessions = [{
          id: sessionId,
          title: "初始对话 (已迁移)",
          updatedAt: new Date().toISOString()
        }]
        localStorage.setItem(getSessionMessagesKey(reportId, sessionId), JSON.stringify(legacyMessages))
        localStorage.removeItem(legacyKey)
        localStorage.setItem(sessionsKey, JSON.stringify(currentSessions))
      } catch (e) {
        console.error("Error migrating legacy data:", e)
      }
    }

    // 如果还没有任何会话，创建一个
    if (currentSessions.length === 0) {
      const sessionId = Date.now().toString()
      currentSessions = [{
        id: sessionId,
        title: "新对话",
        updatedAt: new Date().toISOString()
      }]
      localStorage.setItem(sessionsKey, JSON.stringify(currentSessions))
    }

    setSessions(currentSessions)
    // 默认激活第一个
    if (currentSessions.length > 0) {
      setActiveSessionId(currentSessions[0].id)
    }
  }, [reportId])

  // 切换会话时加载消息
  useEffect(() => {
    if (!activeSessionId) return

    const messagesKey = getSessionMessagesKey(reportId, activeSessionId)
    const stored = localStorage.getItem(messagesKey)

    // 标记当前正在加载这个会话
    loadedSessionIdRef.current = activeSessionId

    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setMessages(
          parsed.map((m: ChatMessage) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }))
        )
      } catch (e) {
        console.error("Failed to parse messages for session", activeSessionId, e)
        setMessages([])
        initWelcomeMessage()
      }
    } else {
      setMessages([])
      initWelcomeMessage()
    }
  }, [activeSessionId, reportId])

  function initWelcomeMessage() {
    setMessages([
      {
        id: "welcome",
        role: "system",
        content: "欢迎使用智能问答系统！我已加载您的报告，可以回答关于报告内容的任何问题。",
        timestamp: new Date(),
      },
    ])
  }

  // ——— 保存聊天历史 ———
  useEffect(() => {
    if (!activeSessionId || !reportId) return

    // 如果当前内存中的消息还不属于这个 activeSessionId（由于切换延迟），则不要保存，防止覆盖
    if (loadedSessionIdRef.current !== activeSessionId) return

    // 不要保存欢迎消息（如果是空的）
    if (messages.length > 0 && (messages[0]?.id !== "welcome" || messages.length > 1)) {
      localStorage.setItem(getSessionMessagesKey(reportId, activeSessionId), JSON.stringify(messages))

      // 更新会话列表中的最后更新时间
      setSessions(prev => prev.map(s =>
        s.id === activeSessionId ? { ...s, updatedAt: new Date().toISOString() } : s
      ))
    }
  }, [messages, reportId, activeSessionId])

  // 持久化会话列表
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(getSessionsKey(reportId), JSON.stringify(sessions))
    }
  }, [sessions, reportId])

  const createNewSession = () => {
    const sessionId = Date.now().toString()
    const newSession: ChatSession = {
      id: sessionId,
      title: "新对话",
      updatedAt: new Date().toISOString()
    }
    setSessions(prev => [newSession, ...prev])
    setActiveSessionId(sessionId)
    setMessages([]) // 切换 useEffect 会处理加载
  }

  // 预留：会话删除（待与 UI 联动）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 预留供后续会话列表删除按钮使用
  const deleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    const newSessions = sessions.filter(s => s.id !== sessionId)
    if (newSessions.length === 0) {
      // 至少保留一个
      createNewSession()
      return
    }

    setSessions(newSessions)
    localStorage.removeItem(getSessionMessagesKey(reportId, sessionId))

    if (activeSessionId === sessionId) {
      setActiveSessionId(newSessions[0].id)
    }
  }

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // ——— 发送消息并处理 SSE 流 ———
  const handleSend = async () => {
    if (!input.trim() || isStreaming) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
      reportId,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsStreaming(true)

    // 构建发送给 API 的消息列表 (不包含 system 类型的前端消息)
    // 上下文截断：只保留最近 10 轮对话 (20 条消息) 以防止 token 溢出
    const MAX_CONTEXT_MESSAGES = 20
    const allApiMessages = [...messages, userMessage]
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }))
    const apiMessages = allApiMessages.length > MAX_CONTEXT_MESSAGES
      ? allApiMessages.slice(-MAX_CONTEXT_MESSAGES)
      : allApiMessages

    // 创建 AI 回复占位消息
    const aiMessageId = (Date.now() + 1).toString()
    const aiMessage: ChatMessage = {
      id: aiMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      reportId,
      sources: [],
    }
    setMessages((prev) => [...prev, aiMessage])

    try {
      // 从 localStorage 读取用户选择的模型
      let selectedModel: string | undefined
      try {
        const stored = localStorage.getItem("app_settings")
        if (stored) {
          const parsed = JSON.parse(stored)
          selectedModel = parsed?.llm?.defaultModel
        }
      } catch { /* ignore */ }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: buildClientApiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ messages: apiMessages, reportId, model: selectedModel }),
      })

      if (!response.ok) {
        throw await buildClientApiError(response, `HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ""
      let streamBuffer = ""
      let streamDone = false

      const processSseEventBlock = (block: string) => {
        const lines = block.split(/\r?\n/)
        for (const rawLine of lines) {
          const line = rawLine.trim()
          if (!line.startsWith("data: ")) continue

          const data = line.slice(6).trim()
          if (!data) continue
          if (data === "[DONE]") {
            streamDone = true
            return
          }

          try {
            const parsed = JSON.parse(data)
            if (parsed.error) {
              throw new Error(String(parsed.error))
            }
            if (parsed.content) {
              fullContent += parsed.content
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMessageId
                    ? { ...m, content: fullContent }
                    : m
                )
              )
            }
          } catch {
            // 忽略解析错误
          }
        }
      }

      if (reader) {
        while (!streamDone) {
          const { done, value } = await reader.read()
          if (done) {
            if (streamBuffer.trim()) {
              processSseEventBlock(streamBuffer)
            }
            break
          }

          streamBuffer += decoder.decode(value, { stream: true })
          streamBuffer = streamBuffer.replace(/\r\n/g, "\n")
          let boundaryIndex = streamBuffer.indexOf("\n\n")
          while (boundaryIndex !== -1) {
            const block = streamBuffer.slice(0, boundaryIndex)
            streamBuffer = streamBuffer.slice(boundaryIndex + 2)
            processSseEventBlock(block)
            if (streamDone) break
            boundaryIndex = streamBuffer.indexOf("\n\n")
          }
        }
      }

      // 提取引用来源 (从回复内容中寻找 [来源: xxx] 模式)
      const sourceMatches = fullContent.match(/\[来源[:：]\s*([^\]]+)\]/g)
      const sources = sourceMatches
        ? sourceMatches.map((s) => s.replace(/\[来源[:：]\s*/, "").replace("]", ""))
        : []

      // 最终更新消息（加上来源）
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMessageId
            ? { ...m, content: fullContent, sources }
            : m
        )
      )

      // 如果是第一条用户消息，尝试重命名会话
      if (messages.length <= 1) {
        const newTitle = input.slice(0, 15) + (input.length > 15 ? "..." : "")
        setSessions(prev => prev.map(s =>
          s.id === activeSessionId ? { ...s, title: newTitle } : s
        ))
      }
    } catch (error) {
      console.error("Chat error:", error)
      const message = formatClientErrorMessage(error, "未知错误")
      // 更新为错误消息
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMessageId
            ? {
              ...m,
              content: `抱歉，回答时出现错误: ${message}。请检查 API 配置后重试。`,
            }
            : m
        )
      )
    } finally {
      setIsStreaming(false)
    }
  }

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  // 预留：清空当前会话消息（待与 UI 联动）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 预留供设置/更多操作使用
  const clearHistory = () => {
    if (!activeSessionId) return
    localStorage.removeItem(getSessionMessagesKey(reportId, activeSessionId))
    initWelcomeMessage()
  }

  const exportChat = () => {
    const chatMessages = messages.filter(m => m.role !== "system")
    if (chatMessages.length === 0) return

    let md = `# 智能问答记录 - ${reportContext.title}\n\n`
    md += `> 导出时间: ${new Date().toLocaleString("zh-CN")} | 报告ID: ${reportId}\n\n---\n\n`

    chatMessages.forEach((m) => {
      const time = new Date(m.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
      if (m.role === "user") {
        md += `### 🧑 用户 (${time})\n\n${m.content}\n\n`
      } else {
        md += `### 🤖 AI 助手 (${time})\n\n${m.content}\n\n`
        if (m.sources && m.sources.length > 0) {
          md += `**来源:** ${m.sources.join(", ")}\n\n`
        }
      }
      md += `---\n\n`
    })

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `chat_${reportId}_${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* ═══════ 三 Tab 导航条 ═══════ */}
      <div className="bg-white border-b border-slate-200 fixed top-[62px] left-0 right-0 z-40 no-print">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex justify-center">
            <div className="flex space-x-8">
              <button
                onClick={() => router.push(`/report/${reportId}`)}
                className="flex items-center gap-2 px-4 py-3 text-base font-semibold text-slate-500 border-b-2 border-transparent hover:text-blue-600 transition-all"
              >
                <i className="fas fa-file-alt"></i>
                报告详情
              </button>
              <button
                className="flex items-center gap-2 px-4 py-3 text-base font-semibold text-blue-600 border-b-2 border-blue-600 transition-all"
              >
                <i className="fas fa-comments"></i>
                智能问答
              </button>
              <button
                onClick={() => router.push(`/report/${reportId}?tab=sources`)}
                className="flex items-center gap-2 px-4 py-3 text-base font-semibold text-slate-500 border-b-2 border-transparent hover:text-blue-600 transition-all"
              >
                <i className="fas fa-database"></i>
                数据源
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-110px)] pt-[110px]">
        {/* ═══════ 左侧栏 - 聊天历史 ═══════ */}
        {showHistory ? (
          <>
            {/* 桌面端侧栏 */}
            <aside className="hidden lg:flex w-72 flex-shrink-0 border-r border-border/60 flex-col bg-muted/20">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
                <span className="text-sm font-semibold text-foreground">聊天历史</span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                <button
                  onClick={createNewSession}
                  className="w-full text-left px-3 py-3 rounded-xl border border-dashed border-slate-300/80 bg-transparent text-slate-500 hover:bg-white/50 hover:border-primary/50 hover:text-primary transition-all mb-4 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <i className="fas fa-plus text-xs" />
                    </div>
                    <span className="text-sm font-medium">新建对话</span>
                  </div>
                </button>

                {sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => setActiveSessionId(session.id)}
                    className={cn(
                      "px-3 py-3 rounded-xl cursor-pointer transition-all border mb-1",
                      activeSessionId === session.id
                        ? "bg-white border-slate-200/60 shadow-sm"
                        : "bg-transparent border-transparent hover:bg-white/40"
                    )}
                  >
                    <div className={cn(
                      "font-medium text-sm truncate mb-1",
                      activeSessionId === session.id ? "text-primary font-semibold" : "text-slate-700"
                    )}>
                      {session.title}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <i className="far fa-clock text-[9px] opacity-70" />
                      {new Date(session.updatedAt).toLocaleDateString("zh-CN")}
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            {/* 移动端模态 */}
            {showHistory && (
              <div className="fixed inset-0 z-50 lg:hidden">
                {/* 背景 */}
                <div
                  className="absolute inset-0 bg-black/50"
                  onClick={() => setShowHistory(false)}
                />

                {/* 侧边栏 */}
                <aside className="absolute left-0 top-0 bottom-0 w-64 bg-muted/20 border-r border-border/60 flex flex-col shadow-lg">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
                    <span className="text-sm font-semibold text-foreground">聊天历史</span>
                    <button
                      onClick={() => setShowHistory(false)}
                      className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center transition-colors"
                    >
                      <i className="fas fa-chevron-left text-xs text-muted-foreground" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    <button
                      onClick={() => {
                        createNewSession()
                        setShowHistory(false)
                      }}
                      className="w-full text-left px-3 py-3 rounded-xl border border-dashed border-slate-300/80 bg-transparent text-slate-500 hover:bg-white/50 hover:border-primary/50 hover:text-primary transition-all mb-4 group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <i className="fas fa-plus text-xs" />
                        </div>
                        <span className="text-sm font-medium">新建对话</span>
                      </div>
                    </button>

                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => {
                          setActiveSessionId(session.id)
                          setShowHistory(false)
                        }}
                        className={cn(
                          "px-3 py-3 rounded-xl cursor-pointer transition-all border mb-1",
                          activeSessionId === session.id
                            ? "bg-white border-slate-200/60 shadow-sm"
                            : "bg-transparent border-transparent hover:bg-white/40"
                        )}
                      >
                        <div className={cn(
                          "font-medium text-sm truncate mb-1",
                          activeSessionId === session.id ? "text-primary font-semibold" : "text-slate-700"
                        )}>
                          {session.title}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <i className="far fa-clock text-[9px] opacity-70" />
                          {new Date(session.updatedAt).toLocaleDateString("zh-CN")}
                        </div>
                      </div>
                    ))}
                  </div>
                </aside>
              </div>
            )}
          </>
        ) : null}

        {/* ═══════ 中间 - 对话区 ═══════ */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50">
          {/* 对话标题栏 */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <button
                onClick={() => setShowHistory(true)}
                className="lg:hidden w-8 h-8 flex-shrink-0 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors"
                title="聊天历史"
              >
                <i className="fas fa-bars text-sm text-slate-500" />
              </button>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-slate-800 truncate">{reportContext.title}</h2>
                <p className="text-xs text-slate-500">智能问答</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportChat}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 transition-colors"
              >
                <i className="fas fa-download text-[10px]" />
                导出
              </button>
                <button className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-500" title="设置" aria-label="设置">
                <i className="fas fa-sliders-h text-sm" aria-hidden />
              </button>
            </div>
          </div>

          {/* 消息流 */}
          <div className="flex-1 overflow-y-auto scroll-smooth">
            <div className="max-w-4xl mx-auto px-2 sm:px-6 py-3 sm:py-6 space-y-4 sm:space-y-6">
              {messages.map((message, idx) => (
                <div key={message.id}>
                  {/* 系统消息 */}
                  {message.role === "system" && (
                    <div className="text-center py-4">
                      <div className="inline-flex items-center gap-2 bg-slate-200/50 px-4 py-2 rounded-full text-xs font-medium text-slate-500">
                        <i className="fas fa-info-circle" />
                        {message.content}
                      </div>
                    </div>
                  )}

                  {/* 用户消息 - 右对齐 */}
                  {message.role === "user" && (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] sm:max-w-[75%]">
                        <div className="bg-blue-600 text-white px-3 sm:px-5 py-2 sm:py-3.5 rounded-2xl rounded-tr-sm shadow-sm selection:bg-blue-700">
                          <p className="text-sm sm:text-[15px] leading-relaxed">{message.content}</p>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1.5 text-right font-medium">
                          {message.timestamp.toLocaleTimeString("zh-CN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI 回复 - 左对齐 */}
                  {message.role === "assistant" && (message.content || (!isStreaming && idx !== messages.length - 1)) && (
                    <div className="flex items-start gap-2 sm:gap-4">
                      <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                        <div className="bg-gradient-to-br from-indigo-500 to-violet-500 text-transparent bg-clip-text">
                          <i className="fas fa-robot text-base sm:text-lg" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="bg-white px-3 sm:px-6 py-3 sm:py-5 rounded-2xl rounded-tl-none shadow-sm border border-slate-100/60 text-slate-800 text-sm sm:text-[15px] leading-6 sm:leading-7 group hover:shadow-md transition-shadow">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode; [k: string]: unknown }) {
                                if (className === "language-json:chart") {
                                  return <ChartView config={String(children).replace(/\n$/, "")} />
                                }

                                return !inline ? (
                                  <div className="relative group/code my-4">
                                    <pre {...props} className={cn(className, "p-4 rounded-xl bg-slate-900 text-slate-100 overflow-x-auto text-sm scrollbar-hide")}>
                                      <code className={className}>{children}</code>
                                    </pre>
                                  </div>
                                ) : (
                                  <code className="px-1.5 py-0.5 rounded-md bg-slate-100 text-indigo-600 font-medium text-[0.9em]" {...props}>
                                    {children}
                                  </code>
                                )
                              },
                              p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc ml-5 mb-3 space-y-1">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal ml-5 mb-3 space-y-1">{children}</ol>,
                              table: ({ children }) => (
                                <div className="overflow-x-auto my-4 border border-slate-200 rounded-lg">
                                  <table className="min-w-full divide-y divide-slate-200">{children}</table>
                                </div>
                              ),
                              th: ({ children }) => <th className="px-4 py-2 bg-slate-50 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{children}</th>,
                              td: ({ children }) => <td className="px-4 py-2 border-t border-slate-100 text-sm text-slate-700">{children}</td>,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                          {/* 流式光标 */}
                          {isStreaming && messages[messages.length - 1]?.id === message.id && (
                            <span className="inline-block w-1.5 h-4 bg-indigo-500 ml-1 animate-pulse align-middle" />
                          )}

                          {/* 来源引用标签 (Inside bubble for cleaner look) */}
                          {message.sources && message.sources.length > 0 && !isStreaming && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                              <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">参考来源</div>
                              <div className="flex flex-wrap gap-2">
                                {message.sources.map((source, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 text-xs text-slate-600 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 cursor-pointer transition-all"
                                  >
                                    <i className="fas fa-file-alt text-[10px] opacity-70" />
                                    {source}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 操作栏 */}
                        {!isStreaming && message.content && (
                          <div className="flex items-center gap-4 mt-2 ml-2">
                            <span className="text-[11px] text-slate-400 font-medium">
                              {message.timestamp.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <div className="flex items-center gap-1">
                              <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors" title="复制" aria-label="复制内容" onClick={() => copyMessage(message.content)}>
                                <i className="far fa-copy text-xs" aria-hidden />
                              </button>
                              <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors" title="有用">
                                <i className="far fa-thumbs-up text-xs" />
                              </button>
                              <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors" title="没用">
                                <i className="far fa-thumbs-down text-xs" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* 流式加载动画 */}
              {isStreaming && messages[messages.length - 1]?.content === "" && (
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center flex-shrink-0 shadow-sm animate-pulse">
                    <i className="fas fa-robot text-indigo-500 text-lg" />
                  </div>
                  <div className="bg-white px-6 py-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 flex items-center gap-1.5">
                    <span className="text-sm text-slate-500 mr-2 font-medium">思考中</span>
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} className="h-4" />
            </div>
          </div>

          {/* ═══════ 底部输入区 (Solid Footer) ═══════ */}
          <div className="bg-slate-50 p-2 sm:p-4 pb-2 relative z-10 shrink-0">
            <div className="max-w-4xl mx-auto px-2 sm:px-4">
              {/* 快捷问题 */}
              {messages.length <= 1 && (
                <div className="flex flex-col gap-2 mb-3 sm:mb-4">
                  {quickQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInput(question)
                        inputRef.current?.focus()
                      }}
                      className="inline-flex items-start gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:border-indigo-200 hover:text-indigo-600 hover:shadow-sm transition-all justify-start"
                    >
                      <i className="fas fa-sparkles text-amber-400 mt-0.5 flex-shrink-0" />
                      <span className="text-left">{question}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* 输入框容器 */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 to-purple-100/50 rounded-xl sm:rounded-2xl blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10" />
                <div className="relative flex items-end gap-1 sm:gap-2 bg-white group-focus-within:bg-white rounded-xl sm:rounded-2xl border border-slate-200 group-focus-within:border-indigo-300 group-focus-within:ring-4 group-focus-within:ring-indigo-100/50 transition-all px-2 sm:px-4 py-2 sm:py-3 shadow-sm">
                  <textarea
                    ref={inputRef as any}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="问点什么..."
                    className="flex-1 bg-transparent text-sm sm:text-[15px] text-slate-900 placeholder:text-slate-400 outline-none resize-none max-h-48 min-h-[36px] sm:min-h-[44px] py-1 sm:py-2"
                    disabled={isStreaming}
                    rows={1}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${Math.min(target.scrollHeight, 192)}px`;
                    }}
                  />

                  <div className="flex items-center gap-0.5 sm:gap-1 pb-1 sm:pb-1.5 flex-shrink-0">
                    <button className="w-7 sm:w-8 h-7 sm:h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors hidden sm:flex" title="上传附件">
                      <i className="fas fa-link text-sm" />
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || isStreaming}
                      className={cn(
                        "w-7 sm:w-9 h-7 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-all shadow-sm ml-0 sm:ml-1",
                        input.trim() && !isStreaming
                          ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-500/20 active:scale-95 transform"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                      )}
                    >
                      <i className="fas fa-arrow-up text-xs sm:text-sm font-bold" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-center mt-3 flex items-center justify-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                <i className="fas fa-shield-alt text-[10px] text-slate-400" />
                <p className="text-[10px] text-slate-400">
                  内容由 AI 生成，请仔细甄别
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* ═══════ 右侧栏 - 报告上下文 ═══════ */}
        {
          showContext ? (
            <aside className="w-72 flex-shrink-0 border-l border-border/60 flex flex-col bg-muted/20 overflow-y-auto">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
                <span className="text-sm font-semibold text-foreground">报告上下文</span>
                <button
                  onClick={() => setShowContext(false)}
                  className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <i className="fas fa-chevron-right text-xs text-muted-foreground" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* 当前报告 */}
                <div className="px-3 py-3 bg-muted/50 rounded-lg">
                  <div className="text-[11px] text-muted-foreground mb-1">当前报告</div>
                  <div className="text-sm font-semibold text-foreground">{reportContext.title}</div>
                </div>

                {/* 报告章节 */}
                <div>
                  <div className="text-xs font-semibold text-foreground mb-2 px-1">
                    报告章节 ({reportContext.chapters.filter(c => c.level === 2).length} 章)
                  </div>
                  <div className="space-y-0.5">
                    {reportContext.chapters
                      .filter(c => c.level === 2)
                      .map((chapter, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all text-sm hover:bg-muted/60 text-foreground"
                        >
                          <span className="text-[13px] truncate">{chapter.title}</span>
                          <i className="fas fa-chevron-right text-[10px] text-muted-foreground flex-shrink-0" />
                        </div>
                      ))}
                  </div>
                </div>

                {/* 提示 */}
                <div className="px-3 py-3 bg-primary/5 rounded-lg border border-primary/10">
                  <div className="flex items-start gap-2">
                    <i className="fas fa-lightbulb text-primary text-xs mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-foreground mb-1">提示</div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        AI 会基于完整报告内容回答问题，并标注引用来源章节。您也可以让 AI 生成产品图片描述等创意内容。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          ) : (
            <aside className="w-12 flex-shrink-0 border-l border-border/60 flex flex-col items-center pt-3">
              <button
                onClick={() => setShowContext(true)}
                className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center transition-colors"
                title="展开报告上下文"
              >
                <i className="fas fa-chevron-left text-xs text-muted-foreground" />
              </button>
            </aside>
          )
        }
      </div >
    </div >
  )
}
