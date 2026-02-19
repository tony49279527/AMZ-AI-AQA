"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { ChatMessage } from "@/lib/types"

interface ExportButtonProps {
    messages: ChatMessage[]
    reportTitle: string
}

export function ExportButton({ messages, reportTitle }: ExportButtonProps) {
    const handleExport = () => {
        const now = new Date()
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
        const header = `# AI 问答记录: ${reportTitle}\n报告日期: ${dateStr}\n\n---\n\n`
        const body = messages
            .filter((m) => m.role !== "system")
            .map((m) => {
                const role = m.role === "user" ? "用户" : "AI 助手"
                const ts = m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp)
                const timeStr = Number.isNaN(ts.getTime()) ? "" : ts.toLocaleTimeString("zh-CN")
                return `### ${role}${timeStr ? ` (${timeStr})` : ""}\n\n${m.content}\n\n`
            })
            .join("---\n\n")

        const fullContent = header + body
        const blob = new Blob([fullContent], { type: "text/markdown" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        const safeTitle = reportTitle.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, "_").slice(0, 50)
        a.download = `Chat_${safeTitle}_${dateStr}.md`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-8 gap-1.5 text-xs font-medium border-slate-200 hover:bg-slate-50 text-slate-600"
        >
            <i className="fas fa-download text-[10px]" />
            导出对话
        </Button>
    )
}
