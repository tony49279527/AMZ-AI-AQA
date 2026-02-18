import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { enforceApiGuard } from "@/lib/server/api-guard"
import { apiError, withApiAudit } from "@/lib/server/api-response"
import { getReportFilePath, getReportMetaFilePath, parseReportIdFromFilename } from "@/lib/server/report-storage"
import { ReportMetadata } from "@/lib/report-metadata"

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

                const metaPath = getReportMetaFilePath(id)
                const mdPath = getReportFilePath(id)
                const stat = fs.statSync(mdPath)

                let meta: ReportMetadata | null = null

                // 尝试读取现有的元数据
                if (fs.existsSync(metaPath)) {
                    try {
                        meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"))
                    } catch (e) {
                        console.error(`Failed to parse meta for ${id}:`, e)
                    }
                }

                // 如果没有元数据，走极简版提取（只读第一行），不读取整个大文件
                if (!meta) {
                    const fd = fs.openSync(mdPath, 'r')
                    const buffer = Buffer.alloc(512)
                    fs.readSync(fd, buffer, 0, 512, 0)
                    fs.closeSync(fd)
                    const preview = buffer.toString('utf-8')
                    const titleMatch = preview.match(/^#\s+(.+)$/m)
                    const title = titleMatch ? titleMatch[1].replace(/\*+/g, "").trim() : id

                    return {
                        id,
                        title,
                        status: "completed" as const,
                        progress: 100,
                        createdAt: stat.birthtime.toISOString(),
                        updatedAt: stat.mtime.toISOString(),
                        chapters: [],
                        summary: "暂无摘要",
                        fileSize: stat.size,
                        archivedStatus: "active" as const,
                        source: "uploaded" as const,
                    }
                }

                // 使用元数据返回，极快（含存档状态、来源）；featured 与 uploaded 均视为精选报告
                const source = (meta.source === "uploaded" || meta.source === "featured") ? "uploaded" : "system"
                return {
                    id,
                    title: meta.title,
                    status: "completed" as const,
                    progress: 100,
                    createdAt: meta.createdAt,
                    updatedAt: meta.updatedAt,
                    chapters: [],
                    summary: `${meta.marketplace} | ${meta.language} | ${meta.model}`,
                    fileSize: stat.size,
                    archivedStatus: (meta.status === "archived" ? "archived" : "active") as const,
                    archivedAt: meta.archivedAt,
                    source,
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
