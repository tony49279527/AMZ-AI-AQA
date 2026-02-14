import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { enforceApiGuard } from "@/lib/server/api-guard"
import { apiError, withApiAudit } from "@/lib/server/api-response"
import { parseReportIdFromFilename } from "@/lib/server/report-storage"

// 扫描 content/reports/ 目录，提取报告元数据
export async function GET(request: NextRequest) {
    return withApiAudit(request, "reports:list", async ({ requestId }) => {
        const guardError = enforceApiGuard(request, { route: "reports:list", maxRequests: 120, windowMs: 60_000, requestId })
        if (guardError) return guardError

        try {
            const reportsDir = path.join(process.cwd(), "content", "reports")

            if (!fs.existsSync(reportsDir)) {
                return NextResponse.json({ reports: [] })
            }

            const files = fs.readdirSync(reportsDir).filter((f) => f.endsWith(".md"))

            const reports = files.flatMap((file) => {
                const id = parseReportIdFromFilename(file)
                if (!id) return []

                const content = fs.readFileSync(path.join(reportsDir, file), "utf-8")
                const stat = fs.statSync(path.join(reportsDir, file))

                const titleMatch = content.match(/^#\s+(.+)$/m)
                const rawTitle = titleMatch ? titleMatch[1].replace(/\*+/g, "").trim() : file

                const chapters = content
                    .split("\n")
                    .filter((line) => line.startsWith("## "))
                    .map((line, idx) => ({
                        id: `ch-${idx + 1}`,
                        title: line.replace("## ", "").trim(),
                    }))

                const lines = content.split("\n")
                let summary = ""
                for (const line of lines) {
                    const trimmed = line.trim()
                    if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("---") && !trimmed.startsWith("*")) {
                        summary = trimmed.slice(0, 120)
                        break
                    }
                }

                return {
                    id,
                    title: rawTitle,
                    status: "completed" as const,
                    progress: 100,
                    createdAt: stat.birthtime.toISOString(),
                    updatedAt: stat.mtime.toISOString(),
                    chapters,
                    summary,
                    fileSize: stat.size,
                }
            })

            reports.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

            return NextResponse.json({ reports })
        } catch (error) {
            console.error("Error listing reports:", error)
            return apiError("Failed to list reports", { status: 500, code: "REPORTS_LIST_FAILED", requestId })
        }
    })
}
