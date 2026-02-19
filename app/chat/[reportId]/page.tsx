"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Navigation } from "@/components/navigation"
import type { ChatMessage } from "@/lib/types"
import { useParams, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ChartView } from "@/components/chat/ChartView"
import { buildClientApiHeaders } from "@/lib/client-api"
import { buildClientApiError, formatClientErrorMessage } from "@/lib/client-api-error"
import { DEFAULT_LLM_MODEL, DEFAULT_IMAGE_MODEL, LLM_MODEL_OPTIONS, IMAGE_MODEL_OPTIONS } from "@/lib/constants"
import { useAuth } from "@/lib/auth-context"

interface ChatSession {
  id: string
  title: string
  updatedAt: string
}

function formatSessionDate(updatedAt: string): string {
  const d = new Date(updatedAt)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("zh-CN")
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const reportId = params.reportId as string

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [showHistory, setShowHistory] = useState(() => typeof window !== "undefined" ? window.innerWidth >= 1024 : true)
  const [showContext, setShowContext] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadedSessionIdRef = useRef<string | null>(null)
  const modelDropdownRef = useRef<HTMLDivElement>(null)

  // 当前智能问答使用的模型（与设置里的 LLM 默认模型同步，此处为快捷切换）
  const [chatModel, setChatModel] = useState<string>(DEFAULT_LLM_MODEL)
  const [showModelDropdown, setShowModelDropdown] = useState(false)

  // 智能问答模式：对话（LLM）| 图片生成
  const [qaMode, setQaMode] = useState<"llm" | "image">("llm")
  const [imageModel, setImageModel] = useState<string>(DEFAULT_IMAGE_MODEL)
  const [imageRefFiles, setImageRefFiles] = useState<File[]>([])
  const [imageAspectRatio, setImageAspectRatio] = useState<string>("1:1")
  const [imageGenerating, setImageGenerating] = useState(false)
  const streamAbortRef = useRef<AbortController | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  const imageObjectUrlsRef = useRef<string[]>([])

  // 动态加载的报告上下文
  const [reportContext, setReportContext] = useState<{
    title: string
    chapters: { title: string; level: number }[]
  }>({
    title: "加载中...",
    chapters: [],
  })

  // 报告是否有爬取资料（用于提示用户数据覆盖范围）
  const [sourceDataSummary, setSourceDataSummary] = useState<{
    loaded: boolean
    count: number
    types: string[]
  }>({ loaded: false, count: 0, types: [] })

  // 根据报告章节动态生成推荐问题
  const chapters = reportContext?.chapters ?? []
  const quickQuestions = chapters.length > 0
    ? [
      `总结一下「${chapters[0]?.title ?? "市场分析"}」的要点`,
      ...chapters
        .filter((c: { level?: number }) => c?.level === 2)
        .slice(1, 4)
        .map((c: { title?: string }) => `关于「${c?.title ?? "本章"}」有什么关键发现？`),
    ].slice(0, 4)
    : [
      "总结一下这个产品的核心竞争优势",
      "主要竞品的优劣势对比是什么？",
      "用户的核心痛点有哪些？",
      "产品主图应该怎么拍摄？",
    ]

  /** 预置：让 LLM 总结报告中的图片建议并转化为 5 条图片提示词 */
  const PRESET_IMAGE_PROMPTS =
    "请总结本报告中关于亚马逊主图、A+ 图片的所有建议与描述，并转化为 5 条可直接用于图片生成的英文提示词，每条一行，格式为：1. xxx  2. xxx  3. xxx  4. xxx  5. xxx。"

  // 从 localStorage 同步当前模型（与设置页一致）及图片模型/比例
  useEffect(() => {
    try {
      const stored = localStorage.getItem("app_settings")
      if (stored) {
        const parsed = JSON.parse(stored) as { llm?: { defaultModel?: string }; image?: { model?: string; aspectRatio?: string } }
        const m = parsed?.llm?.defaultModel
        if (typeof m === "string" && m.trim()) setChatModel(m.trim())
        const imgModel = parsed?.image?.model
        if (typeof imgModel === "string" && imgModel.trim()) setImageModel(imgModel.trim())
        const imgRatio = parsed?.image?.aspectRatio
        if (typeof imgRatio === "string" && imgRatio.trim()) setImageAspectRatio(imgRatio.trim())
      }
    } catch { /* ignore */ }
  }, [reportId])

  // 点击外部关闭模型下拉
  useEffect(() => {
    if (!showModelDropdown) return
    const onOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) setShowModelDropdown(false)
    }
    document.addEventListener("mousedown", onOutside)
    return () => document.removeEventListener("mousedown", onOutside)
  }, [showModelDropdown])

  // 图片缩略图 Object URL 生命周期：随 imageRefFiles 更新并避免泄漏
  useEffect(() => {
    imageObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    imageObjectUrlsRef.current = []
    if (imageRefFiles.length === 0) {
      setImagePreviewUrls([])
      return
    }
    const urls = imageRefFiles.map((f) => URL.createObjectURL(f))
    imageObjectUrlsRef.current = urls
    setImagePreviewUrls(urls)
    return () => {
      imageObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      imageObjectUrlsRef.current = []
    }
  }, [imageRefFiles])

  const applyChatModel = useCallback((modelValue: string) => {
    setChatModel(modelValue)
    setShowModelDropdown(false)
    try {
      const raw = localStorage.getItem("app_settings")
      const prev = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
      const llm = (prev.llm as Record<string, unknown>) ?? {}
      localStorage.setItem("app_settings", JSON.stringify({ ...prev, llm: { ...llm, defaultModel: modelValue } }))
    } catch { /* ignore */ }
  }, [])

  // ——— 加载报告上下文 ———
  useEffect(() => {
    if (!reportId || typeof reportId !== "string") return
    const controller = new AbortController()

    async function loadReportContext() {
      try {
        const response = await fetch(`/api/report/${reportId}`, {
          headers: buildClientApiHeaders(),
          signal: controller.signal,
        })
        if (response.ok) {
          const text = await response.text()
          const titleMatch = text.match(/^#\s+(.+)$/m)
          const title = titleMatch ? titleMatch[1].replace(/\*+/g, '').trim() : `报告 ${reportId}`
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
        if (!controller.signal.aborted) console.error("Error loading report context:", error)
      }
    }

    async function loadSourceSummary() {
      try {
        const res = await fetch(`/api/report-sources/${reportId}`, { headers: buildClientApiHeaders(), signal: controller.signal })
        if (!res.ok) { setSourceDataSummary({ loaded: true, count: 0, types: [] }); return }
        const data = await res.json()
        const items = Array.isArray(data?.items) ? data.items : []
        const types = [...new Set(items.map((it: { source_type?: string }) => {
          const map: Record<string, string> = { product_info: "产品信息", reviews: "评论", reference_site: "参考网站", reference_youtube: "YouTube", return_report: "退货报告", persona: "人群画像" }
          return map[it?.source_type ?? ""] ?? it?.source_type ?? ""
        }).filter(Boolean))]
        setSourceDataSummary({ loaded: true, count: items.length, types: types as string[] })
      } catch {
        if (!controller.signal.aborted) setSourceDataSummary({ loaded: true, count: 0, types: [] })
      }
    }

    loadReportContext()
    loadSourceSummary()
    return () => controller.abort()
  }, [reportId])

  // ——— 从服务端加载会话列表 ———
  useEffect(() => {
    if (!reportId || typeof reportId !== "string" || !user) return
    let cancelled = false

    async function loadSessions() {
      try {
        const res = await fetch(`/api/chat-storage/sessions?reportId=${encodeURIComponent(reportId)}`)
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        let serverSessions: ChatSession[] = Array.isArray(data.sessions) ? data.sessions : []

        if (serverSessions.length === 0 && !cancelled) {
          const createRes = await fetch("/api/chat-storage/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reportId, title: "新对话" }),
          })
          if (createRes.ok) {
            const createData = await createRes.json()
            if (createData.session) serverSessions = [createData.session]
          }
        }

        if (!cancelled && serverSessions.length > 0) {
          setSessions(serverSessions)
          setActiveSessionId(serverSessions[0].id)
        }
      } catch (e) {
        console.error("Failed to load sessions:", e)
      }
    }

    loadSessions()
    return () => { cancelled = true }
  }, [reportId, user])

  // 切换会话时从服务端加载消息
  useEffect(() => {
    if (!activeSessionId || !reportId || typeof reportId !== "string" || !user) return
    let cancelled = false
    loadedSessionIdRef.current = activeSessionId

    async function loadMessages() {
      try {
        const res = await fetch(`/api/chat-storage/messages?reportId=${encodeURIComponent(reportId)}&sessionId=${encodeURIComponent(activeSessionId!)}`)
        if (cancelled) return
        if (!res.ok) { initWelcomeMessage(); return }
        const data = await res.json()
        if (cancelled) return
        const msgs = Array.isArray(data.messages) ? data.messages : []
        if (msgs.length > 0) {
          setMessages(msgs.map((m: Record<string, unknown>) => ({
            ...m, timestamp: new Date((m.timestamp as string) || Date.now()),
          }) as ChatMessage))
        } else {
          initWelcomeMessage()
        }
      } catch {
        if (!cancelled) initWelcomeMessage()
      }
    }

    loadMessages()
    return () => { cancelled = true }
  }, [activeSessionId, reportId, user])

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

  // ——— 保存聊天消息到服务端（debounce 1.5s）———
  useEffect(() => {
    if (!activeSessionId || !reportId || !user) return
    if (loadedSessionIdRef.current !== activeSessionId) return

    if (messages.length > 0 && (messages[0]?.id !== "welcome" || messages.length > 1)) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        const toStore = messages.map((m) => {
          const { images, ...rest } = m
          return { ...rest, ...(images?.length ? { imageCount: images.length } : {}) }
        })
        fetch("/api/chat-storage/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId, sessionId: activeSessionId, messages: toStore }),
        }).catch(() => {})
        setSessions(prev => prev.map(s =>
          s.id === activeSessionId ? { ...s, updatedAt: new Date().toISOString() } : s
        ))
      }, 1500)
    }

    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [messages, reportId, activeSessionId, user])

  const createNewSession = async () => {
    try {
      const res = await fetch("/api/chat-storage/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, title: "新对话" }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.session) {
          setSessions(prev => [data.session, ...prev])
          setActiveSessionId(data.session.id)
          setMessages([])
        }
      }
    } catch { /* ignore */ }
  }

  const deleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    try {
      await fetch(`/api/chat-storage/sessions?reportId=${encodeURIComponent(reportId)}&sessionId=${encodeURIComponent(sessionId)}`, { method: "DELETE" })
    } catch { /* ignore */ }
    const newSessions = sessions.filter(s => s.id !== sessionId)
    if (newSessions.length === 0) {
      createNewSession()
      return
    }
    setSessions(newSessions)
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

  /** 将 File 转为 data URL */
  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })

  // ——— 发送消息并处理 SSE 流（支持 overrideInput 用于预置一键发送）；图片模式下走图片生成 ———
  const handleSend = async (overrideInput?: string) => {
    const rawText = (overrideInput !== undefined ? overrideInput : input).trim()
    const isImageMode = qaMode === "image"
    const hasImages = imageRefFiles.length > 0
    const text = isImageMode && !rawText && hasImages ? "根据参考图生成符合亚马逊主图或 A+ 要求的图片。" : rawText
    if (!text || isStreaming) return
    if (isImageMode && imageGenerating) return
    if (isImageMode && !hasImages && !rawText) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
      reportId,
    }

    setMessages((prev) => [...prev, userMessage])
    if (overrideInput === undefined) setInput("")

    if (qaMode === "image") {
      setImageError(null)
      setImageGenerating(true)
      try {
        const referenceImages: string[] = []
        for (const f of imageRefFiles.slice(0, 5)) {
          try {
            referenceImages.push(await fileToDataUrl(f))
          } catch {
            // skip invalid file
          }
        }
        const res = await fetch("/api/image-generate", {
          method: "POST",
          headers: buildClientApiHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            prompt: text,
            referenceImages: referenceImages.length ? referenceImages : undefined,
            model: imageModel,
            aspect_ratio: imageAspectRatio,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          const msg = data?.message ?? data?.error ?? `HTTP ${res.status}`
          throw new Error(res.status === 429 ? "请求过于频繁，请稍后再试" : msg)
        }
        const raw = Array.isArray(data?.images) ? data.images : []
        const urls = raw.map((x: string | { url?: string }) => (typeof x === "string" ? x : x?.url)).filter((u: string) => typeof u === "string" && (u.startsWith("data:") || u.startsWith("https://")))
        const noImageHint = (data?.message as string) || "未返回图片，请重试或更换模型；若报错请检查 OPENROUTER_API_KEY 是否已配置。"
        const aiMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: urls.length > 0 ? `已生成 ${urls.length} 张图片。` : noImageHint,
          timestamp: new Date(),
          reportId,
          images: urls.length > 0 ? urls : undefined,
        }
        setMessages((prev) => [...prev, aiMessage])
        setImageRefFiles([])
      } catch (err) {
        const msg = formatClientErrorMessage(err, "图片生成失败")
        setImageError(msg)
        const errMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `图片生成失败：${msg}`,
          timestamp: new Date(),
          reportId,
        }
        setMessages((prev) => [...prev, errMessage])
      } finally {
        setImageGenerating(false)
      }
      return
    }

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
    const aiMessageId = crypto.randomUUID()
    const aiMessage: ChatMessage = {
      id: aiMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      reportId,
      sources: [],
    }
    setMessages((prev) => [...prev, aiMessage])

    const abortCtrl = new AbortController()
    streamAbortRef.current = abortCtrl

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: buildClientApiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ messages: apiMessages, reportId, model: chatModel }),
        signal: abortCtrl.signal,
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

          let parsed: { error?: string; content?: string } | null = null
          try {
            parsed = JSON.parse(data)
          } catch {
            // JSON 解析失败（不完整的 chunk），忽略
            continue
          }
          if (parsed?.error) {
            streamDone = true
            fullContent += `\n\n**错误：** ${String(parsed.error)}`
            setMessages((prev) =>
              prev.map((m) => m.id === aiMessageId ? { ...m, content: fullContent } : m)
            )
            return
          }
          if (parsed?.content) {
            fullContent += parsed.content
            setMessages((prev) =>
              prev.map((m) => m.id === aiMessageId ? { ...m, content: fullContent } : m)
            )
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

      if (messages.length <= 1 && activeSessionId) {
        const newTitle = text.slice(0, 15) + (text.length > 15 ? "..." : "")
        setSessions(prev => prev.map(s =>
          s.id === activeSessionId ? { ...s, title: newTitle } : s
        ))
        fetch("/api/chat-storage/sessions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId, sessionId: activeSessionId, title: newTitle }),
        }).catch(() => {})
      }
    } catch (error) {
      if (abortCtrl.signal.aborted) {
        setMessages((prev) =>
          prev.map((m) => m.id === aiMessageId ? { ...m, content: m.content || "（已取消）" } : m)
        )
      } else {
        console.error("Chat error:", error)
        const message = formatClientErrorMessage(error, "未知错误")
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId
              ? { ...m, content: `抱歉，回答时出现错误: ${message}。请检查 API 配置后重试。` }
              : m
          )
        )
      }
    } finally {
      streamAbortRef.current = null
      setIsStreaming(false)
    }
  }

  const handleStopStream = useCallback(() => {
    streamAbortRef.current?.abort()
  }, [])

  const remarkPluginsMemo = useMemo(() => [remarkGfm], [])
  const chatMarkdownComponents = useMemo(() => ({
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
    p: ({ children }: { children?: React.ReactNode }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
    ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc ml-5 mb-3 space-y-1">{children}</ul>,
    ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal ml-5 mb-3 space-y-1">{children}</ol>,
    table: ({ children }: { children?: React.ReactNode }) => (
      <div className="overflow-x-auto my-4 border border-slate-200 rounded-lg">
        <table className="min-w-full divide-y divide-slate-200">{children}</table>
      </div>
    ),
    th: ({ children }: { children?: React.ReactNode }) => <th className="px-4 py-2 bg-slate-50 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{children}</th>,
    td: ({ children }: { children?: React.ReactNode }) => <td className="px-4 py-2 border-t border-slate-100 text-sm text-slate-700">{children}</td>,
  }), [])

  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const copyMessage = async (content: string, messageId?: string) => {
    try {
      await navigator.clipboard.writeText(content)
      if (messageId) {
        setCopiedMessageId(messageId)
        setTimeout(() => setCopiedMessageId(null), 2000)
      }
    } catch { /* clipboard unavailable */ }
  }

  const clearHistory = async () => {
    if (!activeSessionId) return
    initWelcomeMessage()
    try {
      await fetch("/api/chat-storage/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, sessionId: activeSessionId, messages: [] }),
      })
    } catch { /* ignore */ }
  }

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 64px)" }}>
          <div className="text-center space-y-4">
            <i className="fas fa-lock text-4xl text-muted-foreground/50" />
            <p className="text-lg text-muted-foreground">请先登录以使用智能问答功能</p>
            <button
              onClick={() => router.push("/login")}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <i className="fas fa-sign-in-alt" />
              前往登录
            </button>
          </div>
        </div>
      </div>
    )
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
                      "group/session px-3 py-3 rounded-xl cursor-pointer transition-all border mb-1 relative",
                      activeSessionId === session.id
                        ? "bg-white border-slate-200/60 shadow-sm"
                        : "bg-transparent border-transparent hover:bg-white/40"
                    )}
                  >
                    <div className={cn(
                      "font-medium text-sm truncate mb-1 pr-6",
                      activeSessionId === session.id ? "text-primary font-semibold" : "text-slate-700"
                    )}>
                      {session.title}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <i className="far fa-clock text-[9px] opacity-70" />
                      {formatSessionDate(session.updatedAt)}
                    </div>
                    {sessions.length > 1 && (
                      <button
                        onClick={(e) => deleteSession(e, session.id)}
                        className="absolute top-2.5 right-2 w-6 h-6 rounded-md flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/session:opacity-100 transition-all"
                        title="删除此对话"
                      >
                        <i className="fas fa-xmark text-xs" />
                      </button>
                    )}
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
                          "group/session px-3 py-3 rounded-xl cursor-pointer transition-all border mb-1 relative",
                          activeSessionId === session.id
                            ? "bg-white border-slate-200/60 shadow-sm"
                            : "bg-transparent border-transparent hover:bg-white/40"
                        )}
                      >
                        <div className={cn(
                          "font-medium text-sm truncate mb-1 pr-6",
                          activeSessionId === session.id ? "text-primary font-semibold" : "text-slate-700"
                        )}>
                          {session.title}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <i className="far fa-clock text-[9px] opacity-70" />
                          {formatSessionDate(session.updatedAt)}
                        </div>
                        {sessions.length > 1 && (
                          <button
                            onClick={(e) => { deleteSession(e, session.id); setShowHistory(false) }}
                            className="absolute top-2.5 right-2 w-6 h-6 rounded-md flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/session:opacity-100 transition-all"
                            title="删除此对话"
                          >
                            <i className="fas fa-xmark text-xs" />
                          </button>
                        )}
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
                <h2 className="text-sm sm:text-base font-bold text-slate-800 truncate">{reportContext?.title ?? "报告"}</h2>
                <p className="text-xs text-slate-500">
                  {sourceDataSummary.loaded
                    ? sourceDataSummary.count > 0
                      ? <span className="text-emerald-600"><i className="fas fa-database mr-1 text-[10px]" />报告正文 + {sourceDataSummary.count} 份背景资料（{sourceDataSummary.types.join("、")}）</span>
                      : <span className="text-amber-600"><i className="fas fa-file-alt mr-1 text-[10px]" />仅报告正文（无爬取资料）</span>
                    : "加载中…"
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5" ref={modelDropdownRef}>
              <button
                onClick={() => { if (window.confirm("确定要清空当前对话吗？")) clearHistory() }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                title="清空当前对话"
                disabled={isStreaming || messages.length <= 1}
              >
                <i className="fas fa-eraser text-[10px]" />
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowModelDropdown((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 transition-colors"
                  title={qaMode === "llm" ? `当前模型：${LLM_MODEL_OPTIONS.find((o) => o.value === chatModel)?.label ?? chatModel}` : `图片模型：${IMAGE_MODEL_OPTIONS.find((o) => o.value === imageModel)?.label ?? imageModel}`}
                  aria-label="切换模型"
                >
                  <i className={cn("fas text-[10px]", qaMode === "llm" ? "fa-robot" : "fa-image")} aria-hidden />
                  <span>模型</span>
                  <i className={cn("fas fa-chevron-down text-[9px] transition-transform", showModelDropdown && "rotate-180")} aria-hidden />
                </button>
                {showModelDropdown && (
                  <div className="absolute right-0 top-full mt-1.5 w-[min(calc(100vw-2rem),380px)] rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
                    <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50/80">
                      <p className="text-xs font-medium text-slate-500">
                        {qaMode === "llm" ? "智能问答使用的大模型" : "图片生成使用的模型"}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 whitespace-normal break-words">
                        当前：{qaMode === "llm"
                          ? (LLM_MODEL_OPTIONS.find((o) => o.value === chatModel)?.label ?? chatModel)
                          : (IMAGE_MODEL_OPTIONS.find((o) => o.value === imageModel)?.label ?? imageModel)}
                      </p>
                    </div>
                    <div className="py-1.5 max-h-[320px] overflow-y-auto">
                      {qaMode === "llm"
                        ? LLM_MODEL_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => applyChatModel(opt.value)}
                            className={cn(
                              "relative w-full text-left px-3 py-2.5 pr-8 text-sm transition-colors whitespace-normal break-words",
                              opt.value === chatModel ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"
                            )}
                            title={opt.label}
                          >
                            <span className="block">{opt.label}</span>
                            {opt.value === chatModel && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600" aria-hidden><i className="fas fa-check text-xs" /></span>
                            )}
                          </button>
                        ))
                        : IMAGE_MODEL_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setImageModel(opt.value)
                              setShowModelDropdown(false)
                              try {
                                const raw = localStorage.getItem("app_settings")
                                const prev = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
                                const image = (prev.image as Record<string, unknown>) ?? {}
                                localStorage.setItem("app_settings", JSON.stringify({ ...prev, image: { ...image, model: opt.value } }))
                              } catch { /* ignore */ }
                            }}
                            className={cn(
                              "relative w-full text-left px-3 py-2.5 pr-8 text-sm transition-colors whitespace-normal break-words",
                              opt.value === imageModel ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"
                            )}
                            title={opt.label}
                          >
                            <span className="block">{opt.label}</span>
                            {opt.value === imageModel && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600" aria-hidden><i className="fas fa-check text-xs" /></span>
                            )}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
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

                  {/* AI 回复 - 左对齐（含图片生成结果） */}
                  {message.role === "assistant" && (message.content || (message.images && message.images.length > 0) || (!isStreaming && idx !== messages.length - 1)) && (
                    <div className="flex items-start gap-2 sm:gap-4">
                      <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                        <div className="bg-gradient-to-br from-indigo-500 to-violet-500 text-transparent bg-clip-text">
                          <i className="fas fa-robot text-base sm:text-lg" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* 图片生成结果 */}
                        {message.images && message.images.length > 0 && (
                          <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {message.images.map((url, i) => (
                              <div key={i} className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                                <img src={url} alt={`生成图 ${i + 1}`} className="w-full h-auto object-contain max-h-[320px]" />
                                <div className="p-2 flex justify-end">
                                  <a href={url} download={`amazon-image-${i + 1}.png`} className="text-xs font-medium text-blue-600 hover:underline">下载</a>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="bg-white px-3 sm:px-6 py-3 sm:py-5 rounded-2xl rounded-tl-none shadow-sm border border-slate-100/60 text-slate-800 text-sm sm:text-[15px] leading-6 sm:leading-7 group hover:shadow-md transition-shadow">
                          {message.content ? (
                            <>
                              <ReactMarkdown remarkPlugins={remarkPluginsMemo} components={chatMarkdownComponents}>
                                {message.content}
                              </ReactMarkdown>
                              {/* 流式光标 */}
                              {isStreaming && messages[messages.length - 1]?.id === message.id && (
                                <span className="inline-block w-1.5 h-4 bg-indigo-500 ml-1 animate-pulse align-middle" />
                              )}

                              {/* 来源引用标签：按类型分色（报告=蓝，抓取资料=绿） */}
                              {message.sources && message.sources.length > 0 && !isStreaming && (
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                  <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">参考来源</div>
                                  <div className="flex flex-wrap gap-2">
                                    {message.sources.map((source, idx) => {
                                      const isSourceData = source.startsWith("抓取资料")
                                      const icon = isSourceData ? "fas fa-database" : "fas fa-file-alt"
                                      const colorCls = isSourceData
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300"
                                        : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300"
                                      return (
                                        <span
                                          key={idx}
                                          className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border cursor-default transition-all", colorCls)}
                                          title={isSourceData ? "引用自报告生成时爬取的原始资料" : "引用自报告正文"}
                                        >
                                          <i className={cn(icon, "text-[10px] opacity-70")} />
                                          {source}
                                        </span>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                            </>
                          ) : null}
                        </div>

                        {/* 操作栏 */}
                        {!isStreaming && (message.content || (message.images && message.images.length > 0)) && (
                          <div className="flex items-center gap-4 mt-2 ml-2">
                            <span className="text-[11px] text-slate-400 font-medium">
                              {message.timestamp.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <div className="flex items-center gap-1">
                              <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors" title={copiedMessageId === message.id ? "已复制" : "复制"} aria-label="复制内容" onClick={() => copyMessage(message.content, message.id)}>
                                <i className={cn("text-xs", copiedMessageId === message.id ? "fas fa-check text-green-500" : "far fa-copy")} aria-hidden />
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
              {/* 对话模式：快捷问题 + 预置「获取 5 条图片提示词」 */}
              {qaMode === "llm" && (
                <>
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
                      <button
                        type="button"
                        onClick={() => void handleSend(PRESET_IMAGE_PROMPTS)}
                        disabled={isStreaming}
                        className="inline-flex items-start gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:border-violet-200 hover:text-violet-600 hover:shadow-sm transition-all justify-start"
                      >
                        <i className="fas fa-image text-violet-500 mt-0.5 flex-shrink-0" />
                        <span className="text-left">总结报告中的图片建议 → 生成 5 条图片提示词</span>
                      </button>
                    </div>
                  )}
                </>
              )}

              {imageError && qaMode === "image" && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{imageError}</div>
              )}

              {/* 输入框容器：内嵌左下角模式切换（智能问答 | 生成图片） */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 to-purple-100/50 rounded-xl sm:rounded-2xl blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10" />
                <div className="relative flex flex-col bg-white group-focus-within:bg-white rounded-xl sm:rounded-2xl border border-slate-200 group-focus-within:border-indigo-300 group-focus-within:ring-4 group-focus-within:ring-indigo-100/50 transition-all shadow-sm overflow-hidden">
                  {/* 图片模式：上方为图片上传区（主输入） */}
                  {qaMode === "image" && (
                    <div
                      className="border-b border-slate-100 bg-slate-50/50 px-3 py-2.5"
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("ring-2", "ring-blue-300", "bg-blue-50/50") }}
                      onDragLeave={(e) => { e.currentTarget.classList.remove("ring-2", "ring-blue-300", "bg-blue-50/50") }}
                      onDrop={(e) => {
                        e.preventDefault()
                        e.currentTarget.classList.remove("ring-2", "ring-blue-300", "bg-blue-50/50")
                        const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/")).slice(0, 5)
                        setImageRefFiles((prev) => [...prev, ...files].slice(0, 5))
                      }}
                    >
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files ? Array.from(e.target.files).slice(0, 5) : []
                          setImageRefFiles((prev) => [...prev, ...files].slice(0, 5))
                        }}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 bg-white border border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                        >
                          <i className="fas fa-plus-circle text-blue-500" />
                          添加图片
                          {imageRefFiles.length > 0 && <span className="text-slate-400">({imageRefFiles.length}/5)</span>}
                        </button>
                        <select
                          value={imageAspectRatio}
                          onChange={(e) => {
                            const v = e.target.value
                            setImageAspectRatio(v)
                            try {
                              const raw = localStorage.getItem("app_settings")
                              const prev = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
                              const image = (prev.image as Record<string, unknown>) ?? {}
                              localStorage.setItem("app_settings", JSON.stringify({ ...prev, image: { ...image, aspectRatio: v } }))
                            } catch { /* ignore */ }
                          }}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white"
                        >
                          <option value="1:1">1:1</option>
                          <option value="4:3">4:3</option>
                          <option value="3:4">3:4</option>
                          <option value="16:9">16:9</option>
                          <option value="9:16">9:16</option>
                        </select>
                        {imageRefFiles.length > 0 && (
                          <button type="button" onClick={() => setImageRefFiles([])} className="text-xs text-slate-500 hover:text-red-600">清空</button>
                        )}
                      </div>
                      {imagePreviewUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {imagePreviewUrls.map((url, i) => (
                            <div key={i} className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 relative group/thumb">
                              <img src={url} alt="" className="w-full h-full object-cover" />
                              <button type="button" onClick={() => setImageRefFiles((prev) => prev.filter((_, j) => j !== i))} className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white text-xs" aria-label="移除">×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="relative flex items-end gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleSend()
                        }
                      }}
                      placeholder={qaMode === "image" ? "可输入图片描述或提示词（可选，仅上传参考图也可生成）" : "问点什么..."}
                      className="flex-1 bg-transparent text-sm sm:text-[15px] text-slate-900 placeholder:text-slate-400 outline-none resize-none max-h-48 min-h-[36px] sm:min-h-[44px] py-1 sm:py-2"
                      disabled={isStreaming || (qaMode === "image" && imageGenerating)}
                      rows={1}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement
                        target.style.height = "auto"
                        target.style.height = `${Math.min(target.scrollHeight, 192)}px`
                      }}
                    />

                    <div className="flex items-center gap-0.5 sm:gap-1 pb-1 sm:pb-1.5 flex-shrink-0">
                      {isStreaming ? (
                        <button
                          onClick={handleStopStream}
                          className="w-7 sm:w-9 h-7 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-all shadow-sm ml-0 sm:ml-1 bg-red-500 text-white hover:bg-red-600 active:scale-95 transform"
                          title="停止生成"
                        >
                          <i className="fas fa-stop text-xs sm:text-sm" />
                        </button>
                      ) : (
                        <button
                          onClick={() => void handleSend()}
                          disabled={(qaMode === "llm" && !input.trim()) || (qaMode === "image" && !(input.trim() || imageRefFiles.length > 0) || imageGenerating)}
                          className={cn(
                            "w-7 sm:w-9 h-7 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-all shadow-sm ml-0 sm:ml-1",
                            (qaMode === "llm" ? input.trim() : (input.trim() || imageRefFiles.length > 0)) && !imageGenerating
                              ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-500/20 active:scale-95 transform"
                              : "bg-slate-100 text-slate-400 cursor-not-allowed"
                          )}
                          title={qaMode === "image" ? "生成图片" : "发送"}
                        >
                          {qaMode === "image" && imageGenerating ? (
                            <i className="fas fa-spinner fa-spin text-xs" />
                          ) : (
                            <i className={cn("fas text-xs sm:text-sm font-bold", qaMode === "image" ? "fa-wand-magic-sparkles" : "fa-arrow-up")} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 左下角：智能问答 | 生成图片 切换（类似 Gemini） */}
                  <div className="flex items-center justify-between px-3 pb-2 pt-0">
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-slate-50/80">
                      <button
                        type="button"
                        onClick={() => { setQaMode("llm"); setImageError(null) }}
                        className={cn(
                          "px-2.5 py-1.5 text-xs font-medium transition-colors",
                          qaMode === "llm" ? "bg-white text-blue-600 shadow-sm border border-slate-200 rounded-lg" : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        <i className="fas fa-comments mr-1 text-[10px]" />
                        智能问答
                      </button>
                      <button
                        type="button"
                        onClick={() => { setQaMode("image"); setImageError(null) }}
                        className={cn(
                          "px-2.5 py-1.5 text-xs font-medium transition-colors",
                          qaMode === "image" ? "bg-white text-blue-600 shadow-sm border border-slate-200 rounded-lg" : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        <i className="fas fa-image mr-1 text-[10px]" />
                        生成图片
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      内容由 AI 生成，请仔细甄别
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* ═══════ 右侧栏 - 报告上下文 ═══════ */}
        {
          showContext ? (
            <aside className="hidden lg:flex w-72 flex-shrink-0 border-l border-border/60 flex-col bg-muted/20 overflow-y-auto">
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
                  <div className="text-sm font-semibold text-foreground">{reportContext?.title ?? "报告"}</div>
                </div>

                {/* 报告章节 */}
                <div>
                  <div className="text-xs font-semibold text-foreground mb-2 px-1">
                    报告章节 ({(reportContext?.chapters ?? []).filter(c => c?.level === 2).length} 章)
                  </div>
                  <div className="space-y-0.5">
                    {(reportContext?.chapters ?? [])
                      .filter(c => c?.level === 2)
                      .map((chapter, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm text-foreground"
                        >
                          <span className="text-[13px] truncate">{chapter?.title ?? ""}</span>
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
                        AI 会基于报告正文及背后的爬取资料回答问题，每段回答会标注引用来源——<span className="text-blue-600 font-medium">蓝色</span>表示来自报告正文，<span className="text-emerald-600 font-medium">绿色</span>表示来自爬取的原始资料（评论、网页、YouTube 等）。
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
